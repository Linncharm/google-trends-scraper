import { main } from './src/scraper.js';
import { COUNTRIES } from './src/config/countries.js'; // 导入以进行验证
import { marketGroups } from './src/utils/helpers.js';

const allCountries = new Set<string>();
Object.values(marketGroups).forEach(countries => {
  countries.forEach(code => allCountries.add(code));
});

// 转换为数组，用于爬虫配置
const globalKeyMarketsScenario = {
    countries: Array.from(allCountries),
    format: 'csv' as const,
    headless: true,
    timeframe: '24',
};
// =======================================================

const scenarioToRun = globalKeyMarketsScenario;

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
main(scenarioToRun).then(result => {
  if (result.success) {
    console.log('✅ 爬取成功完成');
    console.log(`📄 输出文件: ${result.outputFile}`);
    if (result.summary) {
      console.log(`📊 共获取 ${result.summary.totalTrends} 条趋势数据`);
      // console.log(`🎯 高潜力趋势: ${result.summary.highPotentialCount} 条`);
      console.log(`📊 数据库共插入 ${result.summary.insertedCount} 条趋势数据`);

    }
    process.exit(0);
  } else {
    console.error('❌ 爬取失败:', result.error);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ 未处理的错误:', error);
  process.exit(1);
});