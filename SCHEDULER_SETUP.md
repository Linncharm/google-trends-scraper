# 📅 Google Trends 定时任务设置指南

本指南将帮助你在本地电脑上设置 Google Trends 爬虫的定时任务，并配置邮件发送功能。

## 🚀 快速开始

### 1. 复制并编辑配置文件

```bash
cp env.example .env
```

编辑 `.env` 文件，配置以下必要信息：

```bash
# AI 分析 API Key (可选，用于趋势分析)
GEMINI_API_KEY=your_gemini_api_key_here

# 邮件服务配置
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=recipient@example.com

# 定时任务配置
CRON_EXPRESSION=0 9 * * *
TIMEZONE=Asia/Shanghai

# 爬虫配置
SCRAPER_COUNTRIES=US,IN,ID,PK,NG,BR,MX,PH,VN,JP
```

### 2. 安装依赖并启动

```bash
# 安装依赖
npm install

# 测试运行一次
./start-scheduler.sh --once

# 启动定时任务调度器
./start-scheduler.sh
```

## 📧 邮件配置详解

### Gmail 配置示例

如果使用 Gmail 发送邮件，需要：

1. **启用两步验证**
2. **生成应用专用密码**：
   - 访问 [Google 账户设置](https://myaccount.google.com/security)
   - 搜索"应用专用密码"
   - 生成新密码并复制到 `EMAIL_PASS`

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=generated_app_password
```

### 其他邮箱服务商

| 服务商 | SMTP 主机 | 端口 | 加密 |
|--------|-----------|------|------|
| QQ邮箱 | smtp.qq.com | 587 | false |
| 163邮箱 | smtp.163.com | 587 | false |
| Outlook | smtp-mail.outlook.com | 587 | false |
| 企业邮箱 | 咨询你的邮箱管理员 | - | - |

## ⏰ 定时任务配置

### Cron 表达式说明

格式：`分钟 小时 日期 月份 星期`

```bash
# 常用示例
0 9 * * *      # 每天上午9点
0 */12 * * *   # 每12小时
0 9 * * 1      # 每周一上午9点
0 9 * * 1-5    # 工作日上午9点
30 8,20 * * *  # 每天上午8:30和晚上8:30
```

### 修改定时计划

编辑 `.env` 文件中的 `CRON_EXPRESSION`：

```bash
# 每天早上9点
CRON_EXPRESSION=0 9 * * *

# 每6小时
CRON_EXPRESSION=0 */6 * * *

# 每周一和周五上午9点
CRON_EXPRESSION=0 9 * * 1,5
```

## 🖥️ 部署选项

### 选项1: 使用内置调度器 (推荐)

这种方式会启动一个持续运行的 Node.js 进程：

```bash
# 启动调度器
./start-scheduler.sh

# 后台运行 (Linux/macOS)
nohup ./start-scheduler.sh > logs/scheduler.log 2>&1 &
```

### 选项2: 使用系统 Crontab

适合希望使用系统级别定时任务的用户：

```bash
# 1. 编辑 crontab 配置
cp crontab.example my_crontab
# 编辑 my_crontab，修改项目路径

# 2. 安装定时任务
crontab my_crontab

# 3. 查看已安装的定时任务
crontab -l

# 4. 删除定时任务
crontab -r
```

## 📊 爬虫配置

### 目标国家设置

编辑 `.env` 文件中的 `SCRAPER_COUNTRIES`：

```bash
# 十大高潜力国家
SCRAPER_COUNTRIES=US,IN,ID,PK,NG,BR,MX,PH,VN,JP

# G7国家
SCRAPER_COUNTRIES=US,GB,DE,FR,JP,CA,IT

# 自定义国家列表
SCRAPER_COUNTRIES=US,CN,JP,DE,GB
```

### 其他配置选项

```bash
# 输出格式 (csv 或 json)
SCRAPER_FORMAT=csv

# 无头模式 (true 或 false)
SCRAPER_HEADLESS=true

# 时间范围 (24小时内的趋势)
SCRAPER_TIMEFRAME=24
```

## 🔧 高级配置

### 自定义邮件模板

邮件内容在 `src/service/emailService.ts` 中的 `sendTrendsReport` 方法中定义，你可以根据需要修改。

### 日志配置

```bash
# 日志级别 (error, warn, info, debug)
LOG_LEVEL=info
```

日志文件位置：
- `logs/error.log` - 错误日志
- `logs/combined.log` - 所有日志
- `logs/cron.log` - Crontab 执行日志

### 时区设置

```bash
# 设置时区
TIMEZONE=Asia/Shanghai    # 中国时区
TIMEZONE=America/New_York # 美国东部时区
TIMEZONE=Europe/London    # 英国时区
```

## 🧪 测试和调试

### 测试邮件发送

```bash
# 立即执行一次任务，测试邮件发送
./start-scheduler.sh --once
```

### 查看日志

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 查看 Cron 日志
tail -f logs/cron.log
```

### 调试模式

临时启用调试日志：

```bash
LOG_LEVEL=debug ./start-scheduler.sh --once
```

## 🚨 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查邮箱密码是否为应用专用密码
   - 验证 SMTP 设置是否正确
   - 查看 `logs/error.log` 获取详细错误信息

2. **定时任务不执行**
   - 检查 Cron 表达式格式是否正确
   - 确认时区设置是否正确
   - 查看进程是否正在运行：`ps aux | grep scheduler`

3. **依赖安装失败**
   - 检查 Node.js 版本 (推荐 18+)
   - 清除缓存：`npm cache clean --force`
   - 删除 `node_modules` 重新安装

### 获取帮助

```bash
# 查看启动脚本帮助
./start-scheduler.sh --help

# 查看日志
tail -f logs/combined.log
```

## 📝 最佳实践

1. **定期检查日志**：设置日志轮转，避免日志文件过大
2. **备份配置**：定期备份 `.env` 配置文件
3. **监控邮件**：设置邮件过滤规则，自动整理趋势报告
4. **资源管理**：定期清理旧的 CSV 数据文件
5. **安全性**：不要将 `.env` 文件提交到版本控制系统

## 🎯 使用场景

- **个人研究**：每日获取最新趋势数据
- **商业分析**：定期监控特定市场趋势
- **内容创作**：跟踪热门话题变化
- **产品开发**：发现新的市场机会

---

🎉 **恭喜！** 你现在已经拥有一个自动化的 Google Trends 数据收集系统！
