/**
 * 红利ETF再投计划
 * Dividend Reinvestment Plan（DRIP）
 * 记录红利标的的持仓记录, 区分分红再投资购买该标的持仓, 记录标的的历史分红收益
 */

import { Md5 } from "ts-md5/dist/md5";
import { PluginEnv } from "./plugin_env";
import { DebugLog } from "./remote_util";


class DividendStock {
    // 市场代号
    stock_code: number;
    // 名称
    stock_name: string;
    // 挂牌市场
    market_code: string;
    // 分红周期
    dividend_cycle: string;
    // 发行日期
    issue_date: string;
    // 资金规模
    fund_size: string;
    // 跟踪指数
    tracking_index: string
    // 最近分红日期
    recent_dividend_date: string
    // 最近分红金额
    recent_dividend_amount: number
    // 预计下次分红日期
    next_dividend_date: string
    // 历史累计分红次数
    total_dividend_count: number;
    // 历史累计分红金额
    total_dividend_amount: number;
    // 当前价格
    current_price: number;
    // 远端当前价格
    remote_current_price: number;
    // 买入数量
    total_buy_count: number;
    // 买入成本
    total_buy_cost: number;
    // 分红再投资购买数量
    drip_buy_count: number;
    // 分红再投资购买成本
    drip_buy_cost: number;
    // 累计分红金额
    total_dividend_earned: number;
    stock_overview: string[];
    holding_overview: string[];
    trading_record: string[][];

    constructor(stock_code: number, stock_name: string, market_code: string, current_price: number) {
        this.stock_code = stock_code;
        this.stock_name = stock_name;
        this.market_code = market_code;
        this.current_price = current_price;
        this.ResetStats();
    }

    ResetStats() {
        this.trading_record = [];
        this.total_buy_count = 0;
        this.total_buy_cost = 0;
        this.drip_buy_count = 0;
        this.drip_buy_cost = 0;
        this.total_dividend_earned = 0;
        this.recent_dividend_amount = 0;
        this.total_dividend_count = 0;
        this.total_dividend_amount = 0;
    }

    ParseRawData(strs: string[]) {
        // STOCK,510880,中证红利ETF,sh,每年4次,2024-06-01,100亿元,中证红利指数,2024-05-15,0.50,10,2.50
        // "基金代码", "基金简称", "交易方向", "交易日期", "交易价格", "交易数量", "交易金额"
        if (strs[0] === "STOCK") {
            this.stock_code = parseInt(strs[1]);
            this.stock_name = strs[2];
            this.market_code = strs[3];
            this.dividend_cycle = strs[4];
            this.issue_date = strs[5];
            this.fund_size = strs[6];
            this.tracking_index = strs[7];
            this.recent_dividend_date = strs[8];
            this.recent_dividend_amount = parseFloat(strs[9]);
            this.total_dividend_count = parseInt(strs[10]);
            this.total_dividend_amount = parseFloat(strs[11]);
        }
        if (strs[0] === "BBUY") {
            const buy_count = parseInt(strs[4]);
            const buy_price = parseFloat(strs[3]);
            this.total_buy_count += buy_count;
            this.total_buy_cost += buy_count * buy_price;
            this.trading_record.push([this.stock_code.toString(), this.stock_name, "本金买入", strs[2], strs[3], strs[4], (buy_count * buy_price).toFixed(0)]);
        }
        if (strs[0] === "SBUY") {
            const buy_count = parseInt(strs[4]);
            const buy_price = parseFloat(strs[3]);
            this.drip_buy_count += buy_count;
            this.drip_buy_cost += buy_count * buy_price;
            this.trading_record.push([this.stock_code.toString(), this.stock_name, "分红再投", strs[2], strs[3], strs[4], (buy_count * buy_price).toFixed(0)]);
        }
        if (strs[0] === "SELL") {
            const sell_count = parseInt(strs[4]);
            const sell_price = parseFloat(strs[3]);
            this.total_buy_count -= sell_count;
            this.total_buy_cost -= sell_count * sell_price;
            this.trading_record.push([this.stock_code.toString(), this.stock_name, "持仓卖出", strs[2], strs[3], strs[4], (sell_count * sell_price).toFixed(0)]);
        }
        if (strs[0] === "SHARE") {
            const dividend_amount = parseFloat(strs[3]);
            this.total_dividend_earned += dividend_amount;
            this.trading_record.push([this.stock_code.toString(), this.stock_name, "分红到账", strs[2], "0", "0", dividend_amount.toFixed(2)]);
        }
    }

