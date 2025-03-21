/*
    网格策略的计算逻辑
    基类，不负责网格的交易计算，封装统一的接口
*/
import { Md5 } from "ts-md5/dist/md5";
import { GridTradingSettings, GRID_COLOR_STOCK_OVERVIEW, GRID_COLOR_BUY_OVERVIEW, GRID_COLOR_SELL_OVERVIEW } from "./settings"
import { PERFIT_TYPE_NAME_STR } from "./lang_str";
import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap, TimeDuarion, AveragePriceStr, FixedPrice, ToPercentStr, ProportionPctStr } from "./mymath";
import { PluginEnv } from "./plugin_env";
import { DebugLog } from "./remote_util";


export class GridTrading 
{
    plugin_env: PluginEnv;
    grid_settings: GridTradingSettings;
    is_empty: boolean;
    is_debug: boolean;
    data_md5: string;
    stock_table: string [][];
    param_table: string [][];
    trading_table: string [][];
    trading_analysis: string [][];
    trading_record: string [][];
    trading_income: string [][];
    holding_analysis: string [][];
    holding_record: string [][];
    stock_analysis: string [][];
    debug_log: string [][];
    mode_type: string;

    target_stock: number;
    stock_name: string;
    market_code: string;
    current_price: number;
    remote_current_price: number;
    target_price: number;
    empty_price: number;
    clear_price: number;
    clear_avg_price: number;
    raw_trading_record: string [][];
    clear_sell_record: Map<string, number>;
    buy_grid_record: string [];
    sgrid_step_table: string [][];
    mgrid_step_table: string [][];
    lgrid_step_table: string [][];

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
        this.debug_log = []
        this.data_md5 = "";
        this.is_empty = true;
        this.is_debug = false;
        this.remote_current_price = -1;
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

    InitTradingOverview()
    {
        this.stock_overview = [GRID_COLOR_STOCK_OVERVIEW, String(this.target_stock), this.stock_name, this.target_price.toFixed(3), this.current_price.toFixed(3),
                ToPercent(this.current_price / this.target_price, 1), String(this.total_hold), String(this.total_cost),
                ToTradingGap(this.total_cost, this.total_hold * this.current_price, 2), this.trading_income[5][10]];
        this.stock_buy_overview = [];
        if (this.buy_monitor_rows.length > 0)
        {
            for (let idx=0; idx<this.buy_monitor_rows.length; idx++)
            {
                const row = this.buy_monitor_rows[idx];
                const trading_gap = ToTradingGap(this.current_price, Number(this.trading_table[row][3]), 2);
                this.stock_buy_overview.push([GRID_COLOR_BUY_OVERVIEW, String(this.target_stock), this.stock_name, this.trading_table[row][0], this.trading_table[row][1],
                        this.trading_table[row][2], this.trading_table[row][3], this.trading_table[row][4], this.trading_table[row][5], trading_gap]);
            }
        }
        this.stock_sell_overview = [];
        if (this.sell_monitor_rows.length > 0)
        {
            for (let idx=0; idx<this.sell_monitor_rows.length; idx++)
            {
                const row = this.sell_monitor_rows[idx];
                const trading_gap = ToTradingGap(this.current_price, Number(this.trading_table[row][7]), 2);
                this.stock_sell_overview.push([GRID_COLOR_SELL_OVERVIEW, String(this.target_stock), this.stock_name, this.trading_table[row][0], this.trading_table[row][1],
                        this.trading_table[row][6], this.trading_table[row][7], this.trading_table[row][8], this.trading_table[row][9], trading_gap]);
            }
        }
        if (this.stock_active_filled_record.length > 0)
        {
            // "标的代号", "标的名称", "网格种类", "交易日期", "买入价格", "买入份数", "买入金额", "当前价格", "持仓收益", "卖出份数", "累积筹码"
            for (let idx=0; idx<this.stock_active_filled_record.length; idx++)
            {
                const row = this.stock_active_filled_record[idx];
                row[8] = String(this.current_price);
                row[9] = ToTradingGap(Number(row[5]), this.current_price);
                row[10] = String(MyCeil(Number(row[7]) / this.current_price, this.grid_settings.MIN_BATCH_COUNT));
                row[11] = String(Number(row[6]) - Number(row[10]));
            }
        }

        if (this.stock_passive_filled_record.length > 0)
        {
            // "标的代号", "标的名称", "网格种类", "价格档位", "买入价格", "买入份数", "买入金额", "当前价格", "当前跌幅", "卖出价格", "卖出涨幅"
            for (let idx=0; idx<this.stock_passive_filled_record.length; idx++)
            {
                const row = this.stock_passive_filled_record[idx];
                const grid_row = this.FindTradingGridRow(row[3]);
                if (grid_row.length > 0)
                {
                    row[3] = grid_row[0];
                    row[4] = grid_row[1];
                    row[5] = grid_row[3];
                    row[6] = grid_row[4];
                    row[7] = grid_row[5];
                    row[8] = String(this.current_price);
                    row[9] = ToTradingGap(Number(row[5]), this.current_price);
                    row[10] = grid_row[7];
                    row[11] = ToTradingGap(this.current_price, Number(row[10]));
                }
            }
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
        if (this.stock_name == "DEBUGTEST")
        {
            this.is_debug = true;
        }
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
        // BUY,2024-01-23,小网0
        this.grid_settings = this.plugin_env.grid_settings.Clone();
        this.raw_trading_record = [];
        this.buy_grid_record = [];
        this.sgrid_step_table = [];
        this.mgrid_step_table = [];
        this.lgrid_step_table = [];
        this.clear_sell_record = new Map<string, number>;
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
                this.buy_grid_record.remove(strs[2]);
            }
            if (strs[0] == "SHARE")
            {
                this.raw_trading_record.push([strs[0], strs[1], strs[2], strs[3], strs[4]]);
            }
            if (strs[0] == "BASE")
            {
                this.grid_settings.UnpackBase(strs);
            }
            if (strs[0] == "STEP")
            {
                this.grid_settings.UnpackStep(strs);
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
        }
        return true;
    }

