/**
 * Google Trends相关类型定义
 */

// 趋势数据项
export interface TrendItem {
  title: string;              // 趋势标题
  searchVolume: string;        // 搜索量
  timeStarted: string;         // 开始时间
  status: 'active' | 'lasted'; // 趋势状态
  relatedQueries?: string[];   // 相关查询
  url?: string;               // 相关链接
}

// 国家/地区配置
export interface CountryConfig {
  code: string;     // 国家代码 (如: US, CN, JP)
  name: string;     // 国家名称
  language: string; // 语言代码 (如: en-US, zh-CN)
}

// 爬虫配置
export interface ScraperConfig {
  countries: CountryConfig[];
  timeframe: '24' | '48' | '168'; // 小时数: 24h, 48h, 7天(168h)
  delay: number;                  // 请求间隔(毫秒)
  timeout: number;                // 页面超时时间(毫秒)
  userAgent?: string;            // 自定义User-Agent
  headless: boolean;             // 是否无头模式
  outputFormat: 'json' | 'csv';  // 输出格式
}

// 爬取结果
export interface ScrapeResult {
  country: CountryConfig;
  timestamp: string;
  trends: TrendItem[];
  success: boolean;
  error?: string;
}

// 日志级别
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 爬虫状态
export enum ScraperStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error'
}
