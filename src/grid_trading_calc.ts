/*
    网格策略计算逻辑（计算 mixin）
    持仓/收益/清仓/监控的纯计算辅助方法，挂在 GridTrading 基类上
*/
import { MyFloor, ToPercent, ToNumber, ToTradingGap, FixedPrice, ProportionPctStr, AveragePriceStr } from "./mymath";
import type { GridTrading } from "./grid_trading";


export class GridTradingCalc
{
    CalcHoldingPercent(this: GridTrading, grid_type: string, empty_price: number, clear_avg_price: number)
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

    CalcTradingIncome(this: GridTrading, title_txt: string, slump_pct: number, empty_price: number, clear_avg_price: number, take_profit_price: number, clear_price: number, need_slump: boolean = true)
    {
        let total_cost = this.total_cost;
        let total_count = this.total_hold;
        let empty_cost = this.total_cost;
        let empty_count = this.total_hold;
        let profit_cost = this.total_cost;
        let profit_count = this.total_hold;
        let clear_income_max = 0;
        let take_profit_count = 0;
        let clear_hold_max = 0;
        let total_sell_cost = 0;
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        this.trading_table.forEach((row:Array<string>, i:number) =>
        {
            if (this.trading_table[i][0].startsWith("利润"))
            {
                clear_income_max = clear_income_max + Number(this.trading_table[i][9]);
                if (this.trading_table[i][0].startsWith("利润1"))
                {
                    take_profit_count = take_profit_count + Number(this.trading_table[i][8]);
                }
            }
            else
            {
                if (this.buy_grid_record.includes(this.trading_table[i][0]))
                {
                    empty_cost = empty_cost - Number(row[9]);
                    empty_count = empty_count - Number(row[8]);
                    clear_hold_max = clear_hold_max + (Number(row[4]) - Number(row[8]));
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
                        clear_hold_max = clear_hold_max + (Number(row[4]) - Number(row[8]));
                        total_sell_cost = total_sell_cost + Number(row[9]);
                    }
                }
            }
        });
        clear_income_max = Math.floor(clear_income_max  + clear_hold_max * clear_avg_price - empty_cost);
        take_profit_count = take_profit_count + MyFloor(clear_hold_max * 0.4, this.grid_settings.MIN_BATCH_COUNT);
        profit_cost = empty_cost - Math.floor(take_profit_count * take_profit_price);
        profit_count = empty_count - take_profit_count;
        // ["", "持仓股数", "占用本金", "持仓金额", "持仓均价", "实际价格", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]
        this.trading_income.push(this.GenerateIncomeRow(title_txt + "持仓", total_count, total_cost, this.target_price * slump_pct, total_cost, this.total_cost, 0));
        this.trading_income.push(this.GenerateIncomeRow(title_txt + "清格", empty_count, empty_cost, empty_price, total_cost, 0, total_sell_cost));
        this.trading_income.push(this.GenerateIncomeRow(title_txt + "止盈", profit_count, profit_cost, take_profit_price, total_cost, 0, total_sell_cost + Math.floor(take_profit_count * take_profit_price)));
        this.trading_income.push([title_txt + "清仓", "0", "0", "0", "-", clear_price.toFixed(precision), String(clear_income_max), String(total_cost), 
                String(total_sell_cost + empty_cost + clear_income_max), ToTradingGap(total_cost, total_sell_cost + empty_cost + clear_income_max, 2), "-"]);
    }

    GenerateClearRow(this: GridTrading, grid_name: string, idx: number, grid_step_pct: number, sell_count: number): string[]
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
                sell_price.toFixed(precision), String(sell_count - clear_count), String(Math.ceil(sell_price * (sell_count - clear_count))), "-", "+" + ToPercent(grid_step_pct), "-", "-"]
    }

    GenerateIncomeRow(this: GridTrading, grid_name: string, total_count: number, total_cost: number, current_price: number, max_cost: number, current_cost: number, sell_value: number)
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

    CalcClearPrice(this: GridTrading, step_pct: number, step_idx: number)
    {
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        const price_step = Math.floor((100 + Math.floor(step_pct * 100)) ** step_idx / 100 ** (step_idx -1)) / 100;
        return FixedPrice(this.target_price, price_step, precision);
    }

    CalcGridIncomes(this: GridTrading, retain_count: number): [number, number]
    {
        const clear_pct = this.grid_settings.CLEAR_STEP_PCT;
        const clear_avg_price = Number((this.CalcClearPrice(clear_pct, 1) * 0.4 + this.CalcClearPrice(clear_pct, 2) * 0.6).toFixed(this.grid_settings.TRADING_PRICE_PRECISION));
        const first_clear_price = this.CalcClearPrice(clear_pct, 1);
        return [retain_count * first_clear_price, retain_count * clear_avg_price];
    }

    IsNeedMonitor(this: GridTrading, table_index: number, is_sell: boolean, current_price: number, max_rise_pct: number): boolean
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

    IsDisableRow(this: GridTrading, table_index: number)
    {
        // 计算停止线的时候覆盖最低回撤价格的 5% 误差范围内
        const price_pct = ToNumber(this.trading_table[table_index][1]);
        if (price_pct < this.grid_settings.MINIMUM_BUY_PCT * 0.95)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    FindTradingGridRow(this: GridTrading, grid_name: string): string []
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

    FindTradingGridRowIndex(this: GridTrading, grid_name: string): number
    {
        for (let idx=0; idx<this.trading_table.length; idx++)
        {
            if (this.trading_table[idx][0] == grid_name)
            {
                return idx;
            }
        }
        return -1;
    }

    SortTradingTable(this: GridTrading)
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
