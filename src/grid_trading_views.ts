/*
    网格策略视图生成（视图 mixin）
    各视图表格的生成方法，挂在 GridTrading 基类上
*/
import { ROW_TYPE_STOCK, ROW_TYPE_BUY, ROW_TYPE_SELL, CELL_SELL_MONITOR } from "./settings";
import { CELL_BUY_MONITOR, CELL_BUY_TRIGGERED, CELL_SELL_TRIGGERED } from "./settings";
import { PERFIT_TYPE_NAME_STR } from "./lang_str";
import { MyFloor, MyCeil, ToPercent, ToNumber, ToTradingGap, TimeDuarion, AveragePriceStr, FixedPrice, NextInterestDate, ProportionPctStr, IsNumeric, AlignPrice, GetTodayStr } from "./mymath";
import type { GridTrading } from "./grid_trading";


export class GridTradingViews
{
    InitTradingOverview(this: GridTrading)
    {
        let paper_gain_ratio = ToTradingGap(this.total_cost, this.total_hold * this.current_price, 2);
        if (this.total_cost < 0)
        {
            paper_gain_ratio = "+ ∞";
        }
        this.stock_overview = [ROW_TYPE_STOCK, String(this.target_stock), this.stock_name, this.target_price.toFixed(3), this.current_price.toFixed(3),
                ToPercent(this.current_price / this.target_price, 1), String(this.total_hold), String(this.total_cost),
                paper_gain_ratio, this.trading_income[5][10]];
        this.stock_buy_overview = [];
        if (this.buy_monitor_rows.length > 0 && !(this.is_pause || this.is_clear || this.is_cancel))
        {
            for (let idx=0; idx<this.buy_monitor_rows.length; idx++)
            {
                const row = this.buy_monitor_rows[idx];
                this.stock_buy_overview.push([ROW_TYPE_BUY, String(this.target_stock), this.stock_name, this.trading_table[row][0], this.trading_table[row][1], this.trading_table[row][2], this.trading_table[row][3], this.trading_table[row][4], this.trading_table[row][5], this.trading_table[row][10]]);
            }
        }
        this.stock_sell_overview = [];
        for (let idx=0; idx<this.sell_monitor_rows.length; idx++)
        {
            const row = this.sell_monitor_rows[idx];
            this.stock_sell_overview.push([ROW_TYPE_SELL, String(this.target_stock), this.stock_name, this.trading_table[row][0], this.trading_table[row][1], this.trading_table[row][6], this.trading_table[row][7], this.trading_table[row][8], this.trading_table[row][9], this.trading_table[row][11]]);
        }

        if (this.stock_active_filled_record.length > 0)
        {
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

    InitStockTable(this: GridTrading)
    {
        // 最高卖出价为清网价（遍历 trading_table 取最高卖出价）
        this.empty_price = 0;
        for (let idx=1; idx<this.trading_table.length; idx++)
        {
            if (Number(this.trading_table[idx][7]) > this.empty_price)
            {
                this.empty_price = Number(this.trading_table[idx][7]);
            }
        }
        // 清仓平均价与清仓最高价
        const clear_pct = this.grid_settings.CLEAR_STEP_PCT;
        this.clear_avg_price = Number((this.CalcClearPrice(clear_pct, 1) * 0.4 + this.CalcClearPrice(clear_pct, 2) * 0.6).toFixed(this.grid_settings.TRADING_PRICE_PRECISION));
        this.take_profit_price = this.CalcClearPrice(clear_pct, 1);
        this.clear_price = this.CalcClearPrice(clear_pct, 2);
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
        // 增加强制监控网格
        for (let idx=0; idx<this.force_view_grid_list.length; idx++)
        {
            const row = this.FindTradingGridRowIndex(this.force_view_grid_list[idx]);
            if (row < 0 || this.buy_monitor_rows.includes(row))
            {
                continue;
            }
            this.buy_monitor_rows.push(row);
        }
    }

    InitGridParam(this: GridTrading)
    {
        this.param_table = [
            ["首网目标金额", String(this.grid_settings.ONE_GRID_LIMIT), "最大回撤值", ToPercent(this.grid_settings.MAX_SLUMP_PCT), "最大涨跌幅", ToPercent(this.grid_settings.MAX_RISE_PCT)],
            ["触发价加点", String(this.grid_settings.TRIGGER_ADD_POINT), "每手份数额", String(this.grid_settings.MIN_BATCH_COUNT), "交易价精度", String(this.grid_settings.TRADING_PRICE_PRECISION)],
        ];
    }

    InitTradingAnalysis(this: GridTrading)
    {
        const price = this.target_price;
        // 反弹目标涨幅 = 首网卖出价涨幅（第0格价格位 - 1）
        const rise_pct = ToNumber(this.sgrid_step_table[0][1]) - 1;
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

    InitTradingRecord(this: GridTrading)
    {
        // 调整记录
        const precision = this.grid_settings.TRADING_PRICE_PRECISION;
        let adjust_price = 0;
        let adjust_count = 0;
        let adjust_cost = 0;
        this.adjust_record = [["调整日期", "调整类型", "调整内容","交易价格", "交易股数", "消耗本金"]];
        for (let idx=0; idx<this.raw_adjust_record.length; idx++)
        {
            if (IsNumeric(this.raw_adjust_record[idx][3]))
            {
                adjust_price = Number(this.raw_adjust_record[idx][3]);
            }
            else
            {
                adjust_price = 0;
            }
            if (IsNumeric(this.raw_adjust_record[idx][4]))
            {
                adjust_count = Number(this.raw_adjust_record[idx][4]);
            }
            else
            {
                adjust_count = 0;
            }
            adjust_cost = Math.ceil(adjust_price * adjust_count);
            if (adjust_cost != 0)
            {
                this.adjust_record.push([this.raw_adjust_record[idx][0], this.raw_adjust_record[idx][1], this.raw_adjust_record[idx][2], adjust_price.toFixed(precision), String(adjust_count), String(adjust_cost)]);
            }
            else
            {
                this.adjust_record.push([this.raw_adjust_record[idx][0], this.raw_adjust_record[idx][1], this.raw_adjust_record[idx][2], "-", "-", "-"]);
            }
        }
        // 交易记录
        this.total_retain = 0;
        this.retain_cost = 0;
        this.total_cost = 0;
        this.total_hold = 0;
        this.trading_record = [["交易方向", "交易日期", "网格类型", "交易价格", "交易股数", "消耗本金", "累积筹码", "持仓时长"]];
        this.stock_passive_filled_record = [];
        this.stock_active_filled_record = [];
        this.holding_record = [];
        this.clear_sell_record.clear();
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
                    this.stock_passive_filled_record.push([ROW_TYPE_BUY, String(this.target_stock), this.stock_name, raw_record[idx][2], "", "", "", "", "", "", "", ""])
                }
                if (raw_record[idx][2].startsWith("补仓"))
                {
                    this.stock_active_filled_record.push([ROW_TYPE_SELL, String(this.target_stock), this.stock_name, raw_record[idx][2], raw_record[idx][1], raw_record[idx][3], raw_record[idx][4], String(cost_count), "", "", ""])
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
                        this.retain_cost = this.retain_cost - Math.floor(Number(raw_record[idx][3]) * Number(raw_record[idx][4]));
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
        for (let index=1; index<=2; index++)
        {
            let sell_count = MyFloor((this.total_retain + retain_sell) * 0.4, this.grid_settings.MIN_BATCH_COUNT);
            if (index == 2)
            {
                sell_count = this.total_retain + retain_sell - sell_count;
            }
            const row = this.GenerateClearRow(PERFIT_TYPE_NAME_STR, index, this.grid_settings.CLEAR_STEP_PCT, sell_count);
            this.trading_table.push(row);
            if (Number(row[8]) <= 0)
            {
                continue;
            }
            if (current_pct + this.grid_settings.MAX_RISE_PCT >= ToNumber(row[1]) || this.sell_monitor_rows.length <= 0)
            {
                this.sell_monitor_rows.push(this.trading_table.length - 1);
            }
            this.sell_triggered_rows.push(this.trading_table.length - 1);
        }
    }

    InitTradingInterest(this: GridTrading)
    {
        // APY,2025-10-01,0.980,324568,0.720,13500,80%,0
        // 计息日期,当时首网价,当时持仓金额,买入价格,买入份数,止盈价位,卖出价格
        // APY,2025-12-09,0.951,325700,0.754,50100,110%,0
        this.trading_interest = [];
        this.trading_interest.push([ROW_TYPE_STOCK, "计息日期", "当时持仓", "当时价位", "买入价格", "买入份数", "买入金额", "投入比例", 
                "止盈价位", "止盈价格", "卖出价格", "卖出份数", "卖出金额", "卖出收益", "年化收益"]);
        for (let idx=0; idx<this.raw_interest_record.length; idx++)
        {
            const row = this.raw_interest_record[idx];
            const fst_price = Number(row[1]);
            const hold_count = Number(row[2]);
            const buy_price = Number(row[3]);
            const buy_count = Number(row[4]);
            const profit_price_pct = ToNumber(row[5]);
            const sell_price = Number(row[6]);
            const profit_price = AlignPrice(fst_price * profit_price_pct, this.grid_settings.TRADING_PRICE_PRECISION)
            const hold_cost = MyFloor(buy_price * hold_count, 1);
            const buy_cost = MyFloor(buy_price * buy_count, 1);
            let sell_price_str = "-";
            let sell_gain = MyFloor(profit_price * buy_count, 1);
            let color = CELL_SELL_TRIGGERED;
            if (this.current_price * (1.0 + this.grid_settings.MAX_RISE_PCT) >= profit_price)
            {
                color = CELL_SELL_MONITOR;
            }
            if (sell_price > 0)
            {
                sell_price_str = row[6];
                sell_gain = MyFloor(sell_price * buy_count, 1);
                color = CELL_BUY_TRIGGERED;
            }
            this.trading_interest.push([color, row[0], row[2], ToPercent(buy_price / fst_price, 0), row[3], row[4], String(buy_cost), ToPercent(buy_cost / hold_cost, 2),
                    row[5], String(profit_price), sell_price_str, row[4], String(sell_gain), String(sell_gain - buy_cost), ToPercent((sell_gain - buy_cost) / hold_cost, 1)]);
        }
        if (this.total_hold <= 0 || this.current_price / this.target_price > this.grid_settings.INTEREST_TRIGGER)
        {
            return;
        }
        const next_date = NextInterestDate(this.grid_settings.INTEREST_YEAR, this.raw_interest_record.length);
        const current_pct = this.current_price / this.target_price;
        const profit_pct = (Math.floor(current_pct * 10) + 4) / 10.0;
        const buy_count = MyFloor((this.total_hold * this.grid_settings.INTEREST_RATE) / (profit_pct / current_pct - 1.0) / this.current_price, this.grid_settings.MIN_BATCH_COUNT)
        const sell_price = AlignPrice(this.target_price * profit_pct, this.grid_settings.TRADING_PRICE_PRECISION);
        const sell_income = (sell_price - this.current_price) * buy_count;
        let color = ROW_TYPE_STOCK;
        if (GetTodayStr() > next_date)
        {
            color = CELL_SELL_MONITOR;
        }
        this.trading_interest.push([color, "**" + next_date, String(this.total_hold), ToPercent(current_pct, 0), String(this.current_price), String(buy_count), (this.current_price * buy_count).toFixed(0),
                ToPercent(this.current_price * buy_count / this.total_hold, 2), ToPercent(profit_pct, 0), String(sell_price), "-", String(buy_count), (sell_price * buy_count).toFixed(0),
                sell_income.toFixed(0), ToPercent(sell_income / this.total_hold, 2)]);
    }

    InitTradingIncome(this: GridTrading)
    {
        this.trading_income = [];
        this.trading_income.push(["", "持仓股数", "占用本金", "持仓金额", "持仓均价", "实际价格", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]);
        this.trading_income.push(this.GenerateIncomeRow("累计筹码", this.total_retain, this.retain_cost, this.current_price, this.retain_cost, 0, 0));

        let need_slump = !this.is_pause
        // 当前持仓
        this.CalcTradingIncome("当前", this.current_price / this.target_price, this.empty_price, this.clear_avg_price, this.take_profit_price, this.clear_price, false);
        // 短期回调
        this.CalcTradingIncome("回调", this.grid_settings.BOTTOM_BUY_PCT, this.empty_price, this.clear_avg_price, this.take_profit_price, this.clear_price, need_slump);
        // 最大回撤
        this.CalcTradingIncome("最大", this.grid_settings.MINIMUM_BUY_PCT, this.empty_price, this.clear_avg_price, this.take_profit_price, this.clear_price, need_slump);
    }

    InitHoldingAnalysis(this: GridTrading)
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
}
