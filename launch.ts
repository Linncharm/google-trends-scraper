import { main } from './src/scraper.js';
import { COUNTRIES } from './src/config/countries.js'; // 导入以进行验证

// =======================================================
// === 在这里设置您想运行的所有参数 ===
const scenario = {
  countries: ['US', 'GB', 'BR'], // 目标国家: 美国, 英国, 巴西
  format: 'csv' as const, // 使用 "as const" 来获得更强的类型安全
  headless: true,
  timeframe: '24', // 这个参数虽然现在没用，但为了接口一致性先保留
};
// =======================================================

// 简单的启动前验证
const invalidCountries = scenario.countries.filter(c => !COUNTRIES[c]);
if (invalidCountries.length > 0) {
  console.error(`错误：无效的国家代码 -> ${invalidCountries.join(', ')}`);
  process.exit(1);
}

console.log('--- 使用预设配置启动爬虫 ---');
console.log('国家:', scenario.countries.join(', '));
console.log('格式:', scenario.format);
console.log('无头模式:', scenario.headless);
console.log('---------------------------');

// 直接调用 main 函数，并传入配置对象
main(scenario);