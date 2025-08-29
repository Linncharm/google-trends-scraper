import { createEmailServiceFromEnv } from './src/service/emailService.js';
import { main } from './src/scraper.js';
import { COUNTRIES } from './src/config/countries.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 加载环境变量
dotenv.config();

enum TestMode {
  Immediate = 'immediate',
  Delayed = 'delayed',
}

// =======================================================
/**
 * 邮件测试配置
 */

// 测试场景一：立即发送测试邮件（不执行爬虫，使用模拟数据）
const immediateTestConfig = {
  mode: TestMode.Immediate,
  useMockData: true,
  testDescription: '立即发送测试邮件（模拟数据）',
};

// 测试场景二：2分钟后执行爬虫并发送邮件
const delayedTestConfig = {
  mode: TestMode.Delayed,
  delayMinutes: 0.5,
  scraperConfig: {
    countries: ['US'], // 只爬取美国，减少测试时间
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  testDescription: '2分钟后执行爬虫并发送真实数据',
};

// 测试场景三：自定义延迟时间
const customDelayConfig = {
  mode: TestMode.Delayed,
  delayMinutes: 1, // 可以修改这里的分钟数
  scraperConfig: {
    countries: ['US', 'JP'], // 可以添加更多国家
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  },
  testDescription: '自定义延迟时间测试',
};

// =======================================================

/**
 * 选择要运行的测试场景
 */
const testScenario:any = immediateTestConfig; // 默认使用2分钟延迟测试

// =======================================================

/**
 * 创建模拟数据文件
 */
function createMockDataFile(): string {
  const mockData = `标题,搜索量,时间,地区,相关搜索,SaaS潜力评分
ChatGPT alternative,10000+,2小时前,美国,"AI tools, OpenAI competitors",85
Free resume builder,5000+,1小时前,美国,"CV maker, job application",92
Background remover online,8000+,3小时前,美国,"image editor, photo tools",88
Project management tool,3000+,4小时前,美国,"task manager, team collaboration",79
Grammar checker free,2000+,5小时前,美国,"writing assistant, proofreading",82`;

  const fileName = `test-trends-${Date.now()}.csv`;
  const filePath = path.join(process.cwd(), 'data', fileName);
  
  // 确保 data 目录存在
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  
  fs.writeFileSync(filePath, mockData, 'utf-8');
  console.log(`📄 创建模拟数据文件: ${filePath}`);
  
  return filePath;
}

/**
 * 验证邮件配置
 */
function validateEmailConfig(): boolean {
  const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'EMAIL_TO'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ 错误：缺少必要的环境变量 -> ${missingVars.join(', ')}`);
    console.error('请检查 .env 文件配置');
    return false;
  }
  
  if (!process.env.EMAIL_TO) {
    console.error('❌ 错误：未配置收件人邮箱 (EMAIL_TO)');
    return false;
  }
  
  return true;
}

/**
 * 立即发送测试邮件
 */
async function sendImmediateTest(): Promise<void> {
  console.log('🧪 执行立即测试模式');
  
  const emailService = createEmailServiceFromEnv();
  if (!emailService) {
    console.error('❌ 无法创建邮件服务');
    return;
  }
  
  // 验证邮件连接
  console.log('🔗 验证邮件服务连接...');
  const isValid = await emailService.verifyConnection();
  if (!isValid) {
    console.error('❌ 邮件服务连接失败');
    return;
  }
  
  console.log('✅ 邮件服务连接成功');
  
  // 创建模拟数据
  const mockFilePath = createMockDataFile();
  
  // 发送测试邮件
  console.log('📧 正在发送测试邮件...');
  
  const mockSummary = {
    totalTrends: 5,
    highPotentialCount: 3,
    countries: ['美国'],
    timeframe: '24小时 (测试数据)',
  };
  
  const success = await emailService.sendTrendsReport(
    process.env.EMAIL_TO!,
    mockFilePath,
    mockSummary
  );
  
  if (success) {
    console.log('✅ 测试邮件发送成功！');
    console.log(`📮 已发送到: ${process.env.EMAIL_TO}`);
  } else {
    console.error('❌ 测试邮件发送失败');
  }
  
  // 清理模拟文件
  setTimeout(() => {
    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
      console.log('🧹 已清理模拟数据文件');
    }
  }, 5000);
}

/**
 * 延迟执行爬虫并发送邮件
 */
async function sendDelayedTest(delayMinutes: number, scraperConfig: any): Promise<void> {
  console.log(`⏰ 延迟测试模式：${delayMinutes}分钟后执行`);
  
  // 验证爬虫配置
  const invalidCountries = scraperConfig.countries.filter((c: string) => !COUNTRIES[c]);
  if (invalidCountries.length > 0) {
    console.error(`❌ 错误：无效的国家代码 -> ${invalidCountries.join(', ')}`);
    return;
  }
  
  const emailService = createEmailServiceFromEnv();
  if (!emailService) {
    console.error('❌ 无法创建邮件服务');
    return;
  }
  
  // 验证邮件连接
  console.log('🔗 验证邮件服务连接...');
  const isValid = await emailService.verifyConnection();
  if (!isValid) {
    console.error('❌ 邮件服务连接失败');
    return;
  }
  
  console.log('✅ 邮件服务连接成功');
  
  // 显示倒计时
  console.log('\n⏳ 开始倒计时...');
  const totalSeconds = delayMinutes * 60;
  
  for (let remaining = totalSeconds; remaining > 0; remaining--) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    process.stdout.write(`\r⏰ 还有 ${minutes}:${seconds.toString().padStart(2, '0')} 开始执行爬虫`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n🚀 开始执行爬虫任务...');
  
  try {
    // 执行爬虫
    const result = await main(scraperConfig);
    
    if (!result.success) {
      console.error('❌ 爬虫任务执行失败:', result.error);
      return;
    }
    
    console.log('✅ 爬虫任务执行成功');
    console.log(`📄 数据文件: ${result.outputFile}`);
    
    // 发送邮件
    if (result.outputFile) {
      console.log('📧 正在发送邮件...');
      
      const success = await emailService.sendTrendsReport(
        process.env.EMAIL_TO!,
        result.outputFile,
        result.summary || {
          totalTrends: 0,
          highPotentialCount: 0,
          countries: scraperConfig.countries,
          timeframe: scraperConfig.timeframe + '小时',
        }
      );
      
      if (success) {
        console.log('✅ 邮件发送成功！');
        console.log(`📮 已发送到: ${process.env.EMAIL_TO}`);
      } else {
        console.error('❌ 邮件发送失败');
      }
    }
    
  } catch (error) {
    console.error('❌ 执行过程中出错:', error);
  }
}

/**
 * 显示测试配置
 */
function displayTestConfig(): void {
  console.log('\n📧 Google Trends 邮件测试工具');
  console.log('==========================================');
  console.log(`🧪 测试模式: ${testScenario.testDescription}`);
  
  if (testScenario.mode === TestMode.Delayed) {
    console.log(`⏰ 延迟时间: ${testScenario.delayMinutes}分钟`);
    console.log(`🌍 爬取国家: ${testScenario.scraperConfig.countries.join(', ')}`);
    console.log(`📊 输出格式: ${testScenario.scraperConfig.format.toUpperCase()}`);
  }
  
  console.log(`📮 收件人: ${process.env.EMAIL_TO || '未配置'}`);
  console.log(`📤 发件人: ${process.env.EMAIL_FROM || '未配置'}`);
  console.log('==========================================\n');
}

/**
 * 主测试函数
 */
async function runEmailTest(): Promise<void> {
  try {
    // 显示配置
    displayTestConfig();
    
    // 验证邮件配置
    if (!validateEmailConfig()) {
      process.exit(1);
    }
    
    console.log('✅ 邮件配置验证通过');
    
    // 根据测试模式执行不同的测试
    if (testScenario.mode === TestMode.Immediate) {
      await sendImmediateTest();
    } else if (testScenario.mode === TestMode.Delayed) {
      await sendDelayedTest(testScenario.delayMinutes, testScenario.scraperConfig);
    }
    
    console.log('\n🎉 邮件测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 处理优雅退出
process.on('SIGINT', () => {
  console.log('\n⏹️  测试被中断');
  process.exit(0);
});

// 执行测试
runEmailTest();
