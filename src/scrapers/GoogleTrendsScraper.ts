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
  getCurrentTimestamp,
  cleanBreakdown
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

  // in GoogleTrendsScraper class

  /**
   * 爬取指定国家的趋势数据（修复版，采用内容变化来判断翻页）
   */
  async scrapeCountry(country: CountryConfig): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      country,
      timestamp: getCurrentTimestamp(),
      trends: [],
      success: false
    };
    const allTrends: TrendItem[] = [];

    if (!this.browser) {
      result.error = '浏览器未初始化';
      return result;
    }

    let page: Page | null = null;

    try {
      logger.info(`开始爬取 ${country.name} (${country.code}) 的趋势数据`);
      page = await this.browser.newPage();
      await page.setUserAgent(getUserAgent());
      page.setDefaultTimeout(this.config.timeout);

      const url = buildTrendsUrl(country.code, country.language, this.config.timeframe);
      logger.debug(`访问URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: this.config.timeout });
      logger.info('初始页面加载完成。');

      let currentPage = 1;
      const maxPages = 25;

      while (currentPage <= maxPages) {
        //logger.info(`[调试] 正在解析第 ${currentPage} 页的数据...`);
        await page.waitForSelector(TRENDS_CONFIG.SELECTORS.TREND_TABLE, { timeout: 10000 });
        
        const trendsOnCurrentPage = await this.parseTrendsFromPage(page);
        allTrends.push(...trendsOnCurrentPage);
        //logger.info(`第 ${currentPage} 页找到 ${trendsOnCurrentPage.length} 条数据。`);
        
        if (trendsOnCurrentPage.length === 0 && currentPage > 1) {
            logger.warn(`第 ${currentPage} 页未解析到数据，可能已是末页，提前结束。`);
            break;
        }

        const nextButtonSelector = TRENDS_CONFIG.SELECTORS.PAGINATION_NEXT_BUTTON;
        const nextButton = await page.$(nextButtonSelector);

        if (!nextButton) {
          logger.info('[调试] 页面上未找到“下一页”按钮，已到达最后一页。');
          break;
        }

        const isNextButtonDisabled = await page.$eval(
          nextButtonSelector,
          button => (button as any).disabled
        );
        
        //logger.info(`[调试] “下一页”按钮状态: ${isNextButtonDisabled ? '禁用' : '可用'}`);

        if (isNextButtonDisabled) {
          //logger.info('“下一页”按钮已禁用，翻页结束。');
          break;
        }

        // --- 关键改动：新的等待逻辑 ---
        
        // 1. 点击前，获取当前第一行数据的文本内容
        const firstRowSelector = `${TRENDS_CONFIG.SELECTORS.TREND_ROWS}:first-child ${TRENDS_CONFIG.SELECTORS.TREND_TITLE}`;
        const firstRowTextBeforeClick = await page.$eval(firstRowSelector, el => el.textContent?.trim()).catch(() => null);
        //logger.info(`[调试] 点击前第一行的内容: "${firstRowTextBeforeClick}"`);
        
        // 2. 点击“下一页”
        //logger.info(`正在点击“下一页”，前往第 ${currentPage + 1} 页...`);
        await page.click(nextButtonSelector);
        
        // 3. 等待第一行的内容发生变化，而不是等待导航
        //logger.info(`[调试] 等待内容更新...`);
        try {
          await page.waitForFunction(
            (selector, initialText) => {
              const firstRow = document.querySelector(selector);
              // 如果第一行不存在，或者第一行的文本已经不是之前那个了，就认为加载成功
              return !firstRow || firstRow.textContent?.trim() !== initialText;
            },
            { timeout: 15000 }, // 等待15秒
            firstRowSelector,
            firstRowTextBeforeClick
          );
          //logger.info(`[调试] 第 ${currentPage + 1} 页内容更新完成。`);
        } catch (e) {
            logger.error(`[调试] 等待内容更新超时，翻页可能失败。错误: ${e instanceof Error ? e.message : String(e)}`);
            break; // 如果等待超时，则中断翻页
        }
        // --- 关键改动结束 ---

        currentPage++;
      }

      result.trends = allTrends;
      result.success = true;
      logger.info(`${country.name}: 爬取完成，共获取 ${allTrends.length} 条趋势数据，共 ${currentPage} 页`);

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

            const breakdownButtons = el.querySelectorAll(selectors.BREAKDOWN_ITEMS);

            const breakdownArray = Array.from(
              breakdownButtons, 
              button => button.getAttribute('data-term')?.trim() || ''
            );

            return {
              title: titleEl.textContent?.trim() || '',
              searchVolume: volumeEl.textContent?.trim() || '',
              timeStarted: timeEl.textContent?.trim() || '',
              breakdown: breakdownArray,
              status: statusEl?.className?.includes('active') ? 'active' : 'lasted'
              
            };
          }, element, TRENDS_CONFIG.SELECTORS);

          if (trendData && trendData.title) {

            const uniqueTerms = [...new Set(trendData.breakdown)];

            const cleanedBreakdownString = uniqueTerms
              .map(term => cleanBreakdown(term))
              .filter(term => term) // 移除空字符串
              .join(', '); // 用 ", " 分隔


            const trend: TrendItem = {
              title: cleanTrendTitle(trendData.title),
              searchVolume: parseSearchVolume(trendData.searchVolume),
              timeStarted: cleanTimeStarted(trendData.timeStarted),
              breakdown: cleanedBreakdownString,
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
