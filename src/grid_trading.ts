/*
    网格策略的计算逻辑
    基类，不负责网格的交易计算，封装统一的接口
    视图生成方法见 grid_trading_views.ts，计算辅助方法见 grid_trading_calc.ts
*/
import { Md5 } from "ts-md5/dist/md5";
import { GridTradingSettings } from "./settings"
import { PluginEnv } from "./plugin_env";
import { GridTradingCalc } from "./grid_trading_calc";
import { GridTradingViews } from "./grid_trading_views";


export class GridTrading 
{
    plugin_env: PluginEnv;
    grid_settings: GridTradingSettings;
    is_empty: boolean;
    data_md5: string;
    stock_table: string [][];
    param_table: string [][];
    trading_table: string [][];
    trading_interest: string [][];
    trading_analysis: string [][];
    trading_record: string [][];
    trading_income: string [][];
    holding_analysis: string [][];
    holding_record: string [][];
    stock_analysis: string [][];
    adjust_record: string [][];
    debug_log: string [][];
    mode_type: string;
    // 状态控制
    ctrl_status: string;
    is_debug: boolean;      // 调试数据全部忽略
    is_pause: boolean;      // 仅暂停买入监控,继续卖出监控,计入回撤数据
    is_clear: boolean;      // 已经清盘了结,等待重新开启,不计入回撤数据
    is_cancel: boolean;     // 预备取消标的,等待清盘结算,仅显示标的总览

    target_stock: number;
    stock_name: string;
    market_code: string;
    current_price: number;
    remote_current_price: number;
    target_price: number;
    empty_price: number;
    take_profit_price: number;
    clear_price: number;
    clear_avg_price: number;
    raw_trading_record: string [][];
    raw_adjust_record: string [][];
    raw_interest_record: string [][];
    clear_sell_record: Map<string, number>;
    buy_grid_record: string [];
    sgrid_step_table: string [][];
    mgrid_step_table: string [][];
    lgrid_step_table: string [][];
    force_view_grid_list: string [];

    total_retain: number;
    retain_cost: number;
    total_hold: number;
    total_cost: number;
    buy_triggered_rows: number [];
    sell_triggered_rows: number [];
    buy_monitor_rows: number [];
    sell_monitor_rows: number [];
    disable_rows: number [];

    stock_overview: string [];
    stock_buy_overview: string [][];
    stock_sell_overview: string [][];
    stock_passive_filled_record: string [][];
    stock_active_filled_record: string [][];

    constructor(plugin_env: PluginEnv)
    {
        this.plugin_env = plugin_env;
        this.grid_settings = plugin_env.grid_settings.Clone();
        this.is_empty = true;
        this.data_md5 = "";
        this.is_debug = false;
        this.is_pause = false;
        this.is_clear = false;
        this.is_cancel = false;
        this.remote_current_price = -1;
        // 所有数组字段统一初始化为空数组，避免视图打开时访问 undefined 报错
        this.debug_log = [];
        this.stock_table = [];
        this.param_table = [];
        this.trading_table = [];
        this.trading_interest = [];
        this.trading_analysis = [];
        this.trading_record = [];
        this.trading_income = [];
        this.holding_analysis = [];
        this.holding_record = [];
        this.stock_analysis = [];
        this.adjust_record = [];
        this.raw_trading_record = [];
        this.raw_adjust_record = [];
        this.raw_interest_record = [];
        this.clear_sell_record = new Map<string, number>;
        this.buy_grid_record = [];
        this.sgrid_step_table = [];
        this.mgrid_step_table = [];
        this.lgrid_step_table = [];
        this.force_view_grid_list = [];
        this.buy_triggered_rows = [];
        this.sell_triggered_rows = [];
        this.buy_monitor_rows = [];
        this.sell_monitor_rows = [];
        this.disable_rows = [];
        this.stock_buy_overview = [];
        this.stock_sell_overview = [];
        this.stock_passive_filled_record = [];
        this.stock_active_filled_record = [];
        this.stock_overview = [];
        this.total_retain = 0;
        this.retain_cost = 0;
        this.total_hold = 0;
        this.total_cost = 0;
    }

    InitGridTrading(data: string)
    {

    }

    UpdateRemotePrice(remote_price: number)
    {

    }

    DebugLog(level: string, log_str: string, extra_info: string)
    {
        this.debug_log.push([level, log_str, extra_info]);
    }

    GetTradingTitle(): string
    {
        return this.stock_name + "(" + String(this.target_stock) + ")";
    }

