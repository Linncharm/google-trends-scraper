# 🚀 Google Trends 启动器使用指南

现在你有了两个便捷的启动器，类似于 `launch.ts` 的风格！

## 📁 新增文件

- `scheduler-launch.ts` - 定时任务启动器
- `test-email.ts` - 邮件测试工具

## 🎯 快速使用

### 1. 启动定时任务调度器

```bash
npm run scheduler:launch
# 或者
bun scheduler-launch.ts
```

**特点**：
- 🔄 自动挂在后台运行
- 📊 预设多种监控场景
- 🎨 美观的控制台输出
- ⚙️ 自动配置验证

### 2. 测试邮件发送功能

```bash
npm run test:email
# 或者
bun test-email.ts
```

**特点**：
- ⚡ 立即测试模式（模拟数据）
- ⏰ 延迟测试模式（2分钟后执行真实爬虫）
- 🕒 可视化倒计时
- 📧 完整的邮件发送流程测试

## 📋 定时任务预设场景

在 `scheduler-launch.ts` 中提供了5种预设场景：

### 🔥 高频监控（推荐用于重要项目）
```typescript
const highFrequencyScenario = {
  cronExpression: '0 */6 * * *', // 每6小时
  countries: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
  // ...
};
```

### 📅 标准监控（推荐日常使用）
```typescript
const standardScenario = {
  cronExpression: '0 9 * * *', // 每天上午9点
  countries: ['US', 'IN', 'ID', 'PK', 'NG', 'BR', 'MX', 'PH', 'VN', 'JP'],
  // ...
};
```

### 🌍 G7国家监控
```typescript
const g7Scenario = {
  cronExpression: '0 8 * * *', // 每天上午8点
  countries: ['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'IT'],
  // ...
};
```

### 💼 工作日监控
```typescript
const weekdayScenario = {
  cronExpression: '0 9 * * 1-5', // 工作日上午9点
  countries: ['US', 'CN', 'JP', 'DE', 'GB'],
  // ...
};
```

### 🧪 测试场景
```typescript
const testScenario = {
  cronExpression: '*/2 * * * *', // 每2分钟
  countries: ['US'], // 只爬取美国
  // ...
};
```

## 🛠️ 自定义配置

### 修改定时任务场景

编辑 `scheduler-launch.ts` 文件：

```typescript
// 找到这一行，修改为你想要的场景
const scenarioToRun = standardScenario; // 改为其他场景
```

### 修改邮件测试模式

编辑 `test-email.ts` 文件：

```typescript
// 选择测试模式
const testScenario = delayedTestConfig; // 2分钟后执行
// 或者
const testScenario = immediateTestConfig; // 立即发送测试邮件
// 或者
const testScenario = customDelayConfig; // 自定义延迟时间
```

### 自定义延迟时间

```typescript
const customDelayConfig = {
  mode: 'delayed' as const,
  delayMinutes: 5, // 修改为你想要的分钟数
  scraperConfig: {
    countries: ['US', 'JP', 'DE'], // 添加更多国家
    // ...
  },
};
```

## 🎨 运行效果预览

### 定时任务启动器
```
🚀 Google Trends 定时任务启动器
==========================================
📅 Cron表达式: 0 9 * * *
🌍 监控国家: US, IN, ID, PK, NG, BR, MX, PH, VN, JP
📊 输出格式: CSV
⏰ 时间范围: 24小时
🕒 时区: Asia/Shanghai
📧 邮件发送: 启用
📮 收件人: your_email@example.com
==========================================
⏱️  执行频率: 每天上午9点

🎯 按 Ctrl+C 停止定时任务
📝 日志位置: logs/combined.log
==========================================

✅ 配置验证通过
🔄 正在启动定时任务调度器...
```

### 邮件测试工具
```
📧 Google Trends 邮件测试工具
==========================================
🧪 测试模式: 2分钟后执行爬虫并发送真实数据
⏰ 延迟时间: 2分钟
🌍 爬取国家: US
📊 输出格式: CSV
📮 收件人: your_email@example.com
📤 发件人: your_email@gmail.com
==========================================

✅ 邮件配置验证通过
✅ 邮件服务连接成功

⏳ 开始倒计时...
⏰ 还有 1:59 开始执行爬虫
```

## 🔍 故障排除

### 常见问题

1. **启动失败 - 缺少环境变量**
   ```
   ❌ 错误：缺少必要的环境变量 -> EMAIL_HOST, EMAIL_TO
   ```
   **解决方案**：检查 `.env` 文件配置

2. **邮件连接失败**
   ```
   ❌ 邮件服务连接失败
   ```
   **解决方案**：
   - 检查邮箱密码是否为应用专用密码
   - 验证 SMTP 设置
   - 确认网络连接

3. **国家代码无效**
   ```
   ❌ 错误：无效的国家代码 -> XX, YY
   ```
   **解决方案**：使用有效的国家代码（US, CN, JP 等）

### 调试技巧

1. **查看实时日志**：
   ```bash
   tail -f logs/combined.log
   ```

2. **测试邮件配置**：
   ```bash
   npm run test:email
   ```

3. **验证 Cron 表达式**：
   使用在线工具验证 Cron 表达式是否正确

## 🎉 使用建议

1. **首次使用**：
   - 先运行 `npm run test:email` 测试邮件功能
   - 确认无误后再启动定时任务

2. **生产环境**：
   - 使用 `standardScenario` 或 `weekdayScenario`
   - 定期检查日志文件
   - 设置邮件过滤规则

3. **开发测试**：
   - 使用 `testScenario` 进行快速测试
   - 修改 `delayMinutes` 适应测试需求

---

🎯 **现在你可以像使用 `launch.ts` 一样简单地启动定时任务系统了！**
