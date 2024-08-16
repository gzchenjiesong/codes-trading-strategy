/*
    网格策略的计算逻辑，模式1，默认模式
    按照小中大不同的指定步进值
*/
import { SGRID_TYPE_NAME_STR, MGRID_TYPE_NAME_STR, LGRID_TYPE_NAME_STR, PERFIT_TYPE_NAME_STR } from "./lang_str";
import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap, FixedPrice, ToPercentStr } from "./mymath";
import { PluginEnv } from "./plugin_env";
import { DebugLog } from "./remote_util";
import { GridTrading } from "./grid_trading";


export class GridTradingModeOne extends GridTrading 
{

    constructor(plugin_env: PluginEnv)
    {
        super(plugin_env)
        this.mode_type = "One";
    }

    InitGridTrading(data: string)
    {
        if (this.ParseRawData(data) || this.is_empty)
        {
            this.is_empty = false;
            this.InitStockTable();
            this.InitGridParam();
            this.InitTradingTable();
            this.InitTradingRecord();
            this.InitTradingIncome();
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
            this.InitTradingRecord();
            this.InitTradingIncome();
            this.InitTradingAnalysis();
        }
    }

    InitTradingTable()
    {
        this.buy_triggered_rows = []
        this.sell_triggered_rows = []
        this.buy_monitor_rows = []
        this.sell_monitor_rows = []
        this.disable_rows = []
        this.trading_table = []
        this.trading_table[0] = ["网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "相对跌幅", "相对涨幅"];

        const scount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.SGRID_STEP_PCT);
        const mcount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.MGRID_STEP_PCT);
        const lcount = Math.floor(this.grid_settings.MAX_SLUMP_PCT / this.grid_settings.LGRID_STEP_PCT);
        const max_rise_pct = this.grid_settings.MAX_RISE_PCT;
        for (let idx=0; idx<=scount; idx++)
        {
            this.trading_table[idx + 1] = this.GenerateOneRow(SGRID_TYPE_NAME_STR, idx, this.grid_settings.SGRID_STEP_PCT,
                    this.grid_settings.SGRID_RETAIN_COUNT, this.grid_settings.SGRID_ADD_PCT);

            if (this.buy_grid_record.includes(this.trading_table[idx + 1][0]))
            {
                this.buy_triggered_rows.push(idx + 1);
                this.sell_triggered_rows.push(idx + 1);
            }
            if (this.IsDisableRow(idx + 1))
            {
                this.disable_rows.push(idx + 1);
            }
        }
        if (this.buy_triggered_rows.length > 0)
        {
            // 小网
            const last_buy = this.buy_triggered_rows[this.buy_triggered_rows.length - 1];
            if (last_buy < scount + 1) this.buy_monitor_rows.push(last_buy + 1);
            let last_sell = this.sell_triggered_rows.pop();
            if (last_sell) this.sell_monitor_rows.push(last_sell);
            if (this.sell_triggered_rows.length > 0)
            {
                const last_sell_s = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
                if (this.IsNeedMonitor(last_sell_s, true, this.current_price, max_rise_pct))
                {
                    this.sell_triggered_rows.pop();
                    this.sell_monitor_rows.push(last_sell_s);
                }
            }
        }
        else
        {
            // 判断是否挂小网的首网买入
            const first_buy = 1;
            if (this.IsNeedMonitor(first_buy, false, this.current_price, max_rise_pct))
            {
                this.buy_monitor_rows.push(first_buy);
            }
        }
        for (let idx=1; idx<=mcount; idx++)
        {
            this.trading_table[scount + 1 + idx] = this.GenerateOneRow(MGRID_TYPE_NAME_STR, idx, this.grid_settings.MGRID_STEP_PCT,
                    this.grid_settings.MGRID_RETAIN_COUNT, this.grid_settings.MGRID_ADD_PCT);
            
            if (this.buy_grid_record.includes(this.trading_table[scount + 1 + idx][0]))
            {
                this.buy_triggered_rows.push(scount + 1 + idx);
                this.sell_triggered_rows.push(scount + 1 + idx);
            }
            else
            {
                // 判断是否挂中网买单监控
                if (this.IsNeedMonitor(scount + 1 + idx, false, this.current_price, max_rise_pct))
                {
                    this.buy_monitor_rows.push(scount + 1 + idx);
                }
            }
            if (this.IsDisableRow(scount + 1 + idx))
            {
                this.disable_rows.push(scount + 1 + idx);
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] > scount + 1)
        {
            // 判断是否挂卖单监控
            const last_sell_m = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            if (this.IsNeedMonitor(last_sell_m, true, this.current_price, max_rise_pct))
            {
                this.sell_triggered_rows.remove(last_sell_m);
                this.sell_monitor_rows.push(last_sell_m);
            }
        }
        for (let idx=1; idx<=lcount; idx++)
        {
            this.trading_table[scount + 1 + mcount + idx] = this.GenerateOneRow(LGRID_TYPE_NAME_STR, idx, this.grid_settings.LGRID_STEP_PCT,
                    this.grid_settings.LGRID_RETAIN_COUNT, this.grid_settings.LGRID_ADD_PCT);

            if (this.buy_grid_record.includes(this.trading_table[scount + 1 + mcount + idx][0]))
            {
                this.buy_triggered_rows.push(scount + 1 + mcount + idx);
                this.sell_triggered_rows.push(scount + 1 + mcount + idx);
            }
            else
            {
                // 判断是否挂大网买单监控
                if (this.IsNeedMonitor(scount + 1 + mcount, false, this.current_price, max_rise_pct))
                {
                    this.buy_monitor_rows.push(scount + 1 + mcount + idx);
                }
            }
            if (this.IsDisableRow(scount + 1 + mcount + idx))
            {
                this.disable_rows.push(scount + 1 + mcount + idx);
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] > scount + 1 + mcount)
        {
            // 判断是否挂卖单监控
            const last_sell_l = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            if (this.IsNeedMonitor(last_sell_l, true, this.current_price, max_rise_pct))
            {
                this.sell_triggered_rows.remove(last_sell_l);
                this.sell_monitor_rows.push(last_sell_l);
            }
        }
    }

    GenerateOneRow(grid_name: string, idx: number, grid_step_pct: number, grid_retain_count: number, grid_add_pct: number)
    {
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        const buy_price_step = 100 - idx * Math.floor(grid_step_pct * 100);
        const buy_price = FixedPrice(this.target_price, buy_price_step / 100, precision);
        const buy_count = MyFloor(this.grid_settings.ONE_GRID_LIMIT * (1 + idx * grid_add_pct) / buy_price, this.grid_settings.MIN_BATCH_COUNT)

        const sell_price_step = buy_price_step + Math.floor(grid_step_pct * 100);
        const sell_price = FixedPrice(this.target_price, sell_price_step / 100, precision);
        const retain_count = (sell_price - buy_price) * buy_count * grid_retain_count;
        const sell_count = MyFloor((sell_price * buy_count - retain_count) / sell_price, this.grid_settings.MIN_BATCH_COUNT);

        return [grid_name + String(idx), ToPercentStr(buy_price_step), (buy_price + this.grid_settings.TRIGGER_ADD_POINT).toFixed(precision), 
                buy_price.toFixed(precision), String(buy_count), String(Math.ceil(buy_price * buy_count)),
                (sell_price - this.grid_settings.TRIGGER_ADD_POINT).toFixed(precision), sell_price.toFixed(precision),
                String(sell_count), String(Math.ceil(sell_price * sell_count)), ToTradingGap(sell_price, buy_price, 1),
                ToTradingGap(buy_price, sell_price, 1)];
    }
}