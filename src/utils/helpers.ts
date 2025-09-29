import fs from 'fs/promises';
import path from 'path';
import { TrendItem, ScrapeResult } from '../types/index.js';

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 确保目录存在
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 获取当前时间戳字符串
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 格式化文件名（移除特殊字符）
 */
export function sanitizeFileName(filename: string): string {
  return filename.replace(/[^\w\s-]/gi, '').trim();
}

/**
 * 保存JSON数据到文件
 */
export async function saveJsonToFile(data: any, filePath: string): Promise<void> {
  await ensureDirectoryExists(path.dirname(filePath));
  const jsonContent = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, jsonContent, 'utf-8');
}

/**
 * (新增) 只保存商业意图分数大于指定阈值的CSV数据到文件
 */
export async function saveHighIntentCsvToFile(
  results: ScrapeResult[], 
  filePath: string, 
  threshold: number
): Promise<void> {
  await ensureDirectoryExists(path.dirname(filePath));
  
  // 表头和原函数保持一致
  const headers = ['Country', 'Timestamp', 'Title', 'Search Volume', 'Time Started', 'Breakdown', 'Status', 'SaaS_Potential_Score'];
  const rows: string[] = [headers.join(',')];
  
  let highIntentCount = 0;

  for (const result of results) {
    if (result.success && result.trends.length > 0) {
      for (const trend of result.trends) {

        // --- 核心筛选逻辑 ---
        // 确保 trend.analysis 存在，并且分数大于阈值
        if (trend.analysis && trend.analysis.saas_potential_score > threshold) {
          
          const ai_intent_score = trend.analysis.saas_potential_score;
          
          const row = [
            `"${result.country.name}"`,
            `"${result.timestamp}"`,
            `"${trend.title.replace(/"/g, '""')}"`,
            `"${trend.searchVolume}"`,
            `"${trend.timeStarted}"`,
            `"${trend.breakdown.replace(/"/g, '""').replace(/, /g, '\n')}"`, // 同样使用换行
            `"${trend.status}"`,
            `${ai_intent_score}`
          ].join(',');
          rows.push(row);
          highIntentCount++;
        }
        // --- 筛选逻辑结束 ---
      }
    }
  }
  
  // 如果有高潜力数据，则写入文件
  if (highIntentCount > 0) {
    const csvContent = rows.join('\n');
    await fs.writeFile(filePath, csvContent, 'utf-8');
  } else {
    // 如果没有数据，可以选择不创建文件，或创建一个空文件
    // 这里我们选择不创建文件，并在主程序中打印日志
  }
}

/**
 * 保存CSV数据到文件
 */
export async function saveCsvToFile(results: ScrapeResult[], filePath: string): Promise<void> {
  await ensureDirectoryExists(path.dirname(filePath));
  
  const headers = ['Country', 'Timestamp', 'Title', 'Search Volume', 'Time Started', 'Breakdown', 'Status','Commercial Intent Score'];
  const rows: string[] = [headers.join(',')];
  
  for (const result of results) {
    if (result.success && result.trends.length > 0) {
      for (const trend of result.trends) {

        const ai_intent_score = trend.analysis?.saas_potential_score ?? '';

        const row = [
          `"${result.country.name}"`,
          `"${result.timestamp}"`,
          `"${trend.title.replace(/"/g, '""')}"`,
          `"${trend.searchVolume}"`,
          `"${trend.timeStarted}"`,
          `"${trend.breakdown}"`,
          `"${trend.status}"`,
          `"${ai_intent_score}"`
        ].join(',');
        rows.push(row);
      }
    }
  }
  
  const csvContent = rows.join('\n');
  await fs.writeFile(filePath, csvContent, 'utf-8');
}

/**
 * 生成输出文件路径
 */
export function generateOutputPath(countryCode: string, format: 'json' | 'csv'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `google-trends-${countryCode.toLowerCase()}-${timestamp}.${format}`;
  return path.join('data', filename);
}

/**
 * 验证趋势数据
 */
export function validateTrendItem(item: any): item is TrendItem {
  return (
    typeof item === 'object' &&
    typeof item.title === 'string' &&
    typeof item.searchVolume === 'string' &&
    typeof item.timeStarted === 'string' &&
    (item.status === 'active' || item.status === 'lasted')
  );
}

/**
 * 清理和标准化趋势标题
 */
export function cleanTrendTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

/**
 * 清理时间标签
 */
export function cleanTimeStarted(timeText: string): string {
  // 移除额外的状态文本，只保留时间信息
  return timeText
    .replace(/trending_up/g, '')
    .replace(/Active/g, '')
    .replace(/Lasted/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * 清理相关细分，排除掉+ 42 more这样的文本,Search term,query_stats,Explore
 */
export function cleanBreakdown(breakdown: string): string {
  return breakdown
    .replace(/\+ \d+ more/g, '')
    .replace(/Search term/g, '')
    .replace(/query_stats/g, '')
    .replace(/Explore/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * 解析搜索量字符串
 */
/**
 * 解析复杂的搜索量字符串，例如 "10K+100%" 或 "500K+-50%"
 * @param volumeStr 原始字符串
 * @returns 返回一个包含基础量级和趋势百分比的对象
 */
export function parseComplexSearchVolume(volumeStr: string): { volume: number; trend: number } {
  if (!volumeStr) {
    return { volume: 0, trend: 0 };
  }

  // 正则表达式来分离量级和趋势部分
  // 它会匹配像 "10K+" (量级) 和 "+100" (趋势) 这样的部分
  const match = volumeStr.match(/([\d,.]+[KM]?\+?)\s*([+-]\d+)/);

  let volumePart: string | undefined;
  let trendPart: string | undefined;

  if (match) {
    volumePart = match[1]; // "10K+"
    trendPart = match[2];  // "+100"
  } else {
    // 如果不匹配，说明可能只有量级部分，例如 "5K+"
    volumePart = volumeStr;
  }

  // --- 解析量级部分 ---
  let volume = 0;
  if (volumePart) {
    const num = parseFloat(volumePart.replace(/,/g, ''));
    if (volumePart.toUpperCase().includes('K')) {
      volume = Math.floor(num * 1000);
    } else if (volumePart.toUpperCase().includes('M')) {
      volume = Math.floor(num * 1000000);
    } else {
      volume = Math.floor(num);
    }
  }

  // --- 解析趋势部分 ---
  const trend = trendPart ? parseInt(trendPart, 10) : 0;
  
  return { volume, trend };
}

/**
 * 检查URL是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
