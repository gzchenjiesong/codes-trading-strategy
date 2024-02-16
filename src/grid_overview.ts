/*
    网格策略的总览视图
*/
import { TextFileView, WorkspaceLeaf, TFile, TFolder, Vault } from "obsidian";
import { GRID_COLOR_STOCK_OVERVIEW, GRID_COLOR_TABLE_TITLE, GRID_COLOR_BUY_OVERVIEW, GRID_COLOR_SELL_OVERVIEW } from "./settings";
import { GridTrading } from "./grid_trading";
import { PluginEnv, FETCH_CURRENT_PRICE } from "./plugin_env";
import { ToPercent, ToTradingGap } from "./mymath";

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
    appoint_stock_overview: string [][];

    overview_title_el: HTMLElement;
    overview_table_el: HTMLElement;
    custom_title_el: HTMLElement;
    custom_table_el: HTMLElement;
    appoint_title_el: HTMLElement;
    appoint_table_el: HTMLElement;
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
        this.appoint_stock_overview = [];
    }

    ReadCustomStock()
    {
        const stock_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "首网目标价", "当前价格", "价格百分位"]];
        let buy_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "距成交价"]];
        let sell_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "距成交价"]];
        const grid_folder = this.vault.getAbstractFileByPath('GridTrading');
        if (grid_folder instanceof TFolder)
        {
            //this.DebugLog("Info", "file count ", String(grid_folder.children.length));
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];
                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    //this.DebugLog("Info", "file name" + String(index), grid_file.name);
                    const grid_trading = this.plugin_env.grid_trading_dict.get(grid_file.name);
                    if (grid_trading instanceof GridTrading && grid_trading.is_empty == false)
                    {
                        //this.DebugLog("Info", "grid_trading info ", grid_trading.GetTradingTitle());
                        grid_trading.InitTradingOverview()
                        stock_table.push(grid_trading.stock_overview);
                        buy_table = buy_table.concat(grid_trading.stock_buy_overview);
                        sell_table = sell_table.concat(grid_trading.stock_sell_overview);
                    }
                }
            }
        }
        this.custom_stock_overview = [...stock_table, ...buy_table, ...sell_table];
    }

    ReadAppointStock()
    {
        //521880,证券ETF,sh,1.030,0.890
        //BUY,512880,证券ETF,已达上限，停止买入
        //BUY,512980,传媒ETF,小网,0.76,0.583,0.585,18800,10998
        //SELL,512880,证券ETF,小网,0.80,0.922,0.927,11000,10197
        const lines = this.data.split("\n");
        const stock_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "首网目标价", "当前价格", "价格百分位"]];
        const buy_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "买入触发价", "买入价格", "买入份数", "买入金额", "距成交价"]];
        const sell_table: string [][] = [[GRID_COLOR_TABLE_TITLE, "标的代号", "标的名称", "网格种类", "价格档位", "卖出触发价", "卖出价格", "卖出份数", "卖出金额", "距成交价"]];
        const stock_price_dict: Map<string, number> = new Map<string, number>();
        for (let idx=0; idx<lines.length; idx++)
        {
            const line = lines[idx];
            if (line.length <= 0)
            {
                continue
            }
            const strs = line.split(",");
            if (strs[0] == "BUY")
            {
                if (strs.length > 4)
                {
                    const trading_gap = ToTradingGap(Number(strs[6]), stock_price_dict.get(strs[1]), 2);
                    buy_table.push([GRID_COLOR_BUY_OVERVIEW, strs[1], strs[2], strs[3], strs[4], strs[5], strs[6], strs[7], strs[8], trading_gap]);
                }
                else
                {
                    buy_table.push([GRID_COLOR_BUY_OVERVIEW, strs[1], strs[2], strs[3]]);
                }
            }
            else
            {
                if (strs[0] == "SELL")
                {
                    const trading_gap = ToTradingGap(Number(strs[6]), stock_price_dict.get(strs[1]), 2);
                    sell_table.push([GRID_COLOR_SELL_OVERVIEW, strs[1], strs[2], strs[3], strs[4], strs[5], strs[6], strs[7], strs[8], trading_gap])
                }
                else
                {
                    let remote_price = this.plugin_env.GetStockRemotePrice(strs[0]);
                    this.DebugLog("Info", "GetRemotePrice " + strs[0], String(remote_price));
                    if (remote_price <= 0)
                    {
                        remote_price = Number(strs[4]);
                    }
                    stock_price_dict.set(strs[0], remote_price);
                    stock_table.push([GRID_COLOR_STOCK_OVERVIEW, strs[0], strs[1], strs[3], String(remote_price), ToPercent(remote_price/ Number(strs[3]), 1)]);
                }
            }
        }
        this.appoint_stock_overview = [...stock_table, ...buy_table, ...sell_table];
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
        for(let idx=0; idx<this.appoint_stock_overview.length; idx++)
        {
            const stock = this.appoint_stock_overview[idx];
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
        let top4_cost = 0;
        buy_cost_list.sort((a, b) => b - a);
        buy_cost_list.forEach((val, idx) => total_cost = total_cost + val);
        buy_cost_list.forEach((val, idx) => {if (idx < 4) top4_cost = top4_cost + val});
        this.stock_overview.push(["标的总数", "卖出监控格数", "买入监控格数", "买入单成交总额", "TOP4买入成交总额"]);
        this.stock_overview.push([String(stock_count), String(sell_monitor_count), String(buy_monitor_count), String(total_cost), String(top4_cost)]);
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
        this.custom_title_el = div.createEl("h1");
        this.custom_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.appoint_title_el = div.createEl("h1");
        this.appoint_table_el = div.createEl("table");

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
        this.ReadAppointStock();
        this.SumupAllStock();
        // 标的总览
        this.overview_title_el.setText("网格总览");
        this.overview_table_el.empty();
        this.DisplayTable(this.overview_table_el, this.stock_overview, false);
        // 标的信息
        this.custom_title_el.setText("我的网格");
        this.custom_table_el.empty();
        this.DisplayTable(this.custom_table_el, this.custom_stock_overview, true);
    
        // 且慢标的
        this.appoint_title_el.setText("跟车网格");
        this.appoint_table_el.empty();
        this.DisplayTable(this.appoint_table_el, this.appoint_stock_overview, true);

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