    InitStockOverview(current_price: number) {
        this.current_price = current_price;
        // "基金代码", "基金名称", "分红周期", "发行日期", "资金规模", "跟踪指数", "最近分红日期", "最近分红金额", "历史累计分红次数", "历史累计分红金额"
        this.stock_overview = [this.stock_code.toString(), this.stock_name, this.dividend_cycle, this.issue_date,
                this.fund_size, this.tracking_index, this.recent_dividend_date,
                this.recent_dividend_amount.toFixed(4), this.total_dividend_count.toString(),
                this.total_dividend_amount.toFixed(4)];
        // "标的代码", "标的名称", "持仓数量", "持仓成本", "当前价格", "持仓市值", "分红持仓", "累计分红", "总持仓", "平均成本", "总市值", "浮盈金额", "浮盈比例"
        const total_count = this.total_buy_count + this.drip_buy_count;
        if (total_count <= 0) {
            this.holding_overview = [];
            return;
        }
        const total_cost = this.total_buy_cost + this.drip_buy_cost - this.total_dividend_earned;
        this.holding_overview = [this.stock_code.toString(), this.stock_name, this.total_buy_count.toString(), 
                (this.total_buy_cost / this.total_buy_count).toFixed(3), this.current_price.toFixed(3),
                (this.total_buy_count * this.current_price).toFixed(0),
                this.drip_buy_count.toString(), this.total_dividend_earned.toFixed(2),
                total_count.toFixed(0),
                (total_cost / total_count).toFixed(3),
                (total_count * this.current_price).toFixed(0),
                (total_count * this.current_price - total_cost).toFixed(0),
                ((total_count * this.current_price - total_cost) / total_cost * 100).toFixed(2) + "%"];
    }
}

export class DripTrading {
    plugin_env: PluginEnv;
    data_md5: string;
    stock_dict: Map<number, DividendStock> = new Map();
    stock_overview: string[][];
    holding_overview: string[][];
    trading_record: string[][];

    constructor(plugin_env: PluginEnv) {
        this.plugin_env = plugin_env;
    }

    ParseRawData(data: string): boolean {
        const new_md5 = Md5.hashStr(data).toString();
        if (this.data_md5 === new_md5) {
            return false; // Data has not changed
        }
        this.data_md5 = new_md5;
        this.stock_dict.clear();
        // Parse the raw data
        // STOCK,510880,中证红利ETF,sh,0/1/2,2024-06-01,1000000000,中证红利指数,2024-05-15,0.50,2024-11-15,2.50
        // BBUY,510880,2024-05-20,2.450,10000
        // SELL,510880,2024-06-10,2.600,5000
        // SHARE,510880,2024-05-15,24567
        // SBUY,510880,2024-05-25,2.480,5000
        const lines = data.split("\n");
        for (const line of lines) {
            const strs = line.split(",");
            if (strs[0] === "STOCK") {
                const stock_code = parseInt(strs[1]);
                if (!this.stock_dict.has(stock_code)) {
                    let current_price = this.plugin_env.GetStockRemotePrice(strs[3] + String(stock_code));
                    if (current_price < 0) {
                        current_price = 1.0;
                    }
                    const stock = new DividendStock(stock_code, strs[2], strs[3], current_price);
                    stock.ParseRawData(strs);
                    this.stock_dict.set(stock_code, stock);
                }
                else {
                    this.stock_dict.get(stock_code)?.ResetStats();
                    this.stock_dict.get(stock_code)?.ParseRawData(strs);
                }
            }
            if (strs[0] === "BBUY" || strs[0] === "SBUY" || strs[0] === "SELL" || strs[0] === "SHARE") {
                const stock_code = parseInt(strs[1]);
                this.stock_dict.get(stock_code)?.ParseRawData(strs);
            }
        }
        return true;
    }

    InitDripTrading() {
        this.stock_overview = [["基金代码", "基金简称", "分红周期", "发行日期", "资金规模", "跟踪指数", "最近分红日期", "最近分红金额", "历史累计分红次数", "历史累计分红金额"]];
        this.holding_overview = [["基金代码", "基金简称", "持仓数量", "持仓成本", "当前价格", "持仓市值", "分红持仓", "累计分红", "总持仓", "平均成本", "总市值", "浮盈金额", "浮盈比例"]];
        this.trading_record = [["基金代码", "基金简称", "交易方向", "交易日期", "交易价格", "交易数量", "交易金额"]];
        for (const stock of this.stock_dict.values()) {
            let current_price = this.plugin_env.GetStockRemotePrice(stock.market_code + String(stock.stock_code));
            if (current_price < 0) {
                current_price = stock.current_price;
            }
            stock.InitStockOverview(current_price);
            this.stock_overview.push(stock.stock_overview);
            if (stock.total_buy_count + stock.drip_buy_count > 0) {
                this.holding_overview.push(stock.holding_overview);
            }
            if (stock.trading_record.length > 0) {
                this.trading_record = this.trading_record.concat(stock.trading_record);
            }
        }
    }

    GetStockCodeList(): string[] {
        const stock_code_list: string[] = [];
        for (const stock of this.stock_dict.values()) {
            stock_code_list.push(stock.market_code + stock.stock_code.toString());
        }
        return stock_code_list;
    }
}