/*
    网格策略的总览视图
*/
import { TextFileView, WorkspaceLeaf, TFile, TFolder, Vault } from "obsidian";
import { GRID_COLOR_STOCK_OVERVIEW, GRID_COLOR_TABLE_TITLE, GRID_COLOR_BUY_OVERVIEW, GRID_COLOR_SELL_OVERVIEW } from "./settings";
import { GridTrading } from "./grid_trading";
import { PluginEnv, FETCH_CURRENT_PRICE } from "./plugin_env";
import { StringPlus, ToPercent, ToTradingGap } from "./mymath";

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
    income_overview: string [][];

    overview_title_el: HTMLElement;
    overview_table_el: HTMLElement;
    custom_title_el: HTMLElement;
    custom_table_el: HTMLElement;
    income_title_el: HTMLElement;
    income_table_el: HTMLElement;
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
    }

    ReadCustomStock()
    {
        this.income_overview = [["", "占用本金", "实际金额", "持仓盈亏", "盈亏比例", "投入资金", "投入盈亏"]];
        this.income_overview.push(["当前持仓", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["累积筹码", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["最大回撤", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["反弹清格", "0", "0", "0", "0", "0", "0"]);
        this.income_overview.push(["获利清盘", "0", "0", "0", "0", "0", "0"]);
        const stock_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "首网目标价", "当前价格", "价格百分位", "持仓股数", "消耗本金", "盈亏比率", "累积筹码"]];
        let buy_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "距成交价"]];
        let sell_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "距成交价"]];
        const grid_folder = this.vault.getAbstractFileByPath('GridTrading');
        if (grid_folder instanceof TFolder)
        {
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];
                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    const grid_trading = this.plugin_env.grid_trading_dict.get(grid_file.name);
                    if (grid_trading instanceof GridTrading && grid_trading.IsStock())
                    {
                        grid_trading.InitTradingOverview()
                        stock_table.push(grid_trading.stock_overview);
                        buy_table = buy_table.concat(grid_trading.stock_buy_overview);
                        sell_table = sell_table.concat(grid_trading.stock_sell_overview);
                        const trading_income = grid_trading.trading_income;
                        for (let idx=1; idx<=5; idx++)
                        {
                            this.income_overview[idx][1] = StringPlus(this.income_overview[idx][1], trading_income[idx][2], 1);
                            this.income_overview[idx][2] = StringPlus(this.income_overview[idx][2], trading_income[idx][4], 1);
                            this.income_overview[idx][3] = StringPlus(this.income_overview[idx][3], trading_income[idx][6], 1);
                            this.income_overview[idx][5] = StringPlus(this.income_overview[idx][5], trading_income[idx][8], 1);
                        }
                    }
                }
            }
        }
        for (let idx=1; idx<=5; idx++)
        {
            this.income_overview[idx][4] = ToTradingGap(Number(this.income_overview[idx][1]), Number(this.income_overview[idx][2]), 2);
            this.income_overview[idx][6] = ToTradingGap(Number(this.income_overview[idx][5]), Number(this.income_overview[idx][5]) + Number(this.income_overview[idx][3]), 2);
        }
        this.custom_stock_overview = [...stock_table, ...buy_table, ...sell_table];
    }

    SumupAllStock()
    {
        this.stock_overview = [];
        let stock_count: number = 0;
        let buy_monitor_count: number = 0;
        let sell_monitor_count: number = 0;
        let buy_cost_list: number [] = [];

        for(let idx=0; idx<this.custom_stock_overview.length; idx++)
        {
            const stock = this.custom_stock_overview[idx];
            if (stock[0] == GRID_COLOR_STOCK_OVERVIEW)
            {
                stock_count++;
            }
            if (stock[0] == GRID_COLOR_SELL_OVERVIEW)
            {
                sell_monitor_count++;
            }
            if (stock[0] == GRID_COLOR_BUY_OVERVIEW)
            {
                if (stock.length > 4)
                {
                    buy_monitor_count++;
                    buy_cost_list.push(Number(stock[8]));
                }
            }
        }
        let total_cost = 0;
        let top5_cost = 0;
        buy_cost_list.sort((a, b) => b - a);
        buy_cost_list.forEach((val, idx) => total_cost = total_cost + val);
        buy_cost_list.forEach((val, idx) => {if (idx < 5) top5_cost = top5_cost + val});
        this.stock_overview.push(["标的总数", "卖出监控格数", "买入监控格数", "买入单成交总额", "TOP5买入成交总额"]);
        this.stock_overview.push([String(stock_count), String(sell_monitor_count), String(buy_monitor_count), String(total_cost), String(top5_cost)]);
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
        this.income_title_el = div.createEl("h1");
        this.income_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.custom_title_el = div.createEl("h1");
        this.custom_table_el = div.createEl("table");

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
    
        // 盈亏总览
        this.income_title_el.setText("盈亏总览");
        this.income_table_el.empty();
        this.DisplayTable(this.income_table_el, this.income_overview, false);

        // 标的信息
        this.custom_title_el.setText("我的网格");
        this.custom_table_el.empty();
        this.DisplayTable(this.custom_table_el, this.custom_stock_overview, true);
    
        // 调试信息
        this.debug_log_title_el.setText("调试日志");
        this.debug_log_table_el.empty();
        this.DisplayTable(this.debug_log_table_el, this.debug_log, false);
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