    IsStock(): boolean
    {
        if (this.is_empty == false && (this.market_code == "sz" || this.market_code == "sh"))
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    IsMonitor(): boolean
    {
        if (this.is_empty || this.is_debug || this.is_clear || this.is_cancel)
        {
            return false;
        }
        else
        {
            return true;
        }
    }

    ParseRawData(data: string): boolean
    {
        const new_md5 = Md5.hashStr(data);
        if (new_md5 === this.data_md5)
        {
            return false;
        }
        this.data_md5 = new_md5;
        // 159869,游戏ETF,sz,1,0.95
        const lines = data.split("\n");
        const strs = lines[0].split(",");
        this.target_stock = Number(strs[1]);
        this.stock_name = strs[2];
        this.market_code = strs[3];
        this.target_price = Number(strs[4]);
        this.current_price = Number(strs[5]);
        this.remote_current_price = this.plugin_env.GetStockRemotePrice(strs[1]);
        if (this.remote_current_price > 0)
        {
            this.current_price = this.remote_current_price;
        }
        // BASE,10000,0.67,0.005,0.001,100,0.1
        // STEP,0.05,0.05,4,0.22,0.2,2,0.52,0.5,1
        // INTEREST,2023,0.045,40
        // ADJ,2025-03-24,调整首网价格,0.756->0.856,0.567,10000
        // BUY,2024-01-23,小网0,0.760,12000
        // APY,2025-10-01,0.980,324568,0.720,13500,80%,0
        // CTRL,DEBUG
        this.is_debug = false;
        this.is_pause = false;
        this.is_clear = false;
        this.is_cancel = false;
        this.grid_settings = this.plugin_env.grid_settings.Clone();
        this.raw_trading_record = [];
        this.raw_adjust_record = [];
        this.raw_interest_record = [];
        this.buy_grid_record = [];
        this.sgrid_step_table = [];
        this.mgrid_step_table = [];
        this.lgrid_step_table = [];
        this.clear_sell_record = new Map<string, number>;
        this.force_view_grid_list = [];
        for (let idx=1; idx < lines.length; idx++)
        {
            const strs = lines[idx].split(",");
            if (strs[0] == "BUY")
            {
                this.raw_trading_record.push([strs[0], strs[1], strs[2], strs[3], strs[4]]);
                this.buy_grid_record.push(strs[2]);
            }
            if (strs[0] == "SELL")
            {
                this.raw_trading_record.push([strs[0], strs[1], strs[2], strs[3], strs[4]]);
                const i = this.buy_grid_record.indexOf(strs[2]);
                if (i >= 0) this.buy_grid_record.splice(i, 1);
            }
            if (strs[0] == "SHARE")
            {
                this.raw_trading_record.push([strs[0], strs[1], strs[2], strs[3], strs[4]]);
            }
            if (strs[0] == "BASE")
            {
                this.grid_settings.UnpackBase(strs);
            }
            if (strs[0] == "INTEREST")
            {
                this.grid_settings.UnpackInterest(strs);
            }
            if (strs[0] == "APY")
            {
                this.raw_interest_record.push([strs[1], strs[2], strs[3], strs[4], strs[5], strs[6], strs[7]]);
            }
            if (strs[0] == "SGRID")
            {
                this.sgrid_step_table.push([strs[1], strs[2], strs[3], strs[4]]);
            }
            if (strs[0] == "MGRID")
            {
                this.mgrid_step_table.push([strs[1], strs[2], strs[3], strs[4]]);
            }
            if (strs[0] == "LGRID")
            {
                this.lgrid_step_table.push([strs[1], strs[2], strs[3], strs[4]]);
            }
            if (strs[0] == "ADJ")
            {
                this.raw_adjust_record.push([strs[1], strs[2], strs[3], strs[4], strs[5]])
            }
            if (strs[0] == "VIEW")
            {
                for (let i=1; i < strs.length; i++)
                    if (strs[i].trim().length > 0)
                        this.force_view_grid_list.push(strs[i].trim())
            }
            if (strs[0] == "CTRL")
            {
                for (let i=1; i<strs.length; i++)
                {
                    if (strs[i].trim() == "DEBUG")
                    {
                        this.is_debug = true;
                    }
                    if (strs[i].trim() == "PAUSE")
                    {
                        this.is_pause = true;
                    }
                    if (strs[i].trim() == "CLEAR")
                    {
                        this.is_clear = true;
                    }
                    if (strs[i].trim() == "CANCEL")
                    {
                        this.is_cancel = true;
                    }
                }
            }
        }
        return true;
    }
}

// mixin 声明合并：让 GridTrading 类型拥有视图生成与计算辅助方法
export interface GridTrading extends GridTradingCalc, GridTradingViews {}

function applyMixins(derivedCtor: any, baseCtors: any[])
{
    baseCtors.forEach(baseCtor =>
    {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name =>
        {
            if (name === "constructor")
            {
                return;
            }
            Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
        });
    });
}

applyMixins(GridTrading, [GridTradingCalc, GridTradingViews]);
