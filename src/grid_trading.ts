/*
    网格策略的计算逻辑
*/
import { Md5 } from "ts-md5/dist/md5";
import { GridTradingSettings, GRID_COLOR_STOCK_OVERVIEW, GRID_COLOR_BUY_OVERVIEW, GRID_COLOR_SELL_OVERVIEW } from "./settings"
import { SGRID_TYPE_NAME_STR, MGRID_TYPE_NAME_STR, LGRID_TYPE_NAME_STR } from "./lang_str";
import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap } from "./mymath";
import { PluginEnv } from "./plugin_env";


export class GridTrading 
{
    plugin_env: PluginEnv;
    grid_settings: GridTradingSettings;
    is_empty: boolean;
    data_md5: string;
    stock_table: string [][];
    param_table: string [][];
    trading_table: string [][];
    trading_analysis: string [][];
    trading_record: string [][];
    debug_log: string [][];

    target_stock: number;
    stock_name: string;
    market_code: string;
    current_price: number;
    remote_current_price: number;
    target_price: number;
    buy_grid_record: string [];

    buy_triggered_rows: number [];
    sell_triggered_rows: number [];
    buy_monitor_rows: number [];
    sell_monitor_rows: number [];

    stock_overview: string [];
    stock_buy_overview: string [][];
    stock_sell_overview: string [][];

    constructor(plugin_env: PluginEnv)
    {
        this.plugin_env = plugin_env;
        this.grid_settings = plugin_env.grid_settings.Clone();
        this.debug_log = []
        this.data_md5 = "";
        this.is_empty = true;
        this.remote_current_price = -1;
    }

    DebugLog(level: string, log_str: string, extra_info: string)
    {
        this.debug_log.push([level, log_str, extra_info]);
    }

    GetTradingTitle()
    {
        return this.stock_name + "(" + String(this.target_stock) + ")";
    }

    InitTradingOverview()
    {
        this.stock_overview = [GRID_COLOR_STOCK_OVERVIEW, String(this.target_stock), this.stock_name, this.target_price.toFixed(3), this.current_price.toFixed(3),
                ToPercent(this.current_price / this.target_price, 1)];
        this.stock_buy_overview = [];
        if (this.buy_monitor_rows.length > 0)
        {
            for (let idx=0; idx<this.buy_monitor_rows.length; idx++)
            {
                const row = this.buy_monitor_rows[idx];
                const trading_gap = ToTradingGap(Number(this.trading_table[row][3]), this.current_price, 2);
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
                const trading_gap = ToTradingGap(Number(this.trading_table[row][7]), this.current_price, 2);
                this.stock_sell_overview.push([GRID_COLOR_SELL_OVERVIEW, String(this.target_stock), this.stock_name, this.trading_table[row][0], this.trading_table[row][1],
                        this.trading_table[row][6], this.trading_table[row][7], this.trading_table[row][8], this.trading_table[row][9], trading_gap]);
            }
        }
    }

    InitGridTrading(data: string)
    {
        if (this.ParseRawData(data) || this.is_empty)
        {
            this.is_empty = false;
            this.InitStockTable();
            this.InitGridParam();
            this.InitTradingTable();
            this.InitTradingAnalysis();
        }
    }

