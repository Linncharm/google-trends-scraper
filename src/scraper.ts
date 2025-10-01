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
  ensureDirectoryExists, 
  saveHighIntentCsvToFile,
  getMarketGroup
} from './utils/helpers.js';
import { ScraperConfig, ScrapeResult } from './types/index.js';
import { analyzeCommercialIntentBatch } from './service/analyzer.js';
import fs from 'fs/promises';
import cliProgress from 'cli-progress';
import { delay } from './utils/helpers.js';
import { createClient } from '@supabase/supabase-js'; // 新增


// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL 和 Key 未在 .env 文件中配置");
}
const supabase = createClient(supabaseUrl, supabaseKey);

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

// ... 放在 main 函数定义之前 ...

/**
 * 将爬取结果保存到 Supabase
 * @param results 爬取结果数组
 */
async function saveResultsToSupabase(results: ScrapeResult[]): Promise<number> {
  const trendsToInsert = [];

  for (const result of results) {
    if (result.success && result.trends.length > 0) {
      for (const trend of result.trends) {
        // ▼▼▼ 在这里添加判断条件 ▼▼▼
        if (trend.status === 'active') { 

          const group = getMarketGroup(result.country.code);

          trendsToInsert.push({
            country_code: result.country.code,
            market_group: group, // <--- 新增的字段
            title: trend.title,
            search_volume_base: trend.searchVolume, 
            trend_percentage: trend.searchTrend, 
            time_started: trend.timeStarted,
            breakdown: trend.breakdown,
            status: trend.status, // 此时 status 必然是 'active'
          });
        }
      }
    }
  }

  if (trendsToInsert.length === 0) {
    logger.info("没有新的趋势数据需要插入数据库。");
    return 0;
  }

  const { error } = await supabase
    .from('google_trends')
    .upsert(trendsToInsert, {
      onConflict: 'country_code, title', // 指定冲突判定的列
      ignoreDuplicates: true // 关键：如果冲突，则忽略，不更新也不报错
    });

  if (error) {
    logger.error('数据插入 Supabase 失败', error);
    return 0;
  }

  const insertedCount = trendsToInsert.length;
  logger.info(`成功向 Supabase 推送 ${insertedCount} 条数据进行处理。`);
  return insertedCount;
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
  }): Promise<{
    success: boolean;
    outputFile?: string;
    summary?: {
      totalTrends: number;
      //highPotentialCount: number;
      insertedCount: number;
      countries: string[];
      timeframe: string;
    };
    error?: string;
  }> {
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

    // 本地ai逻辑
    // const CACHE_FILE = './data/ai_analysis_cache.json';
    // let cache: { [key: string]: any } = {};
    // try {
    //   cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
    //   logger.info(`已加载 ${Object.keys(cache).length} 条缓存的AI分析结果。`);
    // } catch (e) {
    //   logger.info('未找到缓存文件，将从头开始分析。');
    // }
    
    // const allTrends = results.flatMap(r => r.success ? r.trends.map(t => ({...t, country: r.country.code})) : []);
    // const trendsToAnalyze = allTrends.filter(t => !cache[`${t.country}-${t.title}`]);
    // logger.info(`共找到 ${allTrends.length} 条趋势，其中 ${trendsToAnalyze.length} 条需要进行AI分析。`);

    // if (trendsToAnalyze.length > 0) {
    //     const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    //     progressBar.start(trendsToAnalyze.length, 0);
    //     const BATCH_SIZE = 25;
  
    //     for (let i = 0; i < trendsToAnalyze.length; i += BATCH_SIZE) {
    //       const batch = trendsToAnalyze.slice(i, i + BATCH_SIZE);
          
    //       // --- 核心改动：为AI调用增加重试逻辑 ---
    //       let analyses = null;
    //       const maxRetries = 3; // 最多重试3次
    //       for (let attempt = 1; attempt <= maxRetries; attempt++) {
    //         analyses = await analyzeCommercialIntentBatch(batch);
    //         if (analyses) {
    //           // 如果成功获取到分析结果，则跳出重试循环
    //           break;
    //         }
    //         // 如果失败了，等待一段时间再重试
    //         if (attempt < maxRetries) {
    //           const waitTime = 5 * attempt; // 第一次等5秒, 第二次等10秒
    //           logger.warn(`批次 ${i/BATCH_SIZE + 1} 分析失败 (尝试 ${attempt}/${maxRetries})。将在 ${waitTime} 秒后重试...`);
    //           await delay(waitTime * 1000);
    //         } else {
    //           logger.error(`批次 ${i/BATCH_SIZE + 1} 在尝试 ${maxRetries} 次后彻底失败。`);
    //         }
    //       }

    //       if (analyses) {
    //         batch.forEach((trend, index) => {
    //           const analysis = analyses[index];
    //           if (analysis) {
    //             trend.analysis = analysis;
    //             const cacheKey = `${(trend as any).country}-${trend.title}`;
    //             cache[cacheKey] = analysis;
    //           }
    //         });
    //       }
          
    //       await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    //       progressBar.update(i + batch.length);
    //       await delay(1500); // 批次间的常规延迟仍然保留
    //     }
    //     progressBar.stop();
    //   }
    
    // // 将缓存的分析结果合并回主数据
    // results.forEach(result => {
    //   result.trends.forEach(trend => {
    //     const cacheKey = `${result.country.code}-${trend.title}`;
    //     if (cache[cacheKey]) {
    //       trend.analysis = cache[cacheKey];
    //     }
    //   });
    // });

    // logger.info('AI分析完成。');

    // // 保存结果
    // let outputPath = '';
    // let highPotentialCount = 0;
    
    // if (results.length > 0) {
    //   outputPath = args.output || generateOutputPath('all', args.format);
      
    //   if (args.format === 'json') {
    //     await saveJsonToFile(results, outputPath);
    //   } else {
    //     await saveCsvToFile(results, outputPath);
    //     const highIntentOutputPath = outputPath.replace('.csv', '-high-intent.csv');
    //     await saveHighIntentCsvToFile(results, highIntentOutputPath, 50);
    //     try {
    //         await fs.access(highIntentOutputPath);
    //         logger.info(`高潜力报告 (分数 > 50) 已保存到: ${highIntentOutputPath}`);
    //         // 计算高潜力趋势数量
    //         highPotentialCount = results.reduce((count, result) => {
    //           return count + result.trends.filter(trend => 
    //             trend.analysis && trend.analysis.saas_potential_score > 50
    //           ).length;
    //         }, 0);
    //         outputPath = highIntentOutputPath; // 使用高潜力报告作为主要输出
    //     } catch {
    //         logger.info('未发现分数高于50的趋势，未生成高潜力报告。');
    //     }
    //   }
      
    //   logger.info(`结果已保存到: ${outputPath}`);
    // }

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

    const insertedCount = await saveResultsToSupabase(results);

    logger.info('=== 爬取任务完成 ===');
    
    // 返回成功结果
    return {
      success: true,
      summary: {
        totalTrends,
        insertedCount, // 新增插入数量
        countries: args.countries,
        timeframe: args.timeframe,
      }
    };

  } catch (error) {
    logger.error('程序运行失败', { error });
    
    // 返回失败结果
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// // 运行主函数
// void main().catch(error => {
//   console.error('未处理的错误', error);
//   process.exit(1);
// });