    InitStockTable()
    {
        // 最高卖出价为清网价
        this.empty_price = FixedPrice(this.target_price, 1.0 + this.grid_settings.SGRID_STEP_PCT, this.grid_settings.TRADING_PRICE_PRECISION);
        for (let idx=1; idx<this.trading_table.length; idx++)
        {
            if (Number(this.trading_table[idx][7]) > this.empty_price)
            {
                this.empty_price = Number(this.trading_table[idx][7]);
            }
        }
        // 清仓平均价与清仓最高价
        const clear_pct = this.grid_settings.CLEAR_STEP_PCT;
        this.clear_avg_price = Number(((this.CalcClearPrice(clear_pct, 1) + this.CalcClearPrice(clear_pct, 2) + this.CalcClearPrice(clear_pct, 3)) / 3).toFixed(this.grid_settings.TRADING_PRICE_PRECISION));
        this.clear_price = this.CalcClearPrice(clear_pct, 3);
        const mini_price = FixedPrice(this.target_price, this.grid_settings.MINIMUM_BUY_PCT, this.grid_settings.TRADING_PRICE_PRECISION);
        const bottom_price = FixedPrice(this.target_price, this.grid_settings.BOTTOM_BUY_PCT, this.grid_settings.TRADING_PRICE_PRECISION);
        this.stock_table = [
            ["标的代号", String(this.target_stock)],
            ["标的名称", this.stock_name],
            ["网格模式", this.mode_type],
            ["首网价格", String(this.target_price)],
            ["当前价格", String(this.current_price), "价格百分位", ToPercent(this.current_price / this.target_price, 1)],
            ["回调价格", String(bottom_price), "价格百分位", ToPercent(this.grid_settings.BOTTOM_BUY_PCT, 1)],
            ["最低价格", String(mini_price), "价格百分位", ToPercent(this.grid_settings.MINIMUM_BUY_PCT, 1)],
            ["停格跌幅", ToTradingGap(this.current_price, mini_price), "清格涨幅", ToTradingGap(this.current_price, this.empty_price, 1)],
        ];
    }

