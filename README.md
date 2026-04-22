# codes-trading-strategy

## 项目概述

这是一个 **Obsidian 插件项目**，名为 `codes-trading-strategy`，主要用于**网格交易策略**的管理和可视化。插件使用 TypeScript 开发，结合 Python 工具集进行数据分析和处理。

## 技术栈

- **前端框架**：Obsidian 插件 API
- **开发语言**：TypeScript (主要) + JavaScript + Python (工具脚本)
- **构建工具**：esbuild (通过 `esbuild.config.mjs` 配置)
- **依赖管理**：npm (package.json)
- **关键依赖**：
  - `obsidian`：Obsidian 插件开发核心库
  - `danfojs`：数据操作库 (类似 pandas)
  - `ts-md5`：MD5 哈希计算

## 核心模块结构

```
src/
├── main.ts                 # 插件入口，生命周期管理
├── plugin_env.ts           # 运行时环境，全局状态管理
├── settings.ts             # 配置管理，网格参数定义
├── grid_trading.ts         # 网格交易策略基类 (1027行)
├── grid_trading_m1.ts      # 网格交易模式1实现
├── grid_trading_m2.ts      # 网格交易模式2实现
├── grid_trading_m3.ts      # 网格交易模式3实现
├── drip_trading.ts         # 定投策略实现
├── grid_view.ts            # 网格交易详情视图
├── grid_overview.ts        # 网格交易总览视图
├── drip_view.ts            # 定投策略视图
├── cor_view.ts             # 相关性分析视图
├── remote_util.ts          # 远程数据获取工具
├── mymath.ts               # 数学计算工具
├── command_util.ts         # 命令处理工具
├── lang_str.ts             # 多语言字符串管理
└── quant_data.ts           # 量化数据处理
```

## 插件架构

### 入口与生命周期 ([`main.ts`](src/main.ts:1))

- **插件类**：`TradingStrategy` 继承自 `Plugin`
- **初始化**：
  - 加载配置 ([`LoadSettingsFromDisk`](src/main.ts:71))
  - 注册视图类型 (GTV, GTO, COR, DTV)
  - 设置定时任务 ([`FetchAllStockCurrentPrice`](src/main.ts:90)) 每秒执行
  - 添加设置面板和工具栏图标

### 运行时环境 ([`plugin_env.ts`](src/plugin_env.ts:1))

- **核心状态**：
  - `grid_trading_dict`：网格交易实例映射
  - `drip_trading_dict`：定投交易实例映射
  - `stock_remote_price_dict`：股票远程价格缓存
  - `event_callback_dict`：事件回调管理
- **工厂方法**：[`GetGridTradingTypeByString`](src/plugin_env.ts:62) 根据模式返回对应的网格交易类

### 配置系统 ([`settings.ts`](src/settings.ts:1))

- **分层配置**：默认全局参数 ← 自定义全局参数 ← 自定义标的参数
- **配置类**：
  - `PluginBaseSettings`：基础设置 (API许可证等)
  - `GridTradingSettings`：网格交易参数 (网格大小、最大跌幅等)
- **序列化**：[`PackSettings`](src/settings.ts:20)/[`UnpackSettings`](src/settings.ts:34) 用于配置持久化

## 网格交易策略实现

### 策略基类 ([`grid_trading.ts`](src/grid_trading.ts:1))

- **核心数据结构**：
  - `stock_table`：股票信息表
  - `param_table`：参数表
  - `trading_table`：交易表
  - `trading_record`：交易记录
  - `holding_analysis`：持仓分析
- **状态控制**：
  - `is_debug`：调试模式
  - `is_pause`：暂停买入
  - `is_clear`：已清盘
  - `is_cancel`：预备取消
- **关键方法**：
  - 价格计算、网格生成、交易信号检测
  - 收益分析、持仓管理

### 三种交易模式

- **模式1** ([`grid_trading_m1.ts`](src/grid_trading_m1.ts:1))：基础网格策略
- **模式2** ([`grid_trading_m2.ts`](src/grid_trading_m2.ts:1))：进阶网格策略
- **模式3** ([`grid_trading_m3.ts`](src/grid_trading_m3.ts:1))：高级网格策略

## 视图层架构

### 视图类型

| 视图类型 | 文件 | 功能 |
|---------|------|------|
| GTV | [`grid_view.ts`](src/grid_view.ts:1) | 网格交易详情展示 |
| GTO | [`grid_overview.ts`](src/grid_overview.ts:1) | 网格交易总览 |
| DTV | [`drip_view.ts`](src/drip_view.ts:1) | 定投策略展示 |
| COR | [`cor_view.ts`](src/cor_view.ts:1) | 相关性分析 |

### 视图实现模式

- 继承 `TextFileView` (Obsidian API)
- 通过 `setViewData` 接收数据并刷新视图
- 使用 HTML 表格展示数据，支持颜色标记不同状态

## 数据流与外部集成

### 数据获取

- **定时任务**：每秒调用 [`FetchAllStockCurrentPrice`](src/main.ts:90)
- **数据源**：通过 [`remote_util.ts`](src/remote_util.ts:1) 从新浪财经等API获取实时价格
- **缓存机制**：`price_cache` 和 `hist_cache` 减少重复请求

### Python 工具集 (`pytools/`)

| 脚本 | 功能 |
|------|------|
| `calculator.py` | 计算器工具 |
| `deepseekok2.py` | DeepSeek API 集成 |
| `fetch_history_db.py` | 历史数据获取 |
| `format_current_price.py` | 当前价格格式化 |
| `format_drip_trading.py` | 定投数据格式化 |
| `format_index_history.py` | 指数历史数据处理 |
| `grid_price.py` | 网格价格计算 |
| `holding_analysis.py` | 持仓分析 |
| `index_analysis.py` | 指数分析 |
| `okdata.py` | OKX 数据获取 |

## 架构特点

1. **模块化设计**：清晰的职责分离 (数据、逻辑、视图)
2. **策略模式**：通过继承实现不同网格交易模式
3. **事件驱动**：使用回调机制处理异步数据更新
4. **配置分层**：支持全局和标的级别的参数覆盖
5. **工具链完整**：TypeScript 主程序 + Python 辅助工具

## 关键文件说明

- [`manifest.json`](manifest.json:1)：Obsidian 插件清单
- [`package.json`](package.json:1)：npm 依赖和脚本
- [`tsconfig.json`](tsconfig.json:1)：TypeScript 配置
- [`esbuild.config.mjs`](esbuild.config.mjs:1)：构建配置

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 版本更新

```bash
npm run version
```
