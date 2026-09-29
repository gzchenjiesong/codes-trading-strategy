/*
    Grid Trading View
    网格策略的具体标的展示视图
*/

import { TextFileView, WorkspaceLeaf } from "obsidian";
import { GridTrading } from "./grid_trading";
import { PluginEnv, FETCH_CURRENT_PRICE } from "./plugin_env";
import { CELL_BUY_MONITOR, CELL_BUY_TRIGGERED, CELL_SELL_MONITOR, CELL_SELL_TRIGGERED } from "./settings";
import { DebugLog } from "./remote_util";


export const VIEW_TYPE_GTV = "gtv-view"

export class GTVView extends TextFileView
{
    data: string;
    plugin_env: PluginEnv;
    refresh_event_guid: number;
    view_guid: number;

    stock_tile_el: HTMLElement;
    stock_table_el: HTMLElement;
    param_title_el: HTMLElement;
    param_table_el: HTMLElement;
    trading_title_el: HTMLElement;
    trading_table_el: HTMLElement;
    interest_title_el: HTMLElement;
    interest_table_el: HTMLElement;
    holding_title_el: HTMLElement;
    holding_table_el: HTMLElement;
    income_title_el: HTMLElement;
    income_table_el: HTMLElement;
    analysis_title_el: HTMLElement;
    analysis_table_el: HTMLElement;
    record_title_el: HTMLElement;
    record_table_el: HTMLElement;
    adjust_title_el: HTMLElement;
    adjust_table_el: HTMLElement;
    debug_log_title_el: HTMLElement;
    debug_log_table_el: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin_env: PluginEnv)
    {
        super(leaf);
        this.plugin_env = plugin_env;
        this.refresh_event_guid = -1;
        this.view_guid = plugin_env.GenGUID();
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
        return VIEW_TYPE_GTV;
    }

    protected async onOpen(): Promise<void> 
    {
        this.contentEl.addClass("grid-trading-view");
        let div = this.contentEl.createEl("div");
        this.stock_tile_el = div.createEl("h1");
        this.stock_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.param_title_el = div.createEl("h1");
        this.param_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.trading_title_el = div.createEl("h1");
        this.trading_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.interest_title_el = div.createEl("h1");
        this.interest_table_el = div.createEl("table");

        div = this.contentEl.createEl("div")
        this.holding_title_el = div.createEl("h1");
        this.holding_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.income_title_el = div.createEl("h1");
        this.income_table_el = div.createEl("table");

        div = this.contentEl.createEl("div");
        this.analysis_title_el = div.createEl("h1");
        this.analysis_table_el = div.createEl("table")

        div = this.contentEl.createEl("div");
        this.record_title_el = div.createEl("h1");
        this.record_table_el = div.createEl("table");
  
        div = this.contentEl.createEl("div");
        this.adjust_title_el = div.createEl("h1");
        this.adjust_table_el = div.createEl("table");

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
        // 初始化标题与表格
        this.stock_tile_el.setText("未知标的");
        this.stock_table_el.empty();
        this.param_title_el.setText("网格参数");
        this.param_table_el.empty();
        this.trading_title_el.setText("交易网格");
        this.trading_table_el.empty();
        this.interest_title_el.setText("红利网格");
        this.interest_table_el.empty();
        this.holding_title_el.setText("持仓分析");
        this.holding_table_el.empty();
        this.income_title_el.setText("收益分析");
        this.income_table_el.empty();
        this.analysis_title_el.setText("回撤分析");
        this.analysis_table_el.empty();
        this.record_title_el.setText("交易记录");
        this.record_table_el.empty();
        this.adjust_title_el.setText("调整记录");
        this.adjust_table_el.empty();
        // this.debug_log_title_el.setText("调试日志");
        // this.debug_log_table_el.empty();

        if (this.file != null)
        {
            const mode_str = this.data.split("\n")[0].split(",")[0];
            const grid_trading = this.plugin_env.GetAndGenGridTrading(this.file.name, mode_str);
            grid_trading.InitGridTrading(this.data);
            // 标的信息
            this.stock_tile_el.setText(grid_trading.stock_name);
            this.DisplayTable(grid_trading, this.stock_table_el, grid_trading.stock_table, false);
            // 网格参数
            this.DisplayTable(grid_trading, this.param_table_el, grid_trading.param_table, false);
            // 交易网格
            this.DisplayTable(grid_trading, this.trading_table_el, grid_trading.trading_table, true);
            // 红利网格
            this.DisplayTable2(this.interest_table_el, grid_trading.trading_interest, true);
            // 持仓分析
            this.DisplayTable(grid_trading, this.holding_table_el, grid_trading.holding_analysis, false);
            // 收益分析
            this.DisplayTable(grid_trading, this.income_table_el, grid_trading.trading_income, false);
            // 回撤分析
            this.DisplayTable(grid_trading, this.analysis_table_el, grid_trading.trading_analysis, false);
            // 交易记录
            this.DisplayTable(grid_trading, this.record_table_el, grid_trading.trading_record, false);
            // 调整记录
            this.DisplayTable(grid_trading, this.adjust_table_el, grid_trading.adjust_record, false);
            // 调试信息
            // this.DisplayTable(grid_trading, this.debug_log_table_el, grid_trading.debug_log, false);
        }
    }

    DisplayTable(grid_trading: GridTrading, table_el: HTMLElement, table: string[][], is_color: boolean)
    {
        if (!table || table.length == 0)
        {
            return;
        }
        try {
            const table_body = table_el.createEl("tbody");
            table.forEach((row, i) => {
                const table_row = table_body.createEl("tr");
        
                row.forEach((cell, j) => {
                    const table_cell = table_row.createEl("td", { text: cell, attr: {"align": "right"}});
                    if (is_color && i > 0)
                    {
                        if (j <=5)
                        {
                            if (grid_trading.buy_monitor_rows.includes(i))
                            {
                                table_cell.addClass(CELL_BUY_MONITOR);
                            }
                            else if (grid_trading.buy_triggered_rows.includes(i))
                            {
                                table_cell.addClass(CELL_BUY_TRIGGERED);
                            }
                        }
                        else
                        {
                            if (grid_trading.sell_monitor_rows.includes(i))
                            {
                                table_cell.addClass(CELL_SELL_MONITOR);
                            }
                            else if (grid_trading.sell_triggered_rows.includes(i))
                            {
                                table_cell.addClass(CELL_SELL_TRIGGERED);
                            }
                        }
                    }
                });
            });
        } catch (error) {
            DebugLog("DisplayTable error: ", error);
        }
    }

    DisplayTable2(table_el: HTMLElement, table: string[][], is_color: boolean)
    {
        if (!table || table.length == 0)
        {
            return;
        }
        const table_body = table_el.createEl("tbody");
        table.forEach((row, i) => {
            const table_row = table_body.createEl("tr");
            if (is_color)
            {
                table_row.addClass(table[i][0]);
            }
            row.forEach((cell, j) => {
                if (is_color && j == 0)
                {
                    return;
                }
                table_row.createEl("td", { text: cell, attr: {"align": "right"}});
            });
        });
    }
}