    InitGridParam()
    {
        this.param_table = [
            ["首网目标金额", String(this.grid_settings.ONE_GRID_LIMIT), "最大回撤值", ToPercent(this.grid_settings.MAX_SLUMP_PCT), "最大涨跌幅", ToPercent(this.grid_settings.MAX_RISE_PCT)],
            ["触发价加点", String(this.grid_settings.TRIGGER_ADD_POINT), "每手份数额", String(this.grid_settings.MIN_BATCH_COUNT), "交易价精度", String(this.grid_settings.TRADING_PRICE_PRECISION)],
            ["小网步进值", ToPercent(this.grid_settings.SGRID_STEP_PCT), "中网步进值", ToPercent(this.grid_settings.MGRID_STEP_PCT), "大网步进值", ToPercent(this.grid_settings.LGRID_STEP_PCT)],
            ["投入追加值", ToPercent(this.grid_settings.SGRID_ADD_PCT), "投入追加值", ToPercent(this.grid_settings.MGRID_ADD_PCT), "投入追加值", ToPercent(this.grid_settings.LGRID_ADD_PCT)],
            ["保留利润数", String(this.grid_settings.SGRID_RETAIN_COUNT), "保留利润数", String(this.grid_settings.MGRID_RETAIN_COUNT), "保留利润数", String(this.grid_settings.LGRID_RETAIN_COUNT)],
        ];
    }

    InitTradingAnalysis()
    {
        const price = this.target_price;
        const rise_pct = this.grid_settings.SGRID_STEP_PCT;
        const table:Array<Array<string>> = this.trading_table;
        function Analysis(slump_pct: number) 
        {
            let total_cost = 0;
            let total_amount = 0;
            let total_sell = 0;
            let total_gain = 0;
            const min_price = price * (1 - slump_pct);
            const max_price = price * (1 + rise_pct);

            table.forEach((row:Array<string>, i:number) =>
            {
                if (i > 0 && ToNumber(row[1]) >= 1.0 - slump_pct)
                {
                    total_cost = total_cost + Number(row[5]);
                    total_amount = total_amount + Number(row[4]);
                    total_gain = total_gain + Number(row[9]);
                    total_sell = total_sell + Number(row[8]);
                }
            });
            const cost_price = (total_cost - total_gain) / (total_amount - total_sell);
            const gain_money = Math.floor(max_price * (total_amount - total_sell) - (total_cost - total_gain));
            return [ToPercent(slump_pct) + "(" + min_price.toFixed(3) + ")",
                    String(total_cost), String(total_amount), String(Math.ceil(total_amount * min_price)),
                    (total_cost/total_amount).toFixed(3), String(Math.ceil(total_cost - total_amount * min_price)),
                    ((total_cost - total_amount * min_price) / total_cost * 100).toFixed(2) + "%",
                    ((total_cost / total_amount - min_price) / min_price * 100).toFixed(2) + "%",
                    String(total_amount - total_sell), String(Math.floor(max_price * (total_amount - total_sell))), String(total_cost - total_gain),
                    cost_price.toFixed(3), ((max_price - cost_price) / cost_price * 100).toFixed(2) + "%", String(gain_money), (gain_money / total_cost * 100).toFixed(2) + "%"];
        }

        this.trading_analysis = [
            ["亏损分析", "回撤比例"],
            ["", "投入资金"],
            ["", "持仓份额"],
            ["", "持仓金额"],
            ["", "持仓成本"],
            ["", "亏损金额"],
            ["", "亏损比例"],
            ["", "所需涨幅"],
            ["反弹盈利", "持仓份额"],
            [(price * (1 + rise_pct)).toFixed(3), "持仓金额"],
            ["", "占用本金"],
            ["", "持仓成本"],
            ["", "浮盈比例"],
            ["", "网格盈利"],
            ["", "总浮盈比"],
        ];

        const slump_pcts: number [] = [20, 30, 40, 50, 60, 70, 80];
        for (const pct of slump_pcts)
        {
            const result = Analysis(pct / 100.0);
            for (let idx=0; idx<result.length; idx++)
            {
                this.trading_analysis[idx].push(result[idx]);
            }
        }
    }

