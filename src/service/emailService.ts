import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * 邮件配置接口
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * 邮件发送选项
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

/**
 * 邮件发送服务类
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(config: EmailConfig, fromEmail: string) {
    this.fromEmail = fromEmail;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  /**
   * 验证邮件配置
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('邮件服务配置验证成功');
      return true;
    } catch (error) {
      logger.error('邮件服务配置验证失败', error);
      return false;
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`邮件发送成功`, { messageId: result.messageId, to: options.to });
      return true;
    } catch (error) {
      logger.error('邮件发送失败', error);
      return false;
    }
  }

  /**
   * 解析 CSV 文件
   */
  private parseCsvFile(csvFilePath: string): { headers: string[], rows: string[][] } {
    try {
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      
      // 改进的 CSV 解析，正确处理引号内的换行和逗号
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < csvContent.length) {
        const char = csvContent[i];
        
        if (char === '"') {
          if (inQuotes && csvContent[i + 1] === '"') {
            // 处理双引号转义 ""
            currentField += '"';
            i += 2;
            continue;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // 字段分隔符
          currentRow.push(currentField.trim());
          currentField = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          // 行分隔符（不在引号内）
          if (currentField || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(field => field.length > 0)) {
              rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
          }
          // 跳过 \r\n 组合中的第二个字符
          if (char === '\r' && csvContent[i + 1] === '\n') {
            i++;
          }
        } else if (char !== '\r') {
          // 添加字符到当前字段（跳过单独的 \r）
          if (char === '\n' && inQuotes) {
            // 在引号内的换行转换为 HTML 换行
            currentField += '<br/>';
          } else {
            currentField += char;
          }
        }
        
        i++;
      }
      
      // 处理最后一个字段和行
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
      }
      
      if (rows.length === 0) {
        return { headers: [], rows: [] };
      }

      // 第一行作为头部
      const headers = rows[0]?.map(h => h.replace(/"/g, '').trim()) || [];
      const dataRows = rows.slice(1);

      return { headers, rows: dataRows };
    } catch (error) {
      logger.error('解析 CSV 文件失败', error);
      return { headers: [], rows: [] };
    }
  }

  /**
   * 生成 HTML 表格
   */
  private generateHtmlTable(headers: string[], rows: string[][], maxRows: number = 20): string {
    if (headers.length === 0 || rows.length === 0) {
      return '<p>暂无数据</p>';
    }

    // 限制显示的行数
    const displayRows = rows.slice(0, maxRows);
    const hasMoreRows = rows.length > maxRows;

    // 表格样式
    const tableStyle = `
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    const headerStyle = `
      background-color: #f8f9fa;
      color: #333;
      font-weight: bold;
      padding: 12px 8px;
      text-align: left;
      border: 1px solid #dee2e6;
    `;

    const cellStyle = `
      padding: 8px;
      border: 1px solid #dee2e6;
      vertical-align: top;
      word-wrap: break-word;
      max-width: 300px;
      white-space: normal;
      line-height: 1.4;
    `;

    const rowEvenStyle = `background-color: #f8f9fa;`;
    const rowOddStyle = `background-color: #ffffff;`;

    // 生成表格头部
    const headerHtml = headers.map(header => 
      `<th style="${headerStyle}">${this.escapeHtml(header)}</th>`
    ).join('');

    // 生成表格行
    const rowsHtml = displayRows.map((row, index) => {
      const rowStyle = index % 2 === 0 ? rowEvenStyle : rowOddStyle;
      const cellsHtml = row.map((cell, cellIndex) => {
        let cellContent = '';
        
        // 特殊处理分数列（SaaS潜力评分）
        if (headers[cellIndex] && (headers[cellIndex].includes('潜力评分') || headers[cellIndex].includes('SaaS'))) {
          const score = parseInt(cell);
          if (!isNaN(score)) {
            let cssClass = '';
            let emoji = '';
            
            if (score >= 80) {
              cssClass = 'score-high';
              emoji = '🟢';
            } else if (score >= 60) {
              cssClass = 'score-medium-high';
              emoji = '🟡';
            } else if (score >= 40) {
              cssClass = 'score-medium';
              emoji = '🟠';
            } else {
              cssClass = 'score-low';
              emoji = '🔴';
            }
            
            cellContent = `<span class="${cssClass}" style="font-weight: bold !important; padding: 2px 6px; border-radius: 3px; display: inline-block;"><strong>${score}</strong> ${emoji}</span>`;
          } else {
            cellContent = this.escapeHtml(cell);
          }
        } else {
          // 对于非分数列，先转义HTML，但保留<br/>标签
          cellContent = this.escapeHtml(cell).replace(/&lt;br\/&gt;/g, '<br/>');
        }
        
        return `<td style="${cellStyle}">${cellContent}</td>`;
      }).join('');
      
      return `<tr style="${rowStyle}">${cellsHtml}</tr>`;
    }).join('');

    // 构建完整表格
    let tableHtml = `
      <table style="${tableStyle}">
        <thead>
          <tr>${headerHtml}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // 如果有更多行，添加说明
    if (hasMoreRows) {
      tableHtml += `
        <p style="color: #6c757d; font-style: italic; margin-top: 10px;">
          📄 显示前 ${maxRows} 条记录，共 ${rows.length} 条。完整数据请查看附件。
        </p>
      `;
    }

    return tableHtml;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    
    return text.replace(/[&<>"']/g, (match) => htmlEscapes[match] || match);
  }

  /**
   * 发送Google Trends数据报告邮件
   */
  async sendTrendsReport(
    to: string,
    csvFilePath: string,
    summary: {
      totalTrends: number;
      highPotentialCount: number;
      countries: string[];
      timeframe: string;
    }
  ): Promise<boolean> {
    try {
      // 检查CSV文件是否存在
      if (!fs.existsSync(csvFilePath)) {
        logger.error(`CSV文件不存在: ${csvFilePath}`);
        return false;
      }

      const fileName = path.basename(csvFilePath);
      const timestamp = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 解析 CSV 数据
      const { headers, rows } = this.parseCsvFile(csvFilePath);
      const tableHtml = this.generateHtmlTable(headers, rows, 15); // 显示前15条记录

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Google Trends 数据报告</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 1200px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            /* 邮件客户端兼容性样式 */
            table { 
              border-collapse: collapse !important; 
              mso-table-lspace: 0pt !important; 
              mso-table-rspace: 0pt !important; 
            }
            td { 
              mso-line-height-rule: exactly !important; 
            }
            /* 强制颜色显示 */
            .score-high { color: #28a745 !important; background-color: #d4edda !important; }
            .score-medium-high { color: #856404 !important; background-color: #fff3cd !important; }
            .score-medium { color: #fd7e14 !important; background-color: #fde2e4 !important; }
            .score-low { color: #721c24 !important; background-color: #f8d7da !important; }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 20px; 
              border-radius: 10px; 
              margin-bottom: 20px; 
            }
            .summary-card { 
              background: #f8f9fa; 
              border-left: 4px solid #007bff; 
              padding: 15px; 
              margin: 15px 0; 
              border-radius: 5px; 
            }
            .data-section { 
              margin: 30px 0; 
            }
            .section-title { 
              color: #495057; 
              border-bottom: 2px solid #e9ecef; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
            }
            .highlight { 
              background: #fff3cd; 
              padding: 10px; 
              border-radius: 5px; 
              border: 1px solid #ffeaa7; 
              margin: 10px 0; 
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e9ecef; 
              text-align: center; 
              color: #6c757d; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">📈 Google Trends 数据报告</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;"><strong>生成时间:</strong> ${timestamp}</p>
          </div>
          
          <div class="summary-card">
            <h3 style="margin-top: 0;">📊 数据概览</h3>
            <ul style="margin: 0;">
              <li><strong>总趋势数量:</strong> <span style="color: #007bff;">${summary.totalTrends}</span></li>
              <li><strong>高潜力趋势:</strong> <span style="color: #28a745;">${summary.highPotentialCount}</span></li>
              <li><strong>覆盖国家:</strong> ${summary.countries.join(', ')}</li>
              <li><strong>时间范围:</strong> ${summary.timeframe === '24' ? '过去24小时' : summary.timeframe}</li>
            </ul>
          </div>

          <div class="data-section">
            <h3 class="section-title">🔥 热门趋势数据</h3>
            ${tableHtml}
          </div>

          <div class="highlight">
            <h4 style="margin-top: 0;">📎 数据说明</h4>
            <ul style="margin-bottom: 0;">
              <li><strong>SaaS潜力评分:</strong> AI分析的商业潜力评分 (0-100分)</li>
              <li><strong>评分标准:</strong> 
                <span style="color: #28a745;">80+分</span> 高潜力 | 
                <span style="color: #ffc107;">60-79分</span> 中高潜力 | 
                <span style="color: #fd7e14;">40-59分</span> 中等潜力 | 
                <span style="color: #dc3545;">40分以下</span> 低潜力
              </li>
              <li><strong>完整数据:</strong> 请查看邮件附件 <code>${fileName}</code></li>
            </ul>
          </div>

          <div class="footer">
            <p>🤖 此邮件由 Google Trends 爬虫自动生成</p>
            <p style="font-size: 12px;">如有问题请联系系统管理员</p>
          </div>
        </body>
        </html>
      `;

      const options: EmailOptions = {
        to,
        subject: `📈 Google Trends 数据报告 - ${timestamp}`,
        html: htmlContent,
        attachments: [{
          filename: fileName,
          path: csvFilePath,
        }],
      };

      return await this.sendEmail(options);
    } catch (error) {
      logger.error('发送趋势报告邮件失败', error);
      return false;
    }
  }
}

/**
 * 从环境变量创建邮件服务实例
 */
export function createEmailServiceFromEnv(): EmailService | null {
  const requiredEnvVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
    return null;
  }

  const config: EmailConfig = {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  };

  return new EmailService(config, process.env.EMAIL_FROM!);
}
