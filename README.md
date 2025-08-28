# Google Trends 爬虫项目

一个基于 TypeScript + Node.js + Puppeteer 的可扩展 Google Trends 数据爬虫工具。

## 功能特性

- 🚀 **高可扩展性**: 支持多国家、多时间范围的趋势数据爬取
- 🎯 **精确解析**: 自动解析趋势标题、搜索量、时间等关键信息
- 📊 **多格式输出**: 支持 JSON 和 CSV 格式数据导出
- 🔧 **灵活配置**: 可配置请求间隔、超时时间、浏览器模式等
- 📝 **完整日志**: 详细的运行日志记录和错误处理
- 🌍 **多国家支持**: 内置 15+ 国家/地区配置

## 支持的国家/地区

- 🇺🇸 美国 (US)
- 🇨🇳 中国 (CN)
- 🇯🇵 日本 (JP)
- 🇰🇷 韩国 (KR)
- 🇬🇧 英国 (GB)
- 🇩🇪 德国 (DE)
- 🇫🇷 法国 (FR)
- 🇮🇹 意大利 (IT)
- 🇪🇸 西班牙 (ES)
- 🇦🇺 澳大利亚 (AU)
- 🇨🇦 加拿大 (CA)
- 🇮🇳 印度 (IN)
- 🇧🇷 巴西 (BR)
- 🇲🇽 墨西哥 (MX)
- 🇷🇺 俄罗斯 (RU)

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 编译项目

```bash
pnpm run build
```

### 基础使用

```bash
# 爬取美国24小时趋势数据
pnpm run scrape

# 爬取多个国家
pnpm run scrape -- -c US,CN,JP

# 爬取48小时数据，CSV格式输出
pnpm run scrape -- -c US -t 48 -f csv

# 显示浏览器窗口（调试模式）
pnpm run scrape -- --no-headless
```

### 命令行参数

| 参数 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--countries` | `-c` | 国家代码，逗号分隔 | `US` |
| `--timeframe` | `-t` | 时间范围（24/48/168小时） | `24` |
| `--format` | `-f` | 输出格式（json/csv） | `json` |
| `--output` | `-o` | 输出文件路径 | 自动生成 |
| `--no-headless` | - | 显示浏览器窗口 | false |
| `--help` | `-h` | 显示帮助信息 | - |

## 项目结构

```
src/
├── types/           # TypeScript 类型定义
├── config/          # 配置文件
│   ├── countries.ts # 国家配置
│   └── scraper.ts   # 爬虫配置
├── utils/           # 工具函数
│   ├── logger.ts    # 日志工具
│   └── helpers.ts   # 辅助函数
├── scrapers/        # 爬虫核心
│   └── GoogleTrendsScraper.ts
├── data/            # 输出数据目录
├── index.ts         # 主入口文件
└── scraper.ts       # 命令行工具
```

## 编程接口

### 基础用法

```typescript
import { GoogleTrendsScraper, COUNTRIES, DEFAULT_CONFIG } from './src/index.js';

// 创建爬虫实例
const scraper = new GoogleTrendsScraper({
  ...DEFAULT_CONFIG,
  countries: [COUNTRIES.US, COUNTRIES.CN],
  timeframe: '24',
  headless: true
});

// 爬取所有配置的国家
const results = await scraper.scrapeAll();

// 爬取单个国家
const result = await scraper.scrapeCountry(COUNTRIES.US);
```

### 自定义配置

```typescript
import { ScraperConfig } from './src/types/index.js';

const customConfig: ScraperConfig = {
  countries: [COUNTRIES.US],
  timeframe: '48',
  delay: 3000,        // 3秒请求间隔
  timeout: 60000,     // 60秒超时
  headless: false,    // 显示浏览器
  outputFormat: 'csv'
};

const scraper = new GoogleTrendsScraper(customConfig);
```

## 数据格式

### 趋势数据结构

```typescript
interface TrendItem {
  title: string;              // 趋势标题
  searchVolume: string;       // 搜索量
  timeStarted: string;        // 开始时间
  status: 'active' | 'lasted'; // 趋势状态
  relatedQueries?: string[];  // 相关查询（待实现）
  url?: string;              // 相关链接（待实现）
}
```

### 爬取结果结构

```typescript
interface ScrapeResult {
  country: CountryConfig;     // 国家配置
  timestamp: string;          // 爬取时间戳
  trends: TrendItem[];        // 趋势数据数组
  success: boolean;           // 是否成功
  error?: string;            // 错误信息
}
```

## 开发指南

### 添加新国家

在 `src/config/countries.ts` 中添加新的国家配置：

```typescript
export const COUNTRIES: Record<string, CountryConfig> = {
  // 现有配置...
  
  // 新增国家
  TH: {
    code: 'TH',
    name: '泰国',
    language: 'th-TH'
  }
};
```

### 自定义解析逻辑

继承 `GoogleTrendsScraper` 类并重写解析方法：

```typescript
class CustomTrendsScraper extends GoogleTrendsScraper {
  protected async parseTrendsFromPage(page: Page): Promise<TrendItem[]> {
    // 自定义解析逻辑
    return super.parseTrendsFromPage(page);
  }
}
```

## 日志和调试

项目使用 Winston 进行日志记录：

- `logs/error.log` - 错误日志
- `logs/combined.log` - 所有日志
- 控制台输出（开发环境）

设置日志级别：

```bash
export LOG_LEVEL=debug
pnpm run scrape
```

## 注意事项

1. **请求频率**: 建议设置合适的请求间隔，避免被 Google 限制
2. **IP 限制**: 频繁请求可能导致 IP 被暂时封禁
3. **页面结构**: Google Trends 页面结构可能变化，需要定期更新选择器
4. **依赖版本**: Puppeteer 版本可能影响兼容性

## 待实现功能

- [ ] AI 分析商业化意图
- [ ] 定时任务调度
- [ ] 数据库存储
- [ ] 实时监控面板
- [ ] 邮件/消息通知
- [ ] 趋势分析报告

## 许可证

MIT License
