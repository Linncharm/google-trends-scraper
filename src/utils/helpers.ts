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
 * 保存CSV数据到文件
 */
export async function saveCsvToFile(results: ScrapeResult[], filePath: string): Promise<void> {
  await ensureDirectoryExists(path.dirname(filePath));
  
  const headers = ['Country', 'Timestamp', 'Title', 'Search Volume', 'Time Started', 'Status'];
  const rows: string[] = [headers.join(',')];
  
  for (const result of results) {
    if (result.success && result.trends.length > 0) {
      for (const trend of result.trends) {
        const row = [
          `"${result.country.name}"`,
          `"${result.timestamp}"`,
          `"${trend.title.replace(/"/g, '""')}"`,
          `"${trend.searchVolume}"`,
          `"${trend.timeStarted}"`,
          `"${trend.status}"`
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
 * 解析搜索量字符串
 */
export function parseSearchVolume(volume: string): string {
  return volume.trim().replace(/[^\d+KMB]/g, '');
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
