import fs from 'fs/promises';
import path from 'path';
import { TrendItem, ScrapeResult } from '../types/index.js';

/**
 * 市场分组的枚举对象。
 * - 键 (e.g., G7_DEVELOPED): 在代码中清晰、安全地使用。
 * - 值 (e.g., 'g7_developed'): 存储在数据库中的简洁、无空格的标识符。
 */
export const MarketGroupEnum = {
  HIGH_POTENTIAL_TEN: 'high_potential_ten',
  G7_DEVELOPED:       'g7_developed',
  EUROPEAN_CORE:      'european_core',
  ANGLOSPHERE:        'anglosphere',
  ASEAN_DIGITAL:      'asean_digital',
  LATAM_MAJOR:        'latam_major',
  MENA_HUBS:          'mena_hubs'
} as const; // 'as const' 提供了更强的类型安全，让其行为更像一个真正的枚举


/**
 * 国家分组数据结构。
 * 键是来自 MarketGroupEnum 的值，值是国家代码数组。
 */
export const marketGroups: Record<string, string[]> = {
  [MarketGroupEnum.HIGH_POTENTIAL_TEN]: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
  [MarketGroupEnum.G7_DEVELOPED]:       ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'JP'],
  [MarketGroupEnum.EUROPEAN_CORE]:      ['DE', 'GB', 'FR', 'ES', 'NL', 'SE'],
  [MarketGroupEnum.ANGLOSPHERE]:        ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'],
  [MarketGroupEnum.ASEAN_DIGITAL]:      ['ID', 'PH', 'VN', 'TH', 'MY', 'SG'],
  [MarketGroupEnum.LATAM_MAJOR]:        ['BR', 'MX', 'AR', 'CO', 'CL', 'PE'],
  [MarketGroupEnum.MENA_HUBS]:          ['AE', 'SA', 'EG']
};


// (将这段逻辑紧跟在 marketGroups 定义之后)

// 创建一个反向映射，方便快速查找： { 'US': 'high_potential_ten', 'CA': 'g7_developed', ... }
const countryToGroupMap = new Map<string, string>();

// 使用 Object.entries 和新的 marketGroups 结构来构建映射
for (const [groupName, countries] of Object.entries(marketGroups)) {
  countries.forEach(countryCode => {
    // 按定义顺序，确保每个国家只被映射到第一个出现的分组
    if (!countryToGroupMap.has(countryCode)) {
      countryToGroupMap.set(countryCode, groupName);
    }
  });
}

/**
 * 根据国家代码获取其所属的市场分组标识符。
 * @param countryCode 国家的ISO代码，例如 'US'
 * @returns 返回数据库友好的分组标识符 (e.g., 'g7_developed')，如果未找到则返回 'other'
 */
export function getMarketGroup(countryCode: string): string {
  return countryToGroupMap.get(countryCode) || 'other';
}

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
    typeof item.searchVolume === 'number' &&
    typeof item.searchTrend === 'number' && 
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

  // ▼▼▼ 核心改动 1：使用更强大的正则表达式 ▼▼▼
  // 这个表达式能捕获三部分：
  // 1. 量级部分 (例如 "200K+")
  // 2. 中间的文本 (例如 "arrow_upward")
  // 3. 趋势的数值部分 (例如 "1,000")
  const match = volumeStr.match(/^([\d,.]+[KM]?\+?)(.*?)([\d,]+)%?$/);

  let volumePart: string | undefined;
  let middlePart: string | undefined; // 用于判断趋势方向
  let trendPart: string | undefined;  // 趋势的数值

  if (match) {
    volumePart = match[1];
    middlePart = match[2];
    trendPart = match[3];
  } else {
    // 如果不匹配，则假定整个字符串都是量级部分
    volumePart = volumeStr;
  }

  // --- 解析量级部分 (这部分逻辑不变) ---
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

  // --- 解析趋势部分 (使用新的逻辑) ---
  let trend = 0;
  if (trendPart) {
    // ▼▼▼ 核心改动 2：解析前先移除逗号 ▼▼▼
    const trendNum = parseInt(trendPart.replace(/,/g, ''), 10);
    
    // ▼▼▼ 核心改动 3：根据中间的文本判断趋势是正是负 ▼▼▼
    // (让函数更具鲁棒性，即使未来出现 arrow_downward 也能正确处理)
    if (middlePart && middlePart.toLowerCase().includes('down')) {
      trend = -trendNum;
    } else {
      trend = trendNum; // 默认为正增长
    }
  }
  
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
