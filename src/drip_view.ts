/*
 * DRIP Trading View
 * 红利再投计划视图
*/

import { TextFileView, WorkspaceLeaf } from "obsidian";
import { FETCH_CURRENT_PRICE, PluginEnv } from "./plugin_env";


export const VIEW_TYPE_DTV = "dtv-view"

export class DTVView extends TextFileView {
    data: string;
    plugin_env: PluginEnv;
    refresh_event_guid: number;

    stock_title_el: HTMLElement;
    stock_table_el: HTMLElement;
    holding_title_el: HTMLElement;
    holding_table_el: HTMLElement;
    record_title_el: HTMLElement;
    record_table_el: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin_env: PluginEnv) {
        super(leaf);
        this.plugin_env = plugin_env;
        this.data = "";
        this.refresh_event_guid = -1;
    }
    
    getViewType(): string {
        return VIEW_TYPE_DTV;
    }

    getViewData(): string {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        this.Refresh();
    }

    clear(): void {
        this.data = "";
    }

    protected async onOpen(): Promise<void> {
        let div = this.contentEl.createEl("div");
        this.stock_title_el = div.createEl("h2", { text: "标的概览" });
        this.stock_table_el = div.createEl("table");
        div = this.contentEl.createEl("div");
        this.holding_title_el = div.createEl("h2", { text: "持仓概览" });
        this.holding_table_el = div.createEl("table");
        div = this.contentEl.createEl("div");
        this.record_title_el = div.createEl("h2", { text: "交易记录" });
        this.record_table_el = div.createEl("table");

        this.refresh_event_guid = this.plugin_env.SubscribeEvent(FETCH_CURRENT_PRICE, ()=>this.Refresh());
    }

    protected async onClose(): Promise<void> {
        // Nothing to clean up
        this.contentEl.empty();
        if (this.refresh_event_guid > 0) {
            this.plugin_env.UnsubscribeEvent(FETCH_CURRENT_PRICE, this.refresh_event_guid);
            this.refresh_event_guid = -1;
        }
    }

    Refresh(): void {
        this.stock_title_el.setText("标的概览");
        this.stock_table_el.empty();
        this.holding_title_el.setText("持仓概览");
        this.holding_table_el.empty();
        this.record_title_el.setText("交易记录");
        this.record_table_el.empty();
        
        if (this.file != null) {
            const drip_trading = this.plugin_env.GetAndGenDripTrading(this.file.name);
            drip_trading.ParseRawData(this.data);
            drip_trading.InitDripTrading();

            this.DisplayTable(this.stock_table_el, drip_trading.stock_overview, false);
            this.DisplayTable(this.holding_table_el, drip_trading.holding_overview, false);
            this.DisplayTable(this.record_table_el, drip_trading.trading_record, false);
        }
    }

    DisplayTable(table_el: HTMLElement, table: string[][], is_color: boolean): void {
        try {
            table_el.empty();
            const tbody = table_el.createEl("tbody");
            for (const row of table) {
                const tr = tbody.createEl("tr");
                for (const cell of row) {
                    const td = tr.createEl("td", { text: cell });
                    if (is_color) {
                        td.addClass("colored");
                    }
                }
            }
        } catch (error) {
            console.error("Error displaying table:", error);
        }
    }
}