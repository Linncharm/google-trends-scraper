#!/bin/bash

# Google Trends 定时任务启动脚本
# 使用方法：
# ./start-scheduler.sh           # 启动定时任务
# ./start-scheduler.sh --once    # 立即执行一次

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装。请先安装 Node.js (建议版本 >= 18)"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        log_warn "当前 Node.js 版本为 $NODE_VERSION，建议使用 18 或更高版本"
    else
        log_info "Node.js 版本: $NODE_VERSION ✓"
    fi
}

# 检查环境变量配置
check_env_config() {
    if [ ! -f ".env" ]; then
        log_warn ".env 文件不存在，将从 env.example 复制"
        cp env.example .env
        log_warn "请编辑 .env 文件配置你的邮箱和 API 密钥"
        exit 1
    fi
    
    # 检查必要的环境变量
    if ! grep -q "^GEMINI_API_KEY=" .env || grep -q "^GEMINI_API_KEY=your_gemini_api_key_here" .env; then
        log_warn "请在 .env 文件中配置 GEMINI_API_KEY"
    fi
    
    if grep -q "^EMAIL_ENABLED=true" .env; then
        if grep -q "^EMAIL_TO=recipient@example.com" .env || ! grep -q "^EMAIL_TO=" .env; then
            log_warn "已启用邮件功能，请在 .env 文件中配置 EMAIL_TO 收件人邮箱"
        fi
    fi
    
    log_info "环境配置检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "检查并安装依赖..."
    
    if [ ! -d "node_modules" ]; then
        log_info "安装项目依赖..."
        npm install
    else
        log_info "依赖已安装，跳过安装步骤"
    fi
}

# 编译 TypeScript
build_project() {
    log_info "编译 TypeScript 项目..."
    npm run build
    log_success "项目编译完成"
}

# 创建日志目录
create_log_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        log_info "创建日志目录: logs/"
    fi
}

# 启动定时任务
start_scheduler() {
    local RUN_ONCE=false
    
    # 检查命令行参数
    if [ "$1" = "--once" ] || [ "$1" = "-o" ]; then
        RUN_ONCE=true
    fi
    
    log_info "启动 Google Trends 定时任务调度器..."
    echo "===================="
    echo "项目目录: $PROJECT_DIR"
    echo "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "===================="
    
    if [ "$RUN_ONCE" = true ]; then
        log_info "执行模式: 立即执行一次"
        node dist/scheduler.js --run-once
    else
        log_info "执行模式: 定时任务 (按 Ctrl+C 停止)"
        node dist/scheduler.js
    fi
}

# 显示帮助信息
show_help() {
    echo "Google Trends 定时任务启动脚本"
    echo ""
    echo "使用方法:"
    echo "  $0                # 启动定时任务调度器"
    echo "  $0 --once        # 立即执行一次爬虫任务"
    echo "  $0 --help        # 显示此帮助信息"
    echo ""
    echo "配置文件:"
    echo "  .env             # 环境变量配置"
    echo "  env.example      # 配置模板"
    echo ""
    echo "定时任务配置 (在 .env 文件中):"
    echo "  CRON_EXPRESSION  # Cron 表达式，默认每天上午9点"
    echo "  EMAIL_ENABLED    # 是否启用邮件发送"
    echo "  EMAIL_TO         # 收件人邮箱"
    echo ""
    echo "示例 Cron 表达式:"
    echo "  0 9 * * *        # 每天上午9点"
    echo "  0 */12 * * *     # 每12小时"
    echo "  0 9 * * 1        # 每周一上午9点"
}

# 主程序
main() {
    # 检查帮助参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi
    
    log_info "🚀 启动 Google Trends 定时任务系统"
    
    # 执行检查和准备步骤
    check_node_version
    check_env_config
    install_dependencies
    build_project
    create_log_dir
    
    # 启动调度器
    start_scheduler "$1"
}

# 处理中断信号
trap 'log_info "接收到中断信号，正在停止..."; exit 0' INT TERM

# 执行主程序
main "$@"
