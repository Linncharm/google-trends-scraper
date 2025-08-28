# Google Trends 爬虫使用指南

## 项目概述

这是一个基于 TypeScript + Node.js + Puppeteer 开发的高可扩展性 Google Trends 数据爬虫工具。该工具可以自动爬取指定国家的24小时内trending数据，支持多种输出格式，并提供了完整的配置选项。

## 核心功能

✅ **已完成功能**：
- 多国家趋势数据爬取（支持15个国家/地区）
- 可配置时间范围（24h/48h/7天）
- 多种输出格式（JSON/CSV）
- 详细的日志记录
- 灵活的配置系统
- 错误处理和重试机制
- 数据清理和标准化

🔄 **待实现功能**（下一步）：
- AI 分析商业化意图并过滤
- 定时任务调度
- 数据库存储
- 实时监控面板

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 编译项目
```bash
pnpm run build
```

### 3. 基础使用
```bash
# 爬取美国24小时趋势数据
pnpm run scrape

# 爬取多个国家
pnpm run scrape -- -c US,CN,JP

# 爬取48小时数据，CSV格式
pnpm run scrape -- -c US -t 48 -f csv
```

## 命令行选项

| 选项 | 简写 | 描述 | 示例 |
|------|------|------|------|
| `--countries` | `-c` | 国家代码（逗号分隔） | `-c US,CN,JP` |
| `--timeframe` | `-t` | 时间范围（24/48/168小时） | `-t 48` |
| `--format` | `-f` | 输出格式（json/csv） | `-f csv` |
| `--output` | `-o` | 自定义输出路径 | `-o ./my-data.json` |
| `--no-headless` | | 显示浏览器窗口（调试） | `--no-headless` |

## 支持的国家

| 代码 | 国家/地区 | 语言 |
|------|-----------|------|
| US | 美国 | en-US |
| CN | 中国 | zh-CN |
| JP | 日本 | ja-JP |
| KR | 韩国 | ko-KR |
| GB | 英国 | en-GB |
| DE | 德国 | de-DE |
| FR | 法国 | fr-FR |
| IT | 意大利 | it-IT |
| ES | 西班牙 | es-ES |
| AU | 澳大利亚 | en-AU |
| CA | 加拿大 | en-CA |
| IN | 印度 | en-IN |
| BR | 巴西 | pt-BR |
| MX | 墨西哥 | es-MX |
| RU | 俄罗斯 | ru-RU |

## 编程接口

### 基础示例
```typescript
import { GoogleTrendsScraper, COUNTRIES, DEFAULT_CONFIG } from './src/index.js';

const scraper = new GoogleTrendsScraper(DEFAULT_CONFIG);
const results = await scraper.scrapeAll();
```

### 自定义配置
```typescript
import { ScraperConfig } from './src/types/index.js';

const config: ScraperConfig = {
  countries: [COUNTRIES.US, COUNTRIES.JP],
  timeframe: '48',
  delay: 3000,
  timeout: 60000,
  headless: true,
  outputFormat: 'json'
};

const scraper = new GoogleTrendsScraper(config);
```

### 单个国家爬取
```typescript
await scraper.initialize();
const result = await scraper.scrapeCountry(COUNTRIES.US);
await scraper.cleanup();
```

## 数据结构

### 趋势数据项
```typescript
interface TrendItem {
  title: string;              // 趋势标题
  searchVolume: string;       // 搜索量 (如: "2M+1000")
  timeStarted: string;        // 开始时间 (如: "10 hours ago")
  status: 'active' | 'lasted'; // 趋势状态
}
```

### 爬取结果
```typescript
interface ScrapeResult {
  country: CountryConfig;     // 国家信息
  timestamp: string;          // 爬取时间戳
  trends: TrendItem[];        // 趋势数据数组
  success: boolean;           // 是否成功
  error?: string;            // 错误信息（如果失败）
}
```

## 输出示例

### JSON 格式
```json
[
  {
    "country": {
      "code": "US",
      "name": "美国",
      "language": "en-US"
    },
    "timestamp": "2025-08-28T02:42:14.169Z",
    "trends": [
      {
        "title": "nvidia stock",
        "searchVolume": "200K+200",
        "timeStarted": "15 hours ago",
        "status": "lasted"
      }
    ],
    "success": true
  }
]
```

### CSV 格式
```csv
Country,Timestamp,Title,Search Volume,Time Started,Status
"美国","2025-08-28T02:42:14.169Z","nvidia stock","200K+200","15 hours ago","lasted"
```

## 配置选项

### 环境变量（可选）
```bash
# 日志级别
LOG_LEVEL=info

# Node.js 环境
NODE_ENV=development

# 爬虫配置
SCRAPER_DELAY=2000
SCRAPER_TIMEOUT=30000
SCRAPER_HEADLESS=true
```

### 爬虫配置
```typescript
interface ScraperConfig {
  countries: CountryConfig[];  // 要爬取的国家列表
  timeframe: '24' | '48' | '168'; // 时间范围（小时）
  delay: number;               // 请求间隔（毫秒）
  timeout: number;             // 页面超时（毫秒）
  headless: boolean;           // 是否无头模式
  outputFormat: 'json' | 'csv'; // 输出格式
}
```

## 常见问题

### Q: 爬虫运行很慢？
A: 可以调整配置中的 `delay` 参数，但建议保持在1-3秒以避免被限制。

### Q: 某个国家没有数据？
A: 可能是该国家的Google Trends页面结构不同，或者当前没有trending数据。

### Q: 如何调试爬虫？
A: 使用 `--no-headless` 参数可以看到浏览器窗口，便于调试。

### Q: 如何批量处理多个时间段？
A: 可以编写脚本循环调用爬虫，每次使用不同的时间范围参数。

## 注意事项

1. **请求频率**：建议设置合适的请求间隔，避免被Google限制
2. **IP限制**：频繁请求可能导致IP被暂时封禁
3. **页面结构**：Google Trends页面结构可能变化，需要定期更新选择器
4. **数据准确性**：搜索量数据为Google提供的近似值，仅供参考

## 扩展开发

### 添加新国家
在 `src/config/countries.ts` 中添加配置：
```typescript
export const COUNTRIES: Record<string, CountryConfig> = {
  // 现有配置...
  TH: {
    code: 'TH',
    name: '泰国',
    language: 'th-TH'
  }
};
```

### 自定义数据解析
继承 `GoogleTrendsScraper` 类：
```typescript
class CustomScraper extends GoogleTrendsScraper {
  protected async parseTrendsFromPage(page: Page): Promise<TrendItem[]> {
    // 自定义解析逻辑
  }
}
```

### 添加数据过滤
```typescript
// 过滤商业相关趋势
const businessTrends = results[0].trends.filter(trend => 
  /stock|price|buy|sell|market|finance/i.test(trend.title)
);
```

## 下一步计划

1. **AI集成**：使用OpenAI/Claude API分析趋势的商业化意图
2. **定时任务**：实现cron job定时爬取
3. **数据存储**：集成数据库（PostgreSQL/MongoDB）
4. **监控面板**：创建Web界面显示趋势数据
5. **通知系统**：重要趋势变化时发送邮件/消息通知