    InitTradingRecord()
    {
        this.total_retain = 0;
        this.retain_cost = 0;
        this.total_cost = 0;
        this.total_hold = 0;
        this.trading_record = [["交易方向", "交易日期", "网格类型", "交易价格", "交易股数", "消耗本金", "累积筹码", "持仓时长"]];
        this.stock_passive_filled_record = [];
        this.stock_active_filled_record = [];
        this.holding_record = [];
        let raw_record = [... this.raw_trading_record];
        let cursor = 0;
        let retain_sell = 0;
        while (cursor < raw_record.length)
        {
            if (raw_record[cursor][0] == "BUY")
            {
                let scursor = -1;
                for (let idx=cursor; idx<raw_record.length; idx++)
                {
                    if (raw_record[idx][0] == "SELL" && raw_record[idx][2] == raw_record[cursor][2])
                    {
                        scursor = idx;
                        break;
                    }
                }
                if (scursor >= 0)
                {
                    // 计算保留份数/占用本金/持仓时间
                    const retain_count = Math.floor(Number(raw_record[cursor][4]) - Number(raw_record[scursor][4]));
                    const cost_count = Math.floor(Number(raw_record[cursor][3]) * Number(raw_record[cursor][4]) - Number(raw_record[scursor][3]) * Number(raw_record[scursor][4]));
                    const time_d = TimeDuarion(raw_record[cursor][1], raw_record[scursor][1]);
                    this.total_retain = this.total_retain + retain_count;
                    this.retain_cost = this.retain_cost + cost_count;
                    // 记录成对的买卖记录
                    this.trading_record.push([raw_record[cursor][0], raw_record[cursor][1], raw_record[cursor][2], raw_record[cursor][3], raw_record[cursor][4], String(cost_count)]);
                    this.trading_record.push([raw_record[scursor][0], raw_record[scursor][1], raw_record[scursor][2], raw_record[scursor][3], raw_record[scursor][4], "--", String(retain_count), String(time_d)+"天"]);
                    raw_record.splice(cursor, 1);
                    raw_record.splice(scursor - 1, 1);
                }
                else
                {
                    cursor++;
                }
            }
            else
            {
                cursor++;
            }
        }
        for (let idx=0; idx<raw_record.length; idx++)
        {
            if (raw_record[idx][0] == "BUY")
            {
                const cost_count = Math.floor(Number(raw_record[idx][3]) * Number(raw_record[idx][4]));
                this.trading_record.push([raw_record[idx][0], raw_record[idx][1], raw_record[idx][2], raw_record[idx][3], raw_record[idx][4], String(cost_count)]);
                this.total_cost = this.total_cost + cost_count;
                if (Number(raw_record[idx][3]) > 0)
                {
                    this.total_hold = this.total_hold + Number(raw_record[idx][4]);
                    this.holding_record.push([raw_record[idx][0], raw_record[idx][1], raw_record[idx][2], raw_record[idx][3], raw_record[idx][4]]);
                }
                if (Number(raw_record[idx][3]) == 0)
                {
                    this.stock_passive_filled_record.push([GRID_COLOR_BUY_OVERVIEW, String(this.target_stock), this.stock_name, raw_record[idx][2], "", "", "", "", "", "", "", ""])
                }
                if (raw_record[idx][2].startsWith("补仓"))
                {
                    this.stock_active_filled_record.push([GRID_COLOR_SELL_OVERVIEW, String(this.target_stock), this.stock_name, raw_record[idx][2], raw_record[idx][1], raw_record[idx][3], raw_record[idx][4], String(cost_count), "", "", ""])
                }
            }
            else
            {
                if (raw_record[idx][0] == "SHARE")
                {
                    if (raw_record[idx][2] == "红利")
                    {
                        const gain_count = Math.floor(Number(raw_record[idx][3]) * Number(raw_record[idx][4]));
                        this.trading_record.push([raw_record[idx][0], raw_record[idx][1], raw_record[idx][2], raw_record[idx][3], raw_record[idx][4], "-" + String(gain_count)]);
                        this.retain_cost = this.retain_cost - gain_count;
                    }
                    if (raw_record[idx][2] == "拆股")
                    {
                        this.trading_record.push([raw_record[idx][0], raw_record[idx][1], raw_record[idx][2], raw_record[idx][3], raw_record[idx][4], "--", raw_record[idx][4]]);
                        this.total_retain = this.total_retain + Number(raw_record[idx][4]);
                    }
                }
                else
                {
                    if (raw_record[idx][0] == "SELL" && raw_record[idx][2].startsWith("利润"))
                    {
                        this.total_retain = this.total_retain - Number(raw_record[idx][4]);
                        this.retain_cost = this.retain_cost - Number(raw_record[idx][3]) * Number(raw_record[idx][4]);
                        retain_sell = retain_sell + Number(raw_record[idx][4]);
                        let sell_count = this.clear_sell_record.get(raw_record[idx][2]);
                        if (sell_count == undefined)
                        {
                            sell_count = 0;
                        }
                        this.clear_sell_record.set(raw_record[idx][2], sell_count + Number(raw_record[idx][4]));
                    }
                    this.trading_record.push([raw_record[idx][0], raw_record[idx][1], raw_record[idx][2], raw_record[idx][3], raw_record[idx][4]]);
                }
            }
        }
        this.total_hold = this.total_hold + this.total_retain;
        this.total_cost = this.total_cost + this.retain_cost;
        if (this.total_cost != 0)
        {
            this.trading_record.push(["Cost", "", "", "", "", String(this.total_cost), "", ""]);
        }
        if (this.total_retain  <= 0)
        {
            if (this.total_hold > 0)
            {
                this.trading_record.push(["Retain", "", "", "", String(this.total_hold), "",  "0", ""]);
            }
            return;
        }
        this.trading_record.push(["Retain", "", "", "", String(this.total_hold), "",  String(this.total_retain), ""]);
        const current_pct = MyCeil(this.current_price / this.target_price, 0.001);
        for (let index=1; index<=3; index++)
        {
            const row = this.GenerateClearRow(PERFIT_TYPE_NAME_STR, index, this.grid_settings.CLEAR_STEP_PCT, MyFloor((this.total_retain + retain_sell) / 3, 100));
            this.trading_table.push(row);
            if (current_pct + this.grid_settings.MAX_RISE_PCT >= ToNumber(row[1]))
            {
                this.sell_monitor_rows.push(this.trading_table.length - 1);
            }
            this.sell_triggered_rows.push(this.trading_table.length - 1);
        }
    }

