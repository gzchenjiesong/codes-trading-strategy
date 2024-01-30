/*
    Grid Trading View
    网格策略的具体标的展示视图
*/

import { TextFileView, WorkspaceLeaf } from "obsidian";
import { GridTrading } from "./grid_trading";
import { PluginEnv } from "./plugin_env";
import { GRID_COLOR_BUY_MONITOR, GRID_COLOR_BUY_TRIGGERED, GRID_COLOR_SELL_MONITOR, GRID_COLOR_SELL_TRIGGERED } from "./settings";

export const VIEW_TYPE_GTV = "gtv-view"

export class GTVView extends TextFileView
{
    data: string;
    plugin_env: PluginEnv;

    stock_tile_el: HTMLElement;
    stock_table_el: HTMLElement;
    param_title_el: HTMLElement;
    param_table_el: HTMLElement;
    trading_title_el: HTMLElement;
    trading_table_el: HTMLElement;
    record_title_el: HTMLElement;
    record_table_el: HTMLElement;
    analysis_title_el: HTMLElement;
    analysis_table_el: HTMLElement;
    debug_log_title_el: HTMLElement;
    debug_log_table_el: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin_env: PluginEnv)
    {
        super(leaf);
        this.plugin_env = plugin_env;
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
        this.record_title_el = div.createEl("h1");
        this.record_table_el = div.createEl("table");
  
        div = this.contentEl.createEl("div");
        this.analysis_title_el = div.createEl("h1");
        this.analysis_table_el = div.createEl("table")

        div = this.contentEl.createEl("div")
        this.debug_log_title_el = div.createEl("h1");
        this.debug_log_table_el = div.createEl("table");
    }

    protected async onClose(): Promise<void>
    {
        this.contentEl.empty();    
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
        this.record_title_el.setText("交易记录");
        this.record_table_el.empty();
        this.analysis_title_el.setText("统计分析");
        this.analysis_table_el.empty();
        this.debug_log_title_el.setText("调试日志");
        this.debug_log_table_el.empty();

        if (this.file != null)
        {
            const grid_trading = this.plugin_env.GetAndGenGridTrading(this.file.name)
            grid_trading.InitGridTrading(this.data);
            // 标的信息
            this.stock_tile_el.setText(grid_trading.stock_name);
            this.DisplayTable(grid_trading, this.stock_table_el, grid_trading.stock_table, false);
            // 网格参数
            this.DisplayTable(grid_trading, this.param_table_el, grid_trading.param_table, false);
            // 交易网格
            this.DisplayTable(grid_trading, this.trading_table_el, grid_trading.trading_table, true);
            // 交易记录
            this.DisplayTable(grid_trading, this.record_table_el, grid_trading.trading_record, false);
            // 统计分析
            this.DisplayTable(grid_trading, this.analysis_table_el, grid_trading.trading_analysis, false);
            // 调试信息
            this.DisplayTable(grid_trading, this.debug_log_table_el, grid_trading.debug_log, false);
        }
    }

    DisplayTable(grid_trading: GridTrading, table_el: HTMLElement, table: string[][], is_color: boolean)
    {
        const table_body = table_el.createEl("tbody");
        table.forEach((row, i) => {
            const table_row = table_body.createEl("tr");
    
            row.forEach((cell, j) => {
                const table_cell = table_row.createEl("td", { text: cell, attr: {"align": "right"}});
                if (is_color && i > 0)
                {
                    if (j <=5)
                    {
                        if (grid_trading.buy_triggered_rows.includes(i))
                        {
                            table_cell.setAttr("bgColor", GRID_COLOR_BUY_TRIGGERED);
                        }
                        if (grid_trading.buy_monitor_rows.includes(i))
                        {
                            table_cell.setAttr("bgColor", GRID_COLOR_BUY_MONITOR);
                        }
                    }
                    else
                    {
                        if (grid_trading.sell_triggered_rows.includes(i))
                        {
                            table_cell.setAttr("bgColor", GRID_COLOR_SELL_TRIGGERED);
                        }
                        if (grid_trading.sell_monitor_rows.includes(i))
                        {
                            table_cell.setAttr("bgColor", GRID_COLOR_SELL_MONITOR);
                        }
                    }
                }
            });
        });
    }
}