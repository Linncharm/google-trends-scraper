import { TrendsScheduler } from './src/scheduler.js';
import { COUNTRIES } from './src/config/countries.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// =======================================================
/**
 * 预设场景配置
 */

// 场景一：高频监控 - 每6小时执行一次，适合密切关注趋势
const highFrequencyScenario = {
  cronExpression: '0 */6 * * *', // 每6小时
  scraperConfig: {
    countries: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  emailConfig: {
    enabled: true,
    to: process.env.EMAIL_TO || '',
  },
  timezone: 'Asia/Shanghai',
};

// 场景二：标准监控 - 每天上午9点执行，适合日常使用
const standardScenario = {
  cronExpression: '0 12 * * *', // 每天上午9点
  scraperConfig: {
    countries: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  emailConfig: {
    enabled: true,
    to: process.env.EMAIL_TO || '',
  },
  timezone: 'Asia/Shanghai',
};

// 场景三：G7国家监控 - 每天上午8点执行
const g7Scenario = {
  cronExpression: '0 8 * * *', // 每天上午8点
  scraperConfig: {
    countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'IT'],
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  emailConfig: {
    enabled: true,
    to: process.env.EMAIL_TO || '',
  },
  timezone: 'Asia/Shanghai',
};

// 场景四：工作日监控 - 工作日上午9点执行
const weekdayScenario = {
  cronExpression: '0 9 * * 1-5', // 工作日上午9点
  scraperConfig: {
    countries: ['US', 'CN', 'JP', 'DE', 'GB'],
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  emailConfig: {
    enabled: true,
    to: process.env.EMAIL_TO || '',
  },
  timezone: 'Asia/Shanghai',
};

// 场景五：测试场景 - 每2分钟执行一次（仅用于测试）
const testScenario = {
  cronExpression: '*/2 * * * *', 
  scraperConfig: {
    countries: ['BR'], // 只爬取巴西，减少测试时间
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  emailConfig: {
    enabled: true,
    to: process.env.EMAIL_TO || '',
  },
  timezone: 'Asia/Shanghai',
};

// =======================================================

/**
 * 选择要运行的场景
 * 可选值：highFrequencyScenario, standardScenario, g7Scenario, weekdayScenario, testScenario
 */
const scenarioToRun = standardScenario

// =======================================================

/**
 * 启动前验证
 */
function validateConfig() {
  // 验证国家代码
  const invalidCountries = scenarioToRun.scraperConfig.countries.filter(c => !COUNTRIES[c]);
  if (invalidCountries.length > 0) {
    console.error(`❌ 错误：无效的国家代码 -> ${invalidCountries.join(', ')}`);
    process.exit(1);
  }

  // 验证邮件配置
  if (scenarioToRun.emailConfig.enabled) {
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'EMAIL_TO'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`❌ 错误：缺少必要的环境变量 -> ${missingVars.join(', ')}`);
      console.error('请检查 .env 文件配置');
      process.exit(1);
    }
  }

  console.log('✅ 配置验证通过');
}

/**
 * 显示配置信息
 */
function displayConfig() {
  console.log('\n🚀 Google Trends 定时任务启动器');
  console.log('==========================================');
  console.log(`📅 Cron表达式: ${scenarioToRun.cronExpression}`);
  console.log(`🌍 监控国家: ${scenarioToRun.scraperConfig.countries.join(', ')}`);
  console.log(`📊 输出格式: ${scenarioToRun.scraperConfig.format.toUpperCase()}`);
  console.log(`⏰ 时间范围: ${scenarioToRun.scraperConfig.timeframe}小时`);
  console.log(`🕒 时区: ${scenarioToRun.timezone}`);
  console.log(`📧 邮件发送: ${scenarioToRun.emailConfig.enabled ? '启用' : '禁用'}`);
  
  if (scenarioToRun.emailConfig.enabled) {
    console.log(`📮 收件人: ${scenarioToRun.emailConfig.to}`);
  }
  
  console.log('==========================================');

  // 根据 Cron 表达式给出下次执行时间的提示
  const cronExplain = getCronExplanation(scenarioToRun.cronExpression);
  console.log(`⏱️  执行频率: ${cronExplain}`);
  
  console.log('\n🎯 按 Ctrl+C 停止定时任务');
  console.log('📝 日志位置: logs/combined.log');
  console.log('==========================================\n');
}

/**
 * 解释 Cron 表达式
 */
function getCronExplanation(cronExpression: string): string {
  const explanations: Record<string, string> = {
    '0 9 * * *': '每天上午9点',
    '0 */6 * * *': '每6小时',
    '0 8 * * *': '每天上午8点',
    '0 9 * * 1-5': '工作日上午9点',
    '*/2 * * * *': '每2分钟 (测试模式)',
    '0 */12 * * *': '每12小时',
    '0 9 * * 1': '每周一上午9点',
  };
  
  return explanations[cronExpression] || '自定义时间';
}

/**
 * 主启动函数
 */
async function launchScheduler() {
  try {
    // 启动前验证
    validateConfig();
    
    // 显示配置信息
    displayConfig();
    
    // 创建并启动调度器
    const scheduler = new TrendsScheduler(scenarioToRun);
    
    console.log('🔄 正在启动定时任务调度器...\n');
    
    // 启动调度器（会自动挂在后台运行）
    await scheduler.start();
    
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 处理优雅退出
process.on('SIGINT', () => {
  console.log('\n⏹️  接收到退出信号，正在停止定时任务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  接收到终止信号，正在停止定时任务...');
  process.exit(0);
});

// 启动调度器
launchScheduler();
