/**
 * Google Trends爬虫使用示例
 */

import { 
  GoogleTrendsScraper, 
  COUNTRIES, 
  DEFAULT_CONFIG, 
  ScraperConfig 
} from './src/index.js';
import { logger } from './src/utils/logger.js';
import { saveJsonToFile } from './src/utils/helpers.js';

async function basicExample(): Promise<void> {
  logger.info('=== 基础使用示例 ===');

  // 使用默认配置爬取美国趋势
  const scraper = new GoogleTrendsScraper(DEFAULT_CONFIG);
  
  try {
    const results = await scraper.scrapeAll();
    logger.info(`爬取完成，获取 ${results[0]?.trends?.length || 0} 条趋势数据`);
    
    // 显示前5条趋势
    if (results[0]?.trends) {
      results[0].trends.slice(0, 5).forEach((trend, index) => {
        logger.info(`${index + 1}. ${trend.title} (${trend.searchVolume})`);
      });
    }
  } catch (error) {
    logger.error('爬取失败', { error });
  }
}

async function customConfigExample(): Promise<void> {
  logger.info('=== 自定义配置示例 ===');

  // 自定义配置
  const customConfig: ScraperConfig = {
    countries: [COUNTRIES.US!, COUNTRIES.JP!], // 爬取美国和日本
    timeframe: '48',                           // 48小时数据
    delay: 3000,                              // 3秒间隔
    timeout: 60000,                           // 60秒超时
    headless: true,                           // 无头模式
    outputFormat: 'json'                      // JSON格式
  };

  const scraper = new GoogleTrendsScraper(customConfig);
  
  try {
    const results = await scraper.scrapeAll();
    
    for (const result of results) {
      if (result.success) {
        logger.info(`${result.country.name}: ${result.trends.length} 条趋势`);
        
        // 显示商业相关的趋势（包含stock, price, buy等关键词）
        const businessTrends = result.trends.filter(trend => 
          /stock|price|buy|sell|market|finance|crypto|bitcoin/i.test(trend.title)
        );
        
        if (businessTrends.length > 0) {
          logger.info(`  商业相关趋势 (${businessTrends.length} 条):`);
          businessTrends.slice(0, 3).forEach((trend, index) => {
            logger.info(`    ${index + 1}. ${trend.title} (${trend.searchVolume})`);
          });
        }
      }
    }

    // 保存结果
    await saveJsonToFile(results, 'data/custom-example-results.json');
    logger.info('结果已保存到 data/custom-example-results.json');
    
  } catch (error) {
    logger.error('爬取失败', { error });
  }
}

async function singleCountryExample(): Promise<void> {
  logger.info('=== 单个国家爬取示例 ===');

  const scraper = new GoogleTrendsScraper(DEFAULT_CONFIG);
  
  try {
    await scraper.initialize();
    
    // 只爬取日本的数据
    const result = await scraper.scrapeCountry(COUNTRIES.JP!);
    
    if (result.success) {
      logger.info(`${result.country.name}: 成功获取 ${result.trends.length} 条趋势`);
      
      // 分析趋势类型
      const categories = {
        sports: result.trends.filter(t => /sport|game|match|team|player/i.test(t.title)),
        entertainment: result.trends.filter(t => /movie|music|celebrity|tv|show/i.test(t.title)),
        technology: result.trends.filter(t => /tech|computer|phone|app|software/i.test(t.title)),
        news: result.trends.filter(t => /news|政治|election|government/i.test(t.title))
      };
      
      Object.entries(categories).forEach(([category, trends]) => {
        if (trends.length > 0) {
          logger.info(`  ${category}: ${trends.length} 条趋势`);
        }
      });
    } else {
      logger.error(`爬取失败: ${result.error}`);
    }
    
    await scraper.cleanup();
    
  } catch (error) {
    logger.error('爬取失败', { error });
  }
}

// 运行示例
async function runExamples(): Promise<void> {
  try {
    await basicExample();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    
    await customConfigExample();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    
    await singleCountryExample();
    
    logger.info('=== 所有示例完成 ===');
  } catch (error) {
    logger.error('示例运行失败', { error });
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  void runExamples();
}