    InitTradingIncome()
    {
        this.trading_income = [];
        this.trading_income.push(["", "持仓股数", "占用本金", "持仓金额", "持仓均价", "实际价格", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]);
        this.trading_income.push(this.GenerateIncomeRow("累计筹码", this.total_retain, this.retain_cost, this.current_price, this.retain_cost, 0, 0));

        // 当前持仓
        this.CalcTradingIncome("当前", this.current_price / this.target_price, this.empty_price, this.clear_avg_price, this.clear_price, false);
        // 短期回调
        this.CalcTradingIncome("回调", this.grid_settings.BOTTOM_BUY_PCT, this.empty_price, this.clear_avg_price, this.clear_price);
        // 最大回撤
        this.CalcTradingIncome("最大", this.grid_settings.MINIMUM_BUY_PCT, this.empty_price, this.clear_avg_price, this.clear_price);
    }

    InitHoldingAnalysis()
    {
        const total_hold = this.total_hold;
        const total_cost = this.total_cost;
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;

        this.holding_analysis = [];
        this.holding_analysis.push(["筹码类型", "持仓股数", "占用本金", "持仓金额", "持仓均价", "当前价格", "持仓盈亏", "清格盈利", "清仓盈利", "持仓占比", "本金占比"]);
        // 总额
        this.holding_analysis.push(["总额",]);
        // 小网
        this.CalcHoldingPercent("小网", this.empty_price, this.clear_avg_price);
        // 中网
        this.CalcHoldingPercent("中网", this.empty_price, this.clear_avg_price);
        // 大网
        this.CalcHoldingPercent("大网", this.empty_price, this.clear_avg_price);
        // 累积
        let grid_total_hold = this.total_retain;
        let grid_total_cost = this.retain_cost;
        let grid_current_value = Math.floor(grid_total_hold * this.current_price);
        let grid_empty_income = grid_total_hold * this.empty_price - grid_total_cost;
        let grid_clear_income = grid_total_hold * this.clear_avg_price - grid_total_cost;
        this.holding_analysis.push(["累积", String(grid_total_hold), String(grid_total_cost), String(grid_current_value),
                AveragePriceStr(grid_total_cost, grid_total_hold, precision), this.current_price.toFixed(precision),
                String(grid_current_value - grid_total_cost), grid_empty_income.toFixed(0), grid_clear_income.toFixed(0), 
                ProportionPctStr(grid_total_hold, total_hold, 2), ProportionPctStr(grid_total_cost, total_cost, 2)]);
        // 补仓
        grid_total_hold = 0;
        grid_total_cost = 0;
        for (let idx=0; idx<this.holding_record.length; idx++)
        {
            if (this.holding_record[idx][2].startsWith("补仓"))
            {
                grid_total_hold += Number(this.holding_record[idx][4]);
                grid_total_cost += Number(this.holding_record[idx][3]) * Number(this.holding_record[idx][4]);
            }
        }
        grid_total_cost = Math.ceil(grid_total_cost);
        grid_current_value = Math.floor(grid_total_hold * this.current_price);
        grid_empty_income = grid_total_hold * this.empty_price - grid_total_cost;
        grid_clear_income = grid_total_hold * this.clear_avg_price - grid_total_cost;
        this.holding_analysis.push(["补仓", String(grid_total_hold), String(grid_total_cost), String(grid_current_value),
                AveragePriceStr(grid_total_cost, grid_total_hold, precision), this.current_price.toFixed(precision),
                String(grid_current_value - grid_total_cost), grid_empty_income.toFixed(0), grid_clear_income.toFixed(0), 
                ProportionPctStr(grid_total_hold, total_hold, 2), ProportionPctStr(grid_total_cost, total_cost, 2)]);
        // 总额
        grid_total_hold = 0;
        grid_total_cost = 0;
        grid_current_value = 0;
        grid_empty_income = 0;
        grid_clear_income = 0;
        for (let idx=2; idx<this.holding_analysis.length; idx++)
        {
            grid_total_hold += Number(this.holding_analysis[idx][1]);
            grid_total_cost += Number(this.holding_analysis[idx][2]);
            grid_current_value += Number(this.holding_analysis[idx][3]);
            grid_empty_income += Number(this.holding_analysis[idx][7]);
            grid_clear_income += Number(this.holding_analysis[idx][8]);
        }
        this.holding_analysis[1] = ["总额", String(grid_total_hold), String(grid_total_cost), String(grid_current_value),
                AveragePriceStr(grid_total_cost, grid_total_hold, precision), this.current_price.toFixed(precision),
                String(grid_current_value - grid_total_cost), grid_empty_income.toFixed(0), grid_clear_income.toFixed(0), 
                ProportionPctStr(grid_total_hold, total_hold, 2), ProportionPctStr(grid_total_cost, total_cost, 2)];
    }

