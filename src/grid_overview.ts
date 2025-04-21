/*
    网格策略的总览视图
*/
import { TextFileView, WorkspaceLeaf, TFile, TFolder, Vault } from "obsidian";
import { GRID_COLOR_STOCK_OVERVIEW, GRID_COLOR_TABLE_TITLE, GRID_COLOR_BUY_OVERVIEW, GRID_COLOR_SELL_OVERVIEW } from "./settings";
import { GridTrading } from "./grid_trading";
import { PluginEnv, FETCH_CURRENT_PRICE } from "./plugin_env";
import { StringPlus, ToPercent, ToTradingGap, ProportionPctStr } from "./mymath";

export const VIEW_TYPE_GTO = "gto-view"

export class GTOView extends TextFileView
{
    data: string;
    vault: Vault;
    plugin_env: PluginEnv;
    refresh_event_guid: number;

    debug_log: string [][];
    stock_overview: string [][];
    custom_stock_overview: string [][];
    stock_filled_overview: string [][];
    income_overview: string [][];
    holding_overview: string [][];
    mgrid_buy_total_cost: number;
    lgrid_buy_total_cost: number;

    overview_title_el: HTMLElement;
    overview_table_el: HTMLElement;
    custom_title_el: HTMLElement;
    custom_table_el: HTMLElement;
    filled_tile_el: HTMLElement;
    filled_table_el: HTMLElement;
    income_title_el: HTMLElement;
    income_table_el: HTMLElement;
    holding_title_el: HTMLElement;
    holding_table_el: HTMLElement;
    debug_log_title_el: HTMLElement;
    debug_log_table_el: HTMLElement;

    constructor(leaf: WorkspaceLeaf, vault: Vault, plugin_env: PluginEnv)
    {
        super(leaf);
        this.vault = vault;
        this.plugin_env = plugin_env;
        this.refresh_event_guid = -1;

        this.debug_log = [];
        this.stock_overview = [];
        this.custom_stock_overview = [];
        this.income_overview = [];
        this.holding_overview = [];
    }

