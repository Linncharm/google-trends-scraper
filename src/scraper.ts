#!/usr/bin/env node

/**
 * Google Trends爬虫命令行工具
 */

import dotenv from 'dotenv';
import { GoogleTrendsScraper } from './scrapers/GoogleTrendsScraper.js';
import { COUNTRIES, getCountryConfig } from './config/countries.js';
import { DEFAULT_CONFIG } from './config/scraper.js';
import { logger } from './utils/logger.js';
import { 
  saveJsonToFile, 
  saveCsvToFile, 
  generateOutputPath, 
  ensureDirectoryExists 
} from './utils/helpers.js';
import { ScraperConfig, ScrapeResult } from './types/index.js';
import { analyzeCommercialIntentBatch } from './service/analyzer.js';
import fs from 'fs/promises';
import cliProgress from 'cli-progress';
import { delay } from './utils/helpers.js';

// 加载环境变量
dotenv.config();

/**
 * 解析命令行参数
 */
function parseArguments(): {
  countries: string[];
  timeframe: string;
  format: 'json' | 'csv';
  output?: string;
  headless: boolean;
} {
  const args = process.argv.slice(2);
  const config = {
    countries: ['US'],
    timeframe: '24',
    format: 'json' as 'json' | 'csv',
    headless: true,
    output: undefined as string | undefined
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--countries':
      case '-c':
        if (nextArg) {
          config.countries = nextArg.split(',').map(c => c.trim().toUpperCase());
          i++;
        }
        break;
      case '--timeframe':
      case '-t':
        if (nextArg && ['24', '48', '168'].includes(nextArg)) {
          config.timeframe = nextArg;
          i++;
        }
        break;
      case '--format':
      case '-f':
        if (nextArg && ['json', 'csv'].includes(nextArg)) {
          config.format = nextArg as 'json' | 'csv';
          i++;
        }
        break;
      case '--output':
      case '-o':
        if (nextArg) {
          config.output = nextArg;
          i++;
        }
        break;
      case '--no-headless':
        config.headless = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Google Trends爬虫工具

用法: npm run scrape [选项]

选项:
  -c, --countries <国家代码>  要爬取的国家，用逗号分隔 (默认: US)
                             支持的国家: ${Object.keys(COUNTRIES).join(', ')}
  -t, --timeframe <小时>     时间范围: 24, 48, 168 (默认: 24)
  -f, --format <格式>       输出格式: json, csv (默认: json)
  -o, --output <路径>       输出文件路径 (可选)
      --no-headless         显示浏览器窗口
  -h, --help               显示帮助信息

示例:
  npm run scrape                           # 爬取美国24小时趋势
  npm run scrape -- -c US,CN,JP           # 爬取美国、中国、日本趋势
  npm run scrape -- -c US -t 48 -f csv    # 爬取美国48小时趋势，CSV格式
  npm run scrape -- --no-headless         # 显示浏览器窗口
        `);
        process.exit(0);
    }
  }

  return config;
}

/**
 * 验证国家代码
 */
function validateCountries(countryCodes: string[]): void {
  const invalidCountries = countryCodes.filter(code => !getCountryConfig(code));
  
  if (invalidCountries.length > 0) {
    logger.error(`不支持的国家代码: ${invalidCountries.join(', ')}`);
    logger.info(`支持的国家代码: ${Object.keys(COUNTRIES).join(', ')}`);
    process.exit(1);
  }
}

/**
 * 主函数
 */
export async function main(args: {
    countries: string[];
    format: 'json' | 'csv';
    headless: boolean;
    output?: string;
    timeframe: string;
  }): Promise<void> {
  try {
    logger.info('=== Google Trends 爬虫开始运行 ===');

    // 解析命令行参数
    // const args = parseArguments();
    //logger.info('运行参数', args);

    // 验证国家代码
    validateCountries(args.countries);

    // 确保输出目录存在
    await ensureDirectoryExists('data');
    await ensureDirectoryExists('logs');

    // 构建配置
    const countries = args.countries.map(code => getCountryConfig(code)!);
    const scraperConfig: ScraperConfig = {
      ...DEFAULT_CONFIG,
      countries,
      timeframe: args.timeframe as '24' | '48' | '168',
      outputFormat: args.format,
      headless: args.headless
    };

    // 创建爬虫实例
    const scraper = new GoogleTrendsScraper(scraperConfig);

    // 开始爬取
    logger.info(`开始爬取 ${countries.length} 个国家的趋势数据...`);
    const results: ScrapeResult[] = await scraper.scrapeAll();

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const totalTrends = results.reduce((sum, r) => sum + r.trends.length, 0);

    logger.info(`爬取完成: ${successCount}/${results.length} 个国家成功，共获取 ${totalTrends} 条趋势数据`);

    const CACHE_FILE = './data/ai_analysis_cache.json';
    let cache: { [key: string]: any } = {};
    try {
      cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
      logger.info(`已加载 ${Object.keys(cache).length} 条缓存的AI分析结果。`);
    } catch (e) {
      logger.info('未找到缓存文件，将从头开始分析。');
    }
    
    const allTrends = results.flatMap(r => r.success ? r.trends.map(t => ({...t, country: r.country.code})) : []);
    const trendsToAnalyze = allTrends.filter(t => !cache[`${t.country}-${t.title}`]);
    logger.info(`共找到 ${allTrends.length} 条趋势，其中 ${trendsToAnalyze.length} 条需要进行AI分析。`);

    if (trendsToAnalyze.length > 0) {
      const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      progressBar.start(trendsToAnalyze.length, 0);
      const BATCH_SIZE = 25;

      for (let i = 0; i < trendsToAnalyze.length; i += BATCH_SIZE) {
        const batch = trendsToAnalyze.slice(i, i + BATCH_SIZE);
        const analyses = await analyzeCommercialIntentBatch(batch);
        
        if (analyses) {
          batch.forEach((trend, index) => {
            const analysis = analyses[index];
            if (analysis) {
              trend.analysis = analysis;
              const cacheKey = `${(trend as any).country}-${trend.title}`;
              cache[cacheKey] = analysis;
            }
          });
        }
        await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2)); // 每批后更新缓存
        progressBar.update(i + batch.length);
        await delay(1000);
      }
      progressBar.stop();
    }
    
    // 将缓存的分析结果合并回主数据
    results.forEach(result => {
      result.trends.forEach(trend => {
        const cacheKey = `${result.country.code}-${trend.title}`;
        if (cache[cacheKey]) {
          trend.analysis = cache[cacheKey];
        }
      });
    });

    logger.info('AI分析完成。');

    // 保存结果
    if (results.length > 0) {
      const outputPath = args.output || generateOutputPath('all', args.format);
      
      if (args.format === 'json') {
        await saveJsonToFile(results, outputPath);
      } else {
        await saveCsvToFile(results, outputPath);
      }
      
      logger.info(`结果已保存到: ${outputPath}`);
    }

    // 显示详细结果
    // for (const result of results) {
    //   if (result.success) {
    //     logger.info(`${result.country.name}: ${result.trends.length} 条趋势`);
    //     result.trends.slice(0, 5).forEach((trend, index) => {
    //       logger.info(`  ${index + 1}. ${trend.title} (${trend.searchVolume})`);
    //     });
    //   } else {
    //     logger.error(`${result.country.name}: 失败 - ${result.error}`);
    //   }
    // }

    logger.info('=== 爬取任务完成 ===');
    process.exit(0);

  } catch (error) {
    logger.error('程序运行失败', { error });
    process.exit(1);
  }
}

// // 运行主函数
// void main().catch(error => {
//   console.error('未处理的错误', error);
//   process.exit(1);
// });