/**
 * Google Trends爬虫主入口文件
 */

export { GoogleTrendsScraper } from './scrapers/GoogleTrendsScraper.js';
export { COUNTRIES, getCountryConfig, getAllCountries } from './config/countries.js';
export { DEFAULT_CONFIG, TRENDS_CONFIG, buildTrendsUrl } from './config/scraper.js';
export { logger } from './utils/logger.js';
export * from './types/index.js';
export * from './utils/helpers.js';