    ReadCustomStock()
    {
        this.holding_overview = [["筹码类型", "占用本金", "持仓金额", "持仓盈亏", "清格盈利", "清仓盈利", "持仓占比", "本金占比"]]
        this.holding_overview.push(["总额", "0", "0", "0", "0", "0", "0", "0"]);
        this.holding_overview.push(["小网", "0", "0", "0", "0", "0", "0", "0"]);
        this.holding_overview.push(["中网", "0", "0", "0", "0", "0", "0", "0"]);
        this.holding_overview.push(["大网", "0", "0", "0", "0", "0", "0", "0"]);
        this.holding_overview.push(["累积", "0", "0", "0", "0", "0", "0", "0"]);
        this.holding_overview.push(["补仓", "0", "0", "0", "0", "0", "0", "0"]);
        this.income_overview = [["", "占用本金", "持仓金额", "持仓盈亏", "投入资金", "账面资金", "投入盈亏", "投入仓位"]];
        this.income_overview.push(["累积筹码", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["当前持仓", "0", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["当前清格", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["当前清仓", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["回调持仓", "0", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["回调清格", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["回调清盘", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["最大持仓", "0", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["最大清格", "0", "0", "0", "0", "0", "0", "-"]);
        this.income_overview.push(["最大清盘", "0", "0", "0", "0", "0", "0", "-"]);
        const stock_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "首网目标价", "当前价格", "价格百分位", "持仓股数", "消耗本金", "盈亏比率", "回调仓位"]];
        let buy_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "距成交价"]];
        let sell_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "距成交价"]];
        let passive_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "买入价格", "买入份数", "买入金额", "当前价格", "当前跌幅", "卖出价格", "卖出涨幅"]];
        let active_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "交易日期", "买入价格", "买入份数", "买入金额", "当前价格", "持仓收益", "卖出份数", "累积筹码"]];
        const grid_folder = this.vault.getAbstractFileByPath('GridTrading');
        let grid_file_names: string [] = [];
        if (grid_folder instanceof TFolder)
        {
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];
                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    grid_file_names.push(grid_file.name);
                }
            }
        }
        grid_file_names.sort();
        for (let idx=0; idx<grid_file_names.length; idx++)
        {
            const grid_trading = this.plugin_env.grid_trading_dict.get(grid_file_names[idx]);
            if (grid_trading instanceof GridTrading && grid_trading.IsStock() && !grid_trading.is_debug)
            {
                grid_trading.InitTradingOverview()
                stock_table.push(grid_trading.stock_overview);
                buy_table = buy_table.concat(grid_trading.stock_buy_overview);
                sell_table = sell_table.concat(grid_trading.stock_sell_overview);
                passive_table = passive_table.concat(grid_trading.stock_passive_filled_record);
                active_table = active_table.concat(grid_trading.stock_active_filled_record);
                const trading_income = grid_trading.trading_income;
                for (let idx=1; idx<=10; idx++)
                {
                    this.income_overview[idx][1] = StringPlus(this.income_overview[idx][1], trading_income[idx][2], 1);
                    this.income_overview[idx][2] = StringPlus(this.income_overview[idx][2], trading_income[idx][3], 1);
                    this.income_overview[idx][3] = StringPlus(this.income_overview[idx][3], trading_income[idx][6], 1);
                    this.income_overview[idx][4] = StringPlus(this.income_overview[idx][4], trading_income[idx][7], 1);
                    this.income_overview[idx][5] = StringPlus(this.income_overview[idx][5], trading_income[idx][8], 1);
                }
                const trading_holding = grid_trading.holding_analysis;
                for (let idx=1; idx<=6; idx++)
                {
                    this.holding_overview[idx][1] = StringPlus(this.holding_overview[idx][1], trading_holding[idx][2], 1);
                    this.holding_overview[idx][2] = StringPlus(this.holding_overview[idx][2], trading_holding[idx][3], 1);
                    this.holding_overview[idx][3] = StringPlus(this.holding_overview[idx][3], trading_holding[idx][6], 1);
                    this.holding_overview[idx][4] = StringPlus(this.holding_overview[idx][4], trading_holding[idx][7], 1);
                    this.holding_overview[idx][5] = StringPlus(this.holding_overview[idx][5], trading_holding[idx][8], 1);
                }
            }
        }
        let current_cost = Number(this.income_overview[2][1]);
        let current_hold = Number(this.income_overview[2][2]);
        for (let idx=1; idx<=10; idx++)
        {
            this.income_overview[idx][6] = ToPercent(Number(this.income_overview[idx][3]) / Number(this.income_overview[idx][4]), 2);
            if (this.income_overview[idx][7] != "-")
            {
                this.income_overview[idx][7] = ToPercent(current_cost / Number(this.income_overview[idx][4]));
            }
        }
        for (let idx=1; idx<=6; idx++)
        {
            this.holding_overview[idx][6] = ProportionPctStr(Number(this.holding_overview[idx][2]), current_hold, 2);
            this.holding_overview[idx][7] = ProportionPctStr(Number(this.holding_overview[idx][1]), current_cost, 2);
        }
        this.custom_stock_overview = [...stock_table, ...buy_table, ...sell_table];
        this.stock_filled_overview = [...passive_table, ...active_table];
    }

    SumupAllStock()
    {
        this.stock_overview = [
                                ["标的总数", ""],
                                ["买入监控", ""],
                                ["卖出监控", ""],
                                ["", "买入总额", "-5%买入总额", "-3%买入总额", "+3%卖出总额", "+5%卖出总额", "卖出总额"],
                                ["全部", "0", "0", "0", "0", "0", "0"],
                                ["小网", "0", "0", "0", "0", "0", "0"],
                                ["中网", "0", "0", "0", "0", "0", "0"],
                                ["大网", "0", "0", "0", "0", "0", "0"],
                            ];
        let stock_count: number = 0;
        let buy_monitor_count: number = 0;
        let sell_monitor_count: number = 0;

        for(let idx=0; idx<this.custom_stock_overview.length; idx++)
        {
            const stock = this.custom_stock_overview[idx];
            if (stock[0] == GRID_COLOR_STOCK_OVERVIEW)
            {
                stock_count++;
            }
            if (stock[0] == GRID_COLOR_BUY_OVERVIEW)
            {
                buy_monitor_count++;

                this.stock_overview[4][1] = StringPlus(this.stock_overview[4][1], stock[8], 1);
                if (stock[3].startsWith("小网"))
                {
                    this.stock_overview[5][1] =  StringPlus(this.stock_overview[5][1], stock[8], 1);
                }
                if (stock[3].startsWith("中网"))
                {
                    this.stock_overview[6][1] =  StringPlus(this.stock_overview[6][1], stock[8], 1);
                }
                if (stock[3].startsWith("大网"))
                {
                    this.stock_overview[7][1] =  StringPlus(this.stock_overview[7][1], stock[8], 1);
                }
                const trading_gap = Number(stock[9].replace("%", "").replace("+", ""));
                if ( trading_gap > -3)
                {
                    this.stock_overview[4][3] = StringPlus(this.stock_overview[4][3], stock[8], 1);
                    if (stock[3].startsWith("小网"))
                    {
                        this.stock_overview[5][3] =  StringPlus(this.stock_overview[5][3], stock[8], 1);
                    }
                    if (stock[3].startsWith("中网"))
                    {
                        this.stock_overview[6][3] =  StringPlus(this.stock_overview[6][3], stock[8], 1);
                    }
                    if (stock[3].startsWith("大网"))
                    {
                        this.stock_overview[7][3] =  StringPlus(this.stock_overview[7][3], stock[8], 1);
                    }
                }
                if (trading_gap > -5)
                {
                    this.stock_overview[4][2] = StringPlus(this.stock_overview[4][2], stock[8], 1);
                    if (stock[3].startsWith("小网"))
                    {
                        this.stock_overview[5][2] =  StringPlus(this.stock_overview[5][2], stock[8], 1);
                    }
                    if (stock[3].startsWith("中网"))
                    {
                        this.stock_overview[6][2] =  StringPlus(this.stock_overview[6][2], stock[8], 10);
                    }
                    if (stock[3].startsWith("大网"))
                    {
                        this.stock_overview[7][2] =  StringPlus(this.stock_overview[7][2], stock[8], 1);
                    }
                }
            }
            if (stock[0] == GRID_COLOR_SELL_OVERVIEW)
            {
                sell_monitor_count++;

                this.stock_overview[4][6] = StringPlus(this.stock_overview[4][6], stock[8], 1);
                if (stock[3].startsWith("小网"))
                {
                    this.stock_overview[5][6] =  StringPlus(this.stock_overview[5][6], stock[8], 1);
                }
                if (stock[3].startsWith("中网"))
                {
                    this.stock_overview[6][6] =  StringPlus(this.stock_overview[6][6], stock[8], 1);
                }
                if (stock[3].startsWith("大网"))
                {
                    this.stock_overview[7][6] =  StringPlus(this.stock_overview[7][6], stock[8], 1);
                }
                const trading_gap = Number(stock[9].replace("%", "").replace("+", ""));
                if (trading_gap < 3)
                {
                    this.stock_overview[4][4] = StringPlus(this.stock_overview[4][4], stock[8], 1);
                    if (stock[3].startsWith("小网"))
                    {
                        this.stock_overview[5][4] =  StringPlus(this.stock_overview[5][4], stock[8], 1);
                    }
                    if (stock[3].startsWith("中网"))
                    {
                        this.stock_overview[6][4] =  StringPlus(this.stock_overview[6][4], stock[8], 1);
                    }
                    if (stock[3].startsWith("大网"))
                    {
                        this.stock_overview[7][4] =  StringPlus(this.stock_overview[7][4], stock[8], 1);
                    }
                }
                if (trading_gap < 5)
                {
                    this.stock_overview[4][5] = StringPlus(this.stock_overview[4][5], stock[8], 1);
                    if (stock[3].startsWith("小网"))
                    {
                        this.stock_overview[5][5] =  StringPlus(this.stock_overview[5][5], stock[8], 1);
                    }
                    if (stock[3].startsWith("中网"))
                    {
                        this.stock_overview[6][5] =  StringPlus(this.stock_overview[6][5], stock[8], 1);
                    }
                    if (stock[3].startsWith("大网"))
                    {
                        this.stock_overview[7][5] =  StringPlus(this.stock_overview[7][5], stock[8], 1);
                    }
                }
            }
        }
        this.stock_overview[0][1] = String(stock_count);
        this.stock_overview[1][1] = String(buy_monitor_count);
        this.stock_overview[2][1] = String(sell_monitor_count);
    }

    DebugLog(level: string, log_str: string, extra_info: string)
    {
        this.debug_log.push([level, log_str, extra_info]);
    }

    getViewData(): string
    {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void
    {
        this.data = data;
        this.Refresh();
    }

    clear(): void
    {
        this.data = "";
    }

    getViewType(): string
    {
        return VIEW_TYPE_GTO;
    }

    protected async onOpen(): Promise<void> 
    {
        let div = this.contentEl.createEl("div");
        this.overview_title_el = div.createEl("h1");
        this.overview_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.holding_title_el = div.createEl("h1");
        this.holding_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.income_title_el = div.createEl("h1");
        this.income_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.custom_title_el = div.createEl("h1");
        this.custom_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.filled_tile_el = div.createEl("h1");
        this.filled_table_el = div.createEl("table");

        div = this.contentEl.createEl("div")
        this.debug_log_title_el = div.createEl("h1");
        this.debug_log_table_el = div.createEl("table");

        this.refresh_event_guid = this.plugin_env.SubscribeEvent(FETCH_CURRENT_PRICE, ()=>this.Refresh());
    }

    protected async onClose(): Promise<void>
    {
        this.contentEl.empty();  
        
        if (this.refresh_event_guid > 0)
        {
            this.plugin_env.UnsubscribeEvent(FETCH_CURRENT_PRICE, this.refresh_event_guid);
            this.refresh_event_guid = -1;
        }
    }

    Refresh()
    {
        this.ReadCustomStock();
        this.SumupAllStock();
        // 标的总览
        this.overview_title_el.setText("网格总览");
        this.overview_table_el.empty();
        this.DisplayTable(this.overview_table_el, this.stock_overview, false);

        // 持仓分析
        this.holding_title_el.setText("持仓分析");
        this.holding_table_el.empty();
        this.DisplayTable(this.holding_table_el, this.holding_overview, false);

        // 盈亏总览
        this.income_title_el.setText("盈亏总览");
        this.income_table_el.empty();
        this.DisplayTable(this.income_table_el, this.income_overview, false);

        // 标的信息
        this.custom_title_el.setText("我的网格");
        this.custom_table_el.empty();
        this.DisplayTable(this.custom_table_el, this.custom_stock_overview, true);

        // 补仓/加仓信息
        this.filled_tile_el.setText("补仓信息");
        this.filled_table_el.empty();
        this.DisplayTable(this.filled_table_el, this.stock_filled_overview, true);

        // 调试信息
        // this.debug_log_title_el.setText("调试日志");
        // this.debug_log_table_el.empty();
        // this.DisplayTable(this.debug_log_table_el, this.debug_log, false);
    }

    DisplayTable(table_el: HTMLElement, table: string[][], is_color: boolean)
    {
        const table_body = table_el.createEl("tbody");
        table.forEach((row, i) => {
            const table_row = table_body.createEl("tr");
    
            row.forEach((cell, j) => {
                if (is_color)
                {
                    if (j > 0) 
                    {
                        table_row.createEl("td", { text: cell, attr: {"bgColor": table[i][0], "align": "right"}});
                    }
                }
                else
                {
                    table_row.createEl("td", { text: cell, attr: {"align": "right"}});
                }
            });
        });
    }
}