    CalcHoldingPercent(grid_type: string, empty_price: number, clear_avg_price: number)
    {
        const total_hold = this.total_hold;
        const total_cost = this.total_cost;
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        
        let grid_total_hold = 0; // 持仓股数
        let grid_total_cost = 0; // 占用本金
        let grid_empty_income = 0; // 清格盈利
        let grid_clear_income = 0; // 清仓盈利
        for (let idx=0; idx<this.holding_record.length; idx++)
        {
            if (this.holding_record[idx][2].startsWith(grid_type))
            {
                const grid_hold = Number(this.holding_record[idx][4]);
                const grid_cost = Number(this.holding_record[idx][3]) * Number(this.holding_record[idx][4]);
                grid_total_hold += grid_hold;
                grid_total_cost += grid_cost;
                let grid_row = this.FindTradingGridRow(this.holding_record[idx][2]); // 7 8 9 "卖出价格", "卖出份数", "卖出金额"
                const empty_income = Number(grid_row[9]) + (grid_hold - Number(grid_row[8])) * empty_price - grid_cost;
                grid_empty_income += empty_income;
                const clear_income = Number(grid_row[9]) + (grid_hold - Number(grid_row[8])) * clear_avg_price - grid_cost;
                grid_clear_income += clear_income;
            }
        }
        grid_total_cost = Math.ceil(grid_total_cost);
        let grid_current_value = Math.floor(grid_total_hold * this.current_price);
        this.holding_analysis.push([grid_type, String(grid_total_hold), String(grid_total_cost), String(grid_current_value),
                AveragePriceStr(grid_total_cost, grid_total_hold, precision), this.current_price.toFixed(precision),
                String(grid_current_value - grid_total_cost), grid_empty_income.toFixed(0), grid_clear_income.toFixed(0), 
                ProportionPctStr(grid_total_hold, total_hold, 2), ProportionPctStr(grid_total_cost, total_cost, 2)]);
    }

    CalcTradingIncome(title_txt: string, slump_pct: number, empty_price: number, clear_avg_price: number, clear_price: number, need_slump: boolean = true)
    {
        let total_cost = this.total_cost;
        let total_count = this.total_hold;
        let empty_cost = this.total_cost;
        let empty_count = this.total_hold;
        let clear_income_max = 0;
        let total_sell_cost = 0;
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        this.trading_table.forEach((row:Array<string>, i:number) =>
        {
            if (this.trading_table[i][0].startsWith("利润"))
            {
                clear_income_max = clear_income_max + Number(this.trading_table[i][9]);
            }
            else
            {
                if (this.buy_grid_record.includes(this.trading_table[i][0]))
                {
                    empty_cost = empty_cost - Number(row[9]);
                    empty_count = empty_count - Number(row[8]);
                    clear_income_max = clear_income_max + (Number(row[4]) - Number(row[8])) * clear_avg_price;
                    total_sell_cost = total_sell_cost + Number(row[9]);
                }
                else
                {
                    if (i > 0 && ToNumber(row[1]) >= slump_pct && need_slump)
                    {
                        total_cost = total_cost + Number(row[5]);
                        total_count = total_count + Number(row[4]);

                        empty_cost = empty_cost + Number(row[5]) - Number(row[9]);
                        empty_count = empty_count + Number(row[4]) - Number(row[8]);
                        clear_income_max = clear_income_max + (Number(row[4]) - Number(row[8])) * clear_avg_price;
                        total_sell_cost = total_sell_cost + Number(row[9]);
                    }
                }
            }
        });
        clear_income_max = Math.floor(clear_income_max - empty_cost);
        // ["", "持仓股数", "占用本金", "持仓金额", "持仓均价", "实际价格", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]
        this.trading_income.push(this.GenerateIncomeRow(title_txt + "持仓", total_count, total_cost, this.target_price * slump_pct, total_cost, this.total_cost, 0));
        this.trading_income.push(this.GenerateIncomeRow(title_txt + "清格", empty_count, empty_cost, empty_price, total_cost, 0, total_sell_cost));
        this.trading_income.push([title_txt + "清仓", "0", "0", "0", "-", clear_price.toFixed(precision), String(clear_income_max), String(total_cost), 
                    String(total_sell_cost + empty_cost + clear_income_max), ToTradingGap(total_cost, total_sell_cost + empty_cost + clear_income_max, 2), "-"]);
    }

    GenerateClearRow(grid_name: string, idx: number, grid_step_pct: number, sell_count: number): string[]
    {
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        const price_step = Math.floor((100 + Math.floor(grid_step_pct * 100)) ** idx / 100 ** (idx -1)) / 100;
        const sell_price = FixedPrice(this.target_price, price_step, precision);
        let clear_count = this.clear_sell_record.get(grid_name + String(idx));
        if (clear_count == undefined)
        {
            clear_count = 0;
        }
        return [grid_name + String(idx), ToPercent(price_step), "", "", "", "", (sell_price - this.grid_settings.TRIGGER_ADD_POINT).toFixed(precision),
                sell_price.toFixed(precision), String(sell_count - clear_count), String(Math.ceil(sell_price * (sell_count - clear_count))), "-", "+" + ToPercent(grid_step_pct)]
    }

