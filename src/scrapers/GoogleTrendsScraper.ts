import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import { 
  TrendItem, 
  CountryConfig, 
  ScraperConfig, 
  ScrapeResult, 
  ScraperStatus 
} from '../types/index.js';
import { 
  buildTrendsUrl, 
  getUserAgent, 
  TRENDS_CONFIG 
} from '../config/scraper.js';
import { logger } from '../utils/logger.js';
import { 
  delay, 
  cleanTrendTitle, 
  cleanTimeStarted,
  parseSearchVolume, 
  validateTrendItem,
  getCurrentTimestamp 
} from '../utils/helpers.js';

/**
 * Google Trends爬虫类
 */
export class GoogleTrendsScraper {
  private browser: Browser | null = null;
  private status: ScraperStatus = ScraperStatus.IDLE;
  private config: ScraperConfig;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  /**
   * 获取Chrome可执行文件路径
   */
  private getChromePath(): string | undefined {
    // 尝试使用系统安装的Chrome
    const commonPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser'
    ];


    for (const path of commonPaths) {
      try {
        if (fs.existsSync(path)) {
          return path;
        }
      } catch (error) {
        // 忽略错误，继续尝试下一个路径
      }
    }

    // 如果没找到系统Chrome，返回undefined让Puppeteer使用默认的
    return undefined;
  }

  /**
   * 初始化浏览器
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      logger.info('正在启动浏览器...');
      
      this.browser = await puppeteer.launch({
        headless: this.config.headless ? 'new' : false,
        executablePath: this.getChromePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: {
          width: 1280,
          height: 800
        }
      });

      logger.info('浏览器启动成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('浏览器启动失败', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      throw new Error(`浏览器启动失败: ${errorMessage}`);
    }
  }

  /**
   * 关闭浏览器
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        logger.info('浏览器已关闭');
      } catch (error) {
        logger.error('关闭浏览器时出错', { error });
      }
    }
  }

  /**
   * 爬取指定国家的趋势数据
   */
  async scrapeCountry(country: CountryConfig): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      country,
      timestamp: getCurrentTimestamp(),
      trends: [],
      success: false
    };

    if (!this.browser) {
      result.error = '浏览器未初始化';
      return result;
    }

    let page: Page | null = null;

    try {
      logger.info(`开始爬取 ${country.name} (${country.code}) 的趋势数据`);

      // 创建新页面
      page = await this.browser.newPage();
      
      // 设置User-Agent和其他头部
      await page.setUserAgent(getUserAgent());
      
      // 设置页面超时时间
      page.setDefaultTimeout(this.config.timeout);

      // 构建URL
      const url = buildTrendsUrl(country.code, country.language, this.config.timeframe);
      logger.debug(`访问URL: ${url}`);

      // 访问页面
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: this.config.timeout 
      });

      // 等待页面加载
      await delay(TRENDS_CONFIG.WAIT_TIME);

      // 等待趋势表格加载
      try {
        await page.waitForSelector(TRENDS_CONFIG.SELECTORS.TREND_TABLE, { 
          timeout: 10000 
        });
      } catch (error) {
        logger.warn(`${country.name}: 趋势表格加载超时，尝试继续解析`);
      }

      // 解析趋势数据
      const trends = await this.parseTrendsFromPage(page);
      
      result.trends = trends;
      result.success = true;
      
      logger.info(`${country.name}: 成功获取 ${trends.length} 条趋势数据`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      logger.error(`${country.name}: 爬取失败`, { error: errorMessage });
    } finally {
      if (page) {
        await page.close();
      }
    }

    return result;
  }

  /**
   * 从页面解析趋势数据
   */
  private async parseTrendsFromPage(page: Page): Promise<TrendItem[]> {
    const trends: TrendItem[] = [];

    try {
      // 获取所有趋势行
      const trendElements = await page.$$(TRENDS_CONFIG.SELECTORS.TREND_ROWS);
      
      logger.debug(`找到 ${trendElements.length} 个趋势元素`);

      for (const element of trendElements) {
        try {
          // 提取趋势数据
          const trendData = await page.evaluate((el, selectors) => {
            const titleEl = el.querySelector(selectors.TREND_TITLE);
            const volumeEl = el.querySelector(selectors.SEARCH_VOLUME);
            const timeEl = el.querySelector(selectors.TIME_STARTED);
            const statusEl = el.querySelector(selectors.STATUS_ICON);

            if (!titleEl || !volumeEl || !timeEl) {
              return null;
            }

            return {
              title: titleEl.textContent?.trim() || '',
              searchVolume: volumeEl.textContent?.trim() || '',
              timeStarted: timeEl.textContent?.trim() || '',
              status: statusEl?.className?.includes('active') ? 'active' : 'lasted'
            };
          }, element, TRENDS_CONFIG.SELECTORS);

          if (trendData && trendData.title) {
            const trend: TrendItem = {
              title: cleanTrendTitle(trendData.title),
              searchVolume: parseSearchVolume(trendData.searchVolume),
              timeStarted: cleanTimeStarted(trendData.timeStarted),
              status: trendData.status as 'active' | 'lasted'
            };

            if (validateTrendItem(trend)) {
              trends.push(trend);
            }
          }
        } catch (error) {
          logger.warn('解析单个趋势项时出错', { error });
        }
      }

    } catch (error) {
      logger.error('解析页面趋势数据失败', { error });
    }

    return trends;
  }

  /**
   * 爬取所有配置的国家
   */
  async scrapeAll(): Promise<ScrapeResult[]> {
    this.status = ScraperStatus.RUNNING;
    const results: ScrapeResult[] = [];

    try {
      await this.initialize();

      for (const country of this.config.countries) {
        if (this.status !== ScraperStatus.RUNNING) {
          logger.info('爬虫已停止');
          break;
        }

        const result = await this.scrapeCountry(country);
        results.push(result);

        // 请求间隔
        if (this.config.delay > 0) {
          await delay(this.config.delay);
        }
      }

    } catch (error) {
      this.status = ScraperStatus.ERROR;
      logger.error('爬虫运行失败', { error });
    } finally {
      await this.cleanup();
      this.status = ScraperStatus.IDLE;
    }

    return results;
  }

  /**
   * 停止爬虫
   */
  stop(): void {
    this.status = ScraperStatus.PAUSED;
    logger.info('爬虫已暂停');
  }

  /**
   * 获取爬虫状态
   */
  getStatus(): ScraperStatus {
    return this.status;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ScraperConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('爬虫配置已更新', { config: this.config });
  }
}
