/*
    Correlation: 相关性系数视图
    展示多个标的两两间的涨跌走势相关性
*/

import { TextFileView, WorkspaceLeaf, TFile, TFolder, Vault } from "obsidian";

export const VIEW_TYPE_COR = "cor-view"

export class CorView extends TextFileView
{
    data_el: HTMLElement;

    constructor(leaf: WorkspaceLeaf)
    {
        super(leaf);
    }

    getViewType(): string
    {
        return VIEW_TYPE_COR;
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

    protected async onOpen(): Promise<void> 
    {
        let div = this.contentEl.createEl("div");
        this.data_el = div.createEl("h1");
    }

    protected async onClose(): Promise<void>
    {
        this.contentEl.empty();
    }

    Refresh()
    {
        this.data_el.setText(this.data);
    }
}