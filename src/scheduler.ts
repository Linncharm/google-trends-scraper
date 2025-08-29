import { CronJob } from 'cron';
import dotenv from 'dotenv';
import { main } from './scraper';
import { EmailService, createEmailServiceFromEnv } from './service/emailService';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 调度器配置接口
 */
interface SchedulerConfig {
  // Cron表达式，默认每天上午9点运行
  cronExpression: string;
  // 爬虫配置
  scraperConfig: {
    countries: string[];
    format: 'csv' | 'json';
    headless: boolean;
    timeframe: string;
  };
  // 邮件配置
  emailConfig: {
    enabled: boolean;
    to: string;
  };
  // 时区
  timezone: string;
}

/**
 * Google Trends 定时任务调度器
 */
export class TrendsScheduler {
  private config: SchedulerConfig;
  private emailService: EmailService | null = null;
  private job: CronJob | null = null;

  constructor(config: SchedulerConfig) {
    this.config = config;
    
    // 初始化邮件服务
    if (config.emailConfig.enabled) {
      this.emailService = createEmailServiceFromEnv();
      if (!this.emailService) {
        logger.warn('邮件服务初始化失败，将跳过邮件发送');
      }
    }
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    try {
      // 验证邮件服务
      if (this.emailService) {
        const isEmailValid = await this.emailService.verifyConnection();
        if (!isEmailValid) {
          logger.warn('邮件服务验证失败，将跳过邮件发送');
          this.emailService = null;
        }
      }

      // 创建定时任务
      this.job = new CronJob(
        this.config.cronExpression,        // cronTime
        () => this.runScrapingJob(),       // onTick
        null,                              // onComplete
        false,                             // start
        this.config.timezone               // timeZone
      );

      this.job.start();
      
      logger.info('🚀 Google Trends 定时任务调度器已启动', {
        cronExpression: this.config.cronExpression,
        timezone: this.config.timezone,
        nextRun: this.job.nextDate() ? this.job.nextDate().toString() : '未知',
        emailEnabled: !!this.emailService,
      });

      // 保持进程运行
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      logger.error('启动调度器失败', error);
      throw error;
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      logger.info('⏹️  定时任务调度器已停止');
    }
    process.exit(0);
  }

  /**
   * 执行爬虫任务
   */
  private async runScrapingJob(): Promise<void> {
    const startTime = Date.now();
    logger.info('🕐 开始执行定时爬虫任务');

    try {
      // 执行爬虫
      const result = await main(this.config.scraperConfig);
      
      if (!result.success) {
        logger.error('爬虫任务执行失败', result.error);
        return;
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.info('✅ 爬虫任务执行成功', {
        duration: `${duration}秒`,
        outputFile: result.outputFile,
        totalTrends: result.summary?.totalTrends,
      });

      // 发送邮件报告
      if (this.emailService && this.config.emailConfig.enabled && result.outputFile) {
        await this.sendEmailReport(result.outputFile, result.summary);
      }

    } catch (error) {
      logger.error('执行爬虫任务时出错', error);
    }
  }

  /**
   * 发送邮件报告
   */
  private async sendEmailReport(csvFilePath: string, summary: any): Promise<void> {
    try {
      if (!this.emailService) {
        logger.warn('邮件服务未初始化，跳过邮件发送');
        return;
      }

      const success = await this.emailService.sendTrendsReport(
        this.config.emailConfig.to,
        csvFilePath,
        summary || {
          totalTrends: 0,
          highPotentialCount: 0,
          countries: this.config.scraperConfig.countries,
          timeframe: this.config.scraperConfig.timeframe,
        }
      );

      if (success) {
        logger.info('📧 邮件报告发送成功', { to: this.config.emailConfig.to });
      } else {
        logger.error('📧 邮件报告发送失败');
      }
    } catch (error) {
      logger.error('发送邮件报告时出错', error);
    }
  }

  /**
   * 手动执行一次任务（用于测试）
   */
  async runOnce(): Promise<void> {
    logger.info('🧪 手动执行一次爬虫任务');
    await this.runScrapingJob();
  }
}

/**
 * 从环境变量创建默认配置
 */
function createDefaultConfig(): SchedulerConfig {
  return {
    // 默认每天上午9点执行 (0 9 * * *)
    cronExpression: process.env.CRON_EXPRESSION || '0 9 * * *',
    scraperConfig: {
      // 默认爬取十大高潜力国家
      countries: (process.env.SCRAPER_COUNTRIES || 'US,IN,ID,PK,NG,BR,MX,PH,VN,JP').split(','),
      format: (process.env.SCRAPER_FORMAT as 'csv' | 'json') || 'csv',
      headless: process.env.SCRAPER_HEADLESS !== 'false',
      timeframe: process.env.SCRAPER_TIMEFRAME || '24',
    },
    emailConfig: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      to: process.env.EMAIL_TO || '',
    },
    timezone: process.env.TIMEZONE || 'Asia/Shanghai',
  };
}

/**
 * 主函数 - 启动调度器
 */
async function startScheduler(): Promise<void> {
  try {
    const config = createDefaultConfig();
    
    // 验证配置
    if (config.emailConfig.enabled && !config.emailConfig.to) {
      logger.error('启用了邮件功能但未配置收件人邮箱 (EMAIL_TO)');
      process.exit(1);
    }

    logger.info('📋 调度器配置', {
      cronExpression: config.cronExpression,
      countries: config.scraperConfig.countries,
      emailEnabled: config.emailConfig.enabled,
      emailTo: config.emailConfig.to,
      timezone: config.timezone,
    });

    const scheduler = new TrendsScheduler(config);
    
    // 如果命令行参数包含 --run-once，则只执行一次
    if (process.argv.includes('--run-once')) {
      await scheduler.runOnce();
      process.exit(0);
    } else {
      await scheduler.start();
    }

  } catch (error) {
    logger.error('启动调度器失败', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动调度器
if (import.meta.url === `file://${process.argv[1]}`) {
  startScheduler();
}