    UpdateRemotePrice(remote_price: number)
    {
        this.remote_current_price = remote_price;
        if (this.remote_current_price > 0 && this.remote_current_price != this.current_price)
        {
            this.current_price = this.remote_current_price;
            this.is_empty = false;
            this.InitStockTable();
            this.InitGridParam();
            this.InitTradingTable();
            this.InitTradingAnalysis();
            this.DebugLog("Info", "UpdateRemotePrice", String(this.remote_current_price));
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
        this.target_stock = Number(strs[0]);
        this.stock_name = strs[1];
        this.market_code = strs[2];
        this.target_price = Number(strs[3]);
        this.current_price = Number(strs[4]);

        // BASE,10000,0.67,0.005,0.001,100,0.1
        // STEP,0.05,0.05,4,0.22,0.2,2,0.52,0.5,1
        // BUY,2024-01-23,小网0
        this.grid_settings = this.plugin_env.grid_settings.Clone();
        this.trading_record = [];
        this.buy_grid_record = [];
        for (let idx=1; idx < lines.length; idx++)
        {
            const strs = lines[idx].split(",");
            if (strs[0] == "BUY")
            {
                this.trading_record[idx] = [strs[0], strs[1], strs[2]];
                this.buy_grid_record.push(strs[2]);
            }
            if (strs[0] == "SELL")
            {
                this.trading_record[idx] = [strs[0], strs[1], strs[2]];
                this.buy_grid_record.remove(strs[2]);
            }
            if (strs[0] == "BASE")
            {
                this.grid_settings.UnpackBase(strs);
            }
            if (strs[0] == "STEP")
            {
                this.grid_settings.UnpackStep(strs);
            }
        }
        this.remote_current_price = this.plugin_env.GetStockRemotePrice(strs[0]);
        if (this.remote_current_price > 0)
        {
            this.current_price = this.remote_current_price;
        }
        return true;
    }

    InitStockTable()
    {
        this.stock_table = [
            ["标的代号", String(this.target_stock)],
            ["标的名称", this.stock_name],
            ["当前价格", String(this.current_price), "价格百分位", ToPercent(this.current_price / this.target_price, 1)],
        ];
    }

    InitGridParam()
    {
        this.param_table = [
            ["首网目标价", String(this.target_price), "首网目标金额", String(this.grid_settings.ONE_GRID_LIMIT)],
            ["最大回撤值", ToPercent(this.grid_settings.MAX_SLUMP_PCT), "最大涨跌幅", ToPercent(this.grid_settings.MAX_RISE_PCT)],
            ["触发价加点", String(this.grid_settings.TRIGGER_ADD_POINT), "每手份数额", String(this.grid_settings.MIN_BATCH_COUNT), "价格最小单位", String(this.grid_settings.MIN_ALIGN_PRICE)],
            ["小网步进值", String(this.grid_settings.SGRID_STEP_PCT), "中网步进值", String(this.grid_settings.MGRID_STEP_PCT), "大网步进值", String(this.grid_settings.LGRID_STEP_PCT)],
            ["投入追加值", String(this.grid_settings.SGRID_ADD_PCT), "投入追加值", String(this.grid_settings.MGRID_ADD_PCT), "投入追加值", String(this.grid_settings.LGRID_ADD_PCT)],
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

        const slump_pcts: number [] = [20, 40, 50, 60, 70, 80, 90];
        slump_pcts.push(this.grid_settings.MAX_SLUMP_PCT * 100)
        slump_pcts.sort((a, b) => a - b);
        for (const pct of slump_pcts)
        {
            const result = Analysis(pct / 100.0);
            for (let idx=0; idx<result.length; idx++)
            {
                this.trading_analysis[idx].push(result[idx]);
            }
        }
    }

    InitTradingTable()
    {
        this.buy_triggered_rows = []
        this.sell_triggered_rows = []
        this.buy_monitor_rows = []
        this.sell_monitor_rows = []
        this.trading_table = []
        this.trading_table[0] = ["网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "相对跌幅", "相对涨幅"];

        const scount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.SGRID_STEP_PCT);
        const mcount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.MGRID_STEP_PCT);
        const lcount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.LGRID_STEP_PCT);
        const current_pct = MyCeil(this.current_price / this.target_price, 0.001);
        for (let idx=0; idx<=scount; idx++)
        {
            this.trading_table[idx + 1] = this.GenerateOneRow(SGRID_TYPE_NAME_STR, idx, this.grid_settings.SGRID_STEP_PCT,
                    this.grid_settings.SGRID_RETAIN_COUNT, this.grid_settings.SGRID_ADD_PCT);
            if (ToNumber(this.trading_table[idx + 1][1]) >= current_pct)
            {
                this.buy_triggered_rows.push(idx + 1);
                this.sell_triggered_rows.push(idx + 1);
            }
            else
            {
                if (this.buy_grid_record.includes(this.trading_table[idx + 1][0]))
                {
                    this.buy_triggered_rows.push(idx + 1);
                    this.sell_triggered_rows.push(idx + 1);
                }
            }
        }
        this.DebugLog("Info", "sgrid buy triggered rows length", String(this.buy_triggered_rows.length));
        if (this.buy_triggered_rows.length > 0)
        {
            // 小网
            const last_buy = this.buy_triggered_rows[this.buy_triggered_rows.length - 1];
            if (last_buy < scount + 1) this.buy_monitor_rows.push(last_buy + 1);
            let last_sell = this.sell_triggered_rows.pop();
            if (last_sell) this.sell_monitor_rows.push(last_sell);
            last_sell = this.sell_triggered_rows.pop();
            if (last_sell) this.sell_monitor_rows.push(last_sell);
        }
        else
        {
            // 判断是否挂小网的首网买入
            const first_buy = 1;
            if (ToNumber(this.trading_table[first_buy][1]) + this.grid_settings.MAX_RISE_PCT >= current_pct)
            {
                this.buy_monitor_rows.push(first_buy);
            }
        }
        for (let idx=1; idx<=mcount; idx++)
        {
            this.trading_table[scount + 1 + idx] = this.GenerateOneRow(MGRID_TYPE_NAME_STR, idx, this.grid_settings.MGRID_STEP_PCT,
                    this.grid_settings.MGRID_RETAIN_COUNT, this.grid_settings.MGRID_ADD_PCT);
            if (ToNumber(this.trading_table[scount + 1 + idx][1]) >= current_pct)
            {
                this.buy_triggered_rows.push(scount + 1 + idx);
                this.sell_triggered_rows.push(scount + 1 + idx);
            }
            else
            {
                if (this.buy_grid_record.includes(this.trading_table[scount + 1 + idx][0]))
                {
                    this.buy_triggered_rows.push(scount + 1 + idx);
                    this.sell_triggered_rows.push(scount + 1 + idx);
                }
                else
                {
                    // 判断是否挂中网买单监控
                    if (ToNumber(this.trading_table[scount + 1 + idx][1]) + this.grid_settings.MAX_RISE_PCT >= current_pct)
                    {
                        this.buy_monitor_rows.push(scount + 1 + idx);
                    }
                }
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] > scount + 1)
        {
            // 判断是否挂卖单监控
            const last_sell_m = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            if (ToNumber(this.trading_table[last_sell_m][1]) + this.grid_settings.MGRID_STEP_PCT - this.grid_settings.MAX_RISE_PCT <= current_pct)
            {
                this.sell_triggered_rows.remove(last_sell_m);
                this.sell_monitor_rows.push(last_sell_m);
            }
        }
        for (let idx=1; idx<=lcount; idx++)
        {
            this.trading_table[scount + 1 + mcount + idx] = this.GenerateOneRow(LGRID_TYPE_NAME_STR, idx, this.grid_settings.LGRID_STEP_PCT,
                    this.grid_settings.LGRID_RETAIN_COUNT, this.grid_settings.LGRID_ADD_PCT);
            if (ToNumber(this.trading_table[scount + 1 + mcount + idx][1]) >= current_pct)
            {
                this.buy_triggered_rows.push(scount + 1 + mcount + idx);
                this.sell_triggered_rows.push(scount + 1 + mcount + idx);
            }
            else
            {
                if (this.buy_grid_record.includes(this.trading_table[scount + 1 + mcount + idx][0]))
                {
                    this.buy_triggered_rows.push(scount + 1 + mcount + idx);
                    this.sell_triggered_rows.push(scount + 1 + mcount + idx);
                }
                else
                {
                    // 判断是否挂大网买单监控
                    if (ToNumber(this.trading_table[scount + 1 + mcount + idx][1]) + this.grid_settings.MAX_RISE_PCT >= current_pct)
                    {
                        this.buy_monitor_rows.push(scount + 1 + mcount + idx);
                    }
                }
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] > scount + 1 + mcount)
        {
            // 判断是否挂卖单监控
            const last_sell_l = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            if (ToNumber(this.trading_table[last_sell_l][1]) + this.grid_settings.LGRID_STEP_PCT - this.grid_settings.MAX_RISE_PCT <= current_pct)
            {
                this.sell_triggered_rows.remove(last_sell_l);
                this.sell_monitor_rows.push(last_sell_l);
            }
        }
    }

