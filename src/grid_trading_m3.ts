/*
    网格策略的计算逻辑，模式3
    特殊历史原因带来的一些网格策略，需要手动设置网格每个格子的步进值
*/

import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap } from "./mymath";
import { PluginEnv } from "./plugin_env";
import { GridTrading } from "./grid_trading";


export class GridTradingModeThree extends GridTrading 
{
    
    constructor(plugin_env: PluginEnv)
    {
        super(plugin_env)
        this.mode_type = "Three";
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

        const current_pct = MyCeil(this.current_price / this.target_price, 0.001);
        let grid_sell_pct = 1.0 + this.grid_settings.SGRID_STEP_PCT
        for (let idx=0; idx<this.sgrid_step_table.length; idx++)
        {
            let grid_buy_pct = ToNumber(this.sgrid_step_table[idx][1])
            this.trading_table[idx + 1] = this.GenerateOneRow(this.sgrid_step_table[idx][0], grid_buy_pct, grid_sell_pct,
                    Number(this.sgrid_step_table[idx][2]), Number(this.sgrid_step_table[idx][3]));
            grid_sell_pct = grid_buy_pct;
            
            if (this.buy_grid_record.includes(this.trading_table[idx + 1][0]))
            {
                this.buy_triggered_rows.push(idx + 1);
                this.sell_triggered_rows.push(idx + 1);
            }
        }
        if (this.buy_triggered_rows.length > 0)
        {
            // 小网
            const last_buy = this.buy_triggered_rows[this.buy_triggered_rows.length - 1];
            if (last_buy < this.sgrid_step_table.length) this.buy_monitor_rows.push(last_buy + 1);
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
        let start_index = this.sgrid_step_table.length + 1;
        grid_sell_pct = 1.0 + this.grid_settings.MGRID_STEP_PCT;
        for (let idx=0; idx<this.mgrid_step_table.length; idx++)
        {
            let grid_buy_pct = ToNumber(this.mgrid_step_table[idx][1])
            this.trading_table[start_index + idx] = this.GenerateOneRow(this.mgrid_step_table[idx][0], grid_buy_pct, grid_sell_pct,
                    Number(this.mgrid_step_table[idx][2]), Number(this.mgrid_step_table[idx][3]));
            grid_sell_pct = grid_buy_pct;

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
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] >= start_index)
        {
            // 判断是否挂卖单监控
            const last_sell_m = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            const price_pct = MyCeil(Number(this.trading_table[last_sell_m][7]) / this.target_price, 0.001);
            if (price_pct - this.grid_settings.MAX_RISE_PCT <= current_pct)
            {
                this.sell_triggered_rows.remove(last_sell_m);
                this.sell_monitor_rows.push(last_sell_m);
            }
        }
        start_index = this.sgrid_step_table.length + this.mgrid_step_table.length + 1;
        grid_sell_pct = 1.0 + this.grid_settings.LGRID_STEP_PCT;
        for (let idx=0; idx<this.lgrid_step_table.length; idx++)
        {
            let grid_buy_pct = ToNumber(this.lgrid_step_table[idx][1])
            this.trading_table[start_index + idx] = this.GenerateOneRow(this.lgrid_step_table[idx][0], grid_buy_pct, grid_sell_pct,
                    Number(this.lgrid_step_table[idx][2]), Number(this.lgrid_step_table[idx][3]));
            grid_sell_pct = grid_buy_pct;

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
            
        }
        if (this.sell_triggered_rows.length > 0 && this.sell_triggered_rows[this.sell_triggered_rows.length - 1] >= start_index)
        {
            // 判断是否挂卖单监控
            const last_sell_l = this.sell_triggered_rows[this.sell_triggered_rows.length - 1];
            const price_pct = MyCeil(Number(this.trading_table[last_sell_l][7]) / this.target_price, 0.001);
            if (price_pct - this.grid_settings.MAX_RISE_PCT <= current_pct)
            {
                this.sell_triggered_rows.remove(last_sell_l);
                this.sell_monitor_rows.push(last_sell_l);
            }
        }
    }

    GenerateOneRow(grid_name: string, grid_buy_pct: number, grid_sell_pct: number, grid_add_pct: number, grid_retain_count: number)
    {
        const buy_price = MyFloor(this.target_price * grid_buy_pct, this.grid_settings.MIN_ALIGN_PRICE);
        const buy_count = MyFloor(this.grid_settings.ONE_GRID_LIMIT * (1 + grid_add_pct) / buy_price, this.grid_settings.MIN_BATCH_COUNT)

        const sell_price = MyCeil(this.target_price * grid_sell_pct, this.grid_settings.MIN_ALIGN_PRICE);
        const retain_count = (sell_price - buy_price) * buy_count * grid_retain_count;
        const sell_count = MyFloor((sell_price * buy_count - retain_count) / sell_price, this.grid_settings.MIN_BATCH_COUNT);

        return [grid_name, ToPercent(grid_buy_pct), (buy_price + this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), 
                buy_price.toFixed(3), String(buy_count), String(Math.ceil(buy_price * buy_count)),
                (sell_price - this.grid_settings.TRIGGER_ADD_POINT).toFixed(3), sell_price.toFixed(3),
                String(sell_count), String(Math.ceil(sell_price * sell_count)), ToTradingGap(sell_price, buy_price, 1), ToTradingGap(buy_price, sell_price, 1)];
    }

}