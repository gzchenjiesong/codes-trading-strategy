/*
    网格策略的计算逻辑，模式2
    模式1的基础上通过分段策略使得小网的步进值更加均衡
*/
import { SGRID_TYPE_NAME_STR, MGRID_TYPE_NAME_STR, LGRID_TYPE_NAME_STR, PERFIT_TYPE_NAME_STR } from "./lang_str";
import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap } from "./mymath";
import { PluginEnv } from "./plugin_env";
import { DebugLog } from "./remote_util";
import { GridTrading } from "./grid_trading";


export class GridTradingModeTwo extends GridTrading 
{

    constructor(plugin_env: PluginEnv)
    {
        super(plugin_env)
        this.mode_type = "Two";
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
            this.InitTradingAnalysis();
            this.DebugLog("Info", "UpdateRemotePrice", String(this.remote_current_price));
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

        const count = Math.floor(Math.log(1 - this.grid_settings.MAX_SLUMP_PCT) / Math.log(1 - this.grid_settings.LGRID_STEP_PCT)) + 1;
        const current_pct = MyCeil(this.current_price / this.target_price, 0.001);
        // 小网
        let idx = 0;
        let max_slump_pct = Math.round((1 - this.grid_settings.MAX_SLUMP_PCT) * 100);
        let sell_price_step = 1 + this.grid_settings.SGRID_STEP_PCT;
        for (let i=0; i<count; i++)
        {
            let ti = 1;
            const first_step = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i));
            const slump_pct = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i + 1));
            let step_pct = first_step;
            while (step_pct > slump_pct && step_pct > max_slump_pct)
            {
                this.trading_table[idx + 1] = this.GenerateOneRow(SGRID_TYPE_NAME_STR, idx, step_pct / 100, sell_price_step,
                        this.grid_settings.SGRID_RETAIN_COUNT, this.grid_settings.SGRID_ADD_PCT);
                if (this.buy_grid_record.includes(this.trading_table[idx + 1][0]))
                {
                    this.buy_triggered_rows.push(idx + 1);
                    this.sell_triggered_rows.push(idx + 1);
                }
                sell_price_step = step_pct / 100;
                step_pct = Math.round(first_step * (1 - ti * this.grid_settings.SGRID_STEP_PCT));
                ti++;
                idx++;
            }
        }
        if (this.buy_triggered_rows.length > 0)
        {
            // 小网
            const last_buy = this.buy_triggered_rows[this.buy_triggered_rows.length - 1];
            if (last_buy < this.trading_table.length) this.buy_monitor_rows.push(last_buy + 1);
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
        // 中网
        let start_index = this.trading_table.length;
        idx = 0;
        sell_price_step = 1;
        for (let i=0; i<count; i++)
        {
            let ti = 2;
            const first_step = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i));
            const slump_pct = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i + 1));
            let step_pct = Math.round(first_step * (1 - this.grid_settings.MGRID_STEP_PCT));
            while (step_pct > slump_pct && step_pct > max_slump_pct)
            {
                this.trading_table[start_index + idx] = this.GenerateOneRow(MGRID_TYPE_NAME_STR, idx + 1, step_pct / 100, sell_price_step,
                        this.grid_settings.MGRID_RETAIN_COUNT, this.grid_settings.LGRID_ADD_PCT);
                if (this.buy_grid_record.includes(this.trading_table[start_index + idx][0]))
                {
                    this.buy_triggered_rows.push(start_index + idx);
                    this.sell_triggered_rows.push(start_index + idx);
                }
                else
                {
                    // 判断是否挂中网买单监控
                    if (ToNumber(this.trading_table[start_index + idx][1]) + this.grid_settings.MAX_RISE_PCT >= current_pct)
                    {
                        this.buy_monitor_rows.push(start_index + idx);
                    }
                }
                sell_price_step = step_pct / 100;
                step_pct = Math.round(first_step * (1 - ti * this.grid_settings.MGRID_STEP_PCT));
                ti++;
                idx++;
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] >= start_index)
        {
            // 判断是否挂卖单监控
            const last_sell_m = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            if (ToNumber(this.trading_table[last_sell_m][1]) + this.grid_settings.MGRID_STEP_PCT - this.grid_settings.MAX_RISE_PCT <= current_pct)
            {
                this.sell_triggered_rows.remove(last_sell_m);
                this.sell_monitor_rows.push(last_sell_m);
            }
        }
        // 大网
        start_index = this.trading_table.length;
        idx = 0;
        for (let i=0; i<count; i++)
        {
            sell_price_step = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i)) / 100;
            const step_pct = Math.round(100 * Math.pow(1 - this.grid_settings.LGRID_STEP_PCT, i + 1));
            DebugLog("LGRID step pct ", step_pct, max_slump_pct);
            if (step_pct > max_slump_pct)
            {
                this.trading_table[start_index + idx] = this.GenerateOneRow(LGRID_TYPE_NAME_STR, idx + 1, step_pct / 100, sell_price_step,
                        this.grid_settings.LGRID_RETAIN_COUNT, this.grid_settings.LGRID_ADD_PCT);
                if (this.buy_grid_record.includes(this.trading_table[start_index + idx][0]))
                {
                    this.buy_triggered_rows.push(start_index + idx);
                    this.sell_triggered_rows.push(start_index + idx);
                }
                else
                {
                    // 判断是否挂大网买单监控
                    if (ToNumber(this.trading_table[start_index + idx][1]) + this.grid_settings.MAX_RISE_PCT >= current_pct)
                    {
                        this.buy_monitor_rows.push(start_index + idx);
                    }
                }
                idx++;
            }
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] >= start_index)
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

    GenerateOneRow(grid_name: string, idx: number, buy_price_step: number, sell_price_step: number, grid_retain_count: number, grid_add_pct: number)
    {
        const buy_price = MyFloor(this.target_price * buy_price_step, this.grid_settings.MIN_ALIGN_PRICE);
        const buy_count = MyFloor(this.grid_settings.ONE_GRID_LIMIT * (1 + idx * grid_add_pct) / buy_price, this.grid_settings.MIN_BATCH_COUNT)

        const sell_price = MyCeil(this.target_price * sell_price_step, this.grid_settings.MIN_ALIGN_PRICE);
        const retain_count = (sell_price - buy_price) * buy_count * grid_retain_count;
        const sell_count = MyFloor((sell_price * buy_count - retain_count) / sell_price, this.grid_settings.MIN_BATCH_COUNT);

        return [grid_name + String(idx), ToPercent(buy_price_step), (buy_price + this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), 
                buy_price.toFixed(3), String(buy_count), String(Math.ceil(buy_price * buy_count)),
                (sell_price - this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), sell_price.toFixed(3),
                String(sell_count), String(Math.ceil(sell_price * sell_count)), ToTradingGap(sell_price, buy_price, 1), ToTradingGap(buy_price, sell_price, 1)];
    }

}