    GenerateOneRow(grid_name: string, idx: number, grid_step_pct: number, grid_retain_count: number, grid_add_pct: number)
    {
        //const price_step = MyFloor((100.0 - idx * grid_step_pct * 100.0) / 100.0, 0.01);
        const price_step = (100 - idx * grid_step_pct * 100) / 100;
        const buy_price = MyFloor(this.target_price * price_step, this.grid_settings.MIN_ALIGN_PRICE);
        const buy_count = MyFloor(this.grid_settings.ONE_GRID_LIMIT * (1 + idx * grid_add_pct) / buy_price, this.grid_settings.MIN_BATCH_COUNT)

        const sell_price = MyCeil(this.target_price * (price_step + grid_step_pct), this.grid_settings.MIN_ALIGN_PRICE);
        const retain_count = (sell_price - buy_price) * buy_count * grid_retain_count;
        const sell_count = MyFloor((sell_price * buy_count - retain_count) / sell_price, this.grid_settings.MIN_BATCH_COUNT);

        return [grid_name + String(idx), ToPercent(price_step), (buy_price + this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), 
                buy_price.toFixed(3), String(buy_count), String(Math.ceil(buy_price * buy_count)),
                (sell_price - this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), sell_price.toFixed(3),
                String(sell_count), String(Math.ceil(sell_price * sell_count)), ToTradingGap(buy_price, sell_price, 1), ToTradingGap(sell_price, buy_price, 1)];
    }
}