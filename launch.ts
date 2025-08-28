import { main } from './src/scraper.js';
import { COUNTRIES } from './src/config/countries.js'; // 导入以进行验证

// =======================================================
/**
 * 场景一：十大高潜力国家
 * 标准：人口众多，Google为主要搜索引擎，市场多元化
 * 包括：美国, 印度, 印度尼西亚, 巴基斯坦, 尼日利亚, 巴西, 墨西哥, 菲律宾, 越南, 日本
 */
const topTenScenario = {
    countries: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
  };
  
  /**
   * 场景二：G7 主要发达国家
   */
  const g7Scenario = {
      countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'IT'],
      format: 'csv' as const,
      headless: true,
      timeframe: '24',
  }
// =======================================================

const scenarioToRun = topTenScenario;

// 简单的启动前验证
const invalidCountries = scenarioToRun.countries.filter(c => !COUNTRIES[c]);
if (invalidCountries.length > 0) {
  console.error(`错误：无效的国家代码 -> ${invalidCountries.join(', ')}`);
  process.exit(1);
}

console.log('--- 使用预设配置启动爬虫 ---');
console.log('国家:', scenarioToRun.countries.join(', '));
console.log('格式:', scenarioToRun.format);
console.log('无头模式:', scenarioToRun.headless);
console.log('---------------------------');

// 直接调用 main 函数，并传入配置对象
main(scenarioToRun);