    GenerateIncomeRow(grid_name: string, total_count: number, total_cost: number, current_price: number, max_cost: number, current_cost: number, sell_value: number)
    {
        // ["", "持仓股数", "占用本金", "持仓金额", "持仓均价", "实际价格", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        const current_value = MyFloor(total_count * current_price, 1);
        const total_income = current_value - total_cost;
        let position = ToPercent(current_cost / max_cost);
        if (current_cost == 0)
        {
            position = "-";
        }
        return [grid_name, String(total_count), String(total_cost), String(current_value), (total_cost / Math.max(total_count, 1)).toFixed(precision),
                current_price.toFixed(precision), String(total_income), String(max_cost),  String(sell_value + current_value), ToTradingGap(max_cost, total_income + max_cost, 2), position];
    }

    CalcClearPrice(step_pct: number, step_idx: number)
    {
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        const price_step = Math.floor((100 + Math.floor(step_pct * 100)) ** step_idx / 100 ** (step_idx -1)) / 100;
        return FixedPrice(this.target_price, price_step, precision);
    }

    IsNeedMonitor(table_index: number, is_sell: boolean, current_price: number, max_rise_pct: number): boolean
    {
        if (is_sell)
        {
            // 判断是否要挂卖出监控单
            const sell_price = Number(this.trading_table[table_index][7]);
            if (current_price * (1.0 + max_rise_pct) >= sell_price)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        else
        {
            // 判断是否要挂买入监控单
            const buy_price = Number(this.trading_table[table_index][3]);
            if (buy_price < this.target_price * this.grid_settings.MINIMUM_BUY_PCT)
            {
                return false;
            }
            if (current_price * (1.0 - max_rise_pct) <= buy_price)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    }

    IsDisableRow(table_index: number)
    {
        const price_pct = ToNumber(this.trading_table[table_index][1]);
        if (price_pct < this.grid_settings.MINIMUM_BUY_PCT)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    FindTradingGridRow(grid_name: string): string []
    {
        for (let idx=0; idx<this.trading_table.length; idx++)
        {
            if (this.trading_table[idx][0] == grid_name)
            {
                return this.trading_table[idx];
            }
        }
        return [];
    }

    SortTradingTable()
    {
        if (this.trading_table.length <= 1)
        {
            return;
        }
        this.trading_table.push(["停止线", "0%",]);
        let move_idx = 0;
        let move_row = null;
        for (let idx=1; idx<this.trading_table.length; idx++)
        {
            if (this.trading_table[idx][1] == "0%")
            {
                break;
            }
            if (this.IsDisableRow(idx))
            {
                move_idx = idx;
                move_row = this.trading_table[move_idx];
                for (let idx2=move_idx; idx2<this.trading_table.length - 1; idx2++)
                {
                    this.trading_table[idx2] = this.trading_table[idx2 + 1];
                    if (this.buy_monitor_rows.indexOf(idx2+1) != -1)
                    {
                        this.buy_monitor_rows[this.buy_monitor_rows.indexOf(idx2+1)] = idx2;
                    }
                    if (this.buy_triggered_rows.indexOf(idx2+1) != -1)
                    {
                        this.buy_triggered_rows[this.buy_triggered_rows.indexOf(idx2+1)] = idx2;
                    }
                    if (this.sell_monitor_rows.indexOf(idx2+1) != -1)
                    {
                        this.sell_monitor_rows[this.sell_monitor_rows.indexOf(idx2+1)] = idx2;
                    }
                    if (this.sell_triggered_rows.indexOf(idx2+1) != -1)
                    {
                        this.sell_triggered_rows[this.sell_triggered_rows.indexOf(idx2+1)] = idx2;
                    }
                }
                this.trading_table[this.trading_table.length-1] = move_row;
                idx--;
            }
        }
    }
}