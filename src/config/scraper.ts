import { ScraperConfig } from '../types/index.js';
import { COUNTRIES } from './countries.js';

/**
 * 默认爬虫配置
 */
export const DEFAULT_CONFIG: ScraperConfig = {
  countries: [COUNTRIES.US!], // 默认只爬取美国数据
  timeframe: '24',           // 24小时内的趋势
  delay: 2000,               // 请求间隔2秒
  timeout: 30000,            // 30秒超时
  headless: true,            // 无头模式
  outputFormat: 'json'       // JSON格式输出
};

/**
 * Google Trends URL配置
 */
export const TRENDS_CONFIG = {
  BASE_URL: 'https://trends.google.com/trending',
  SELECTORS: {
    // 趋势表格容器
    TREND_TABLE: '#trend-table',
    // 趋势行
    TREND_ROWS: '#trend-table tbody tr',
    // 趋势标题
    TREND_TITLE: 'td:nth-child(2) div:first-child',
    // 搜索量
    SEARCH_VOLUME: 'td:nth-child(3)',
    // 开始时间
    TIME_STARTED: 'td:nth-child(4)',
    // 趋势状态图标
    STATUS_ICON: 'td:nth-child(1) div[class*="icon"]',
    // 加载指示器
    LOADING: '.loading',
    // 错误信息
    ERROR_MESSAGE: '.error-message'
  },
  // 页面加载等待时间
  WAIT_TIME: 5000
};

/**
 * 构建Google Trends URL
 */
export function buildTrendsUrl(countryCode: string, language: string, hours: string): string {
  const params = new URLSearchParams({
    geo: countryCode,
    hl: language,
    hours: hours
  });
  
  return `${TRENDS_CONFIG.BASE_URL}?${params.toString()}`;
}

/**
 * 获取配置的User-Agent
 */
export function getUserAgent(): string {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}
