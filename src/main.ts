/*
    Main: 插件定义及主逻辑
    设置面板选项
*/
import { App, Plugin, PluginSettingTab, PluginManifest, Setting, WorkspaceLeaf, TFile, TFolder } from 'obsidian';
import { GridTradingSettings, PluginBaseSettings, SetSettingValue, GetSettingValue } from "./settings"
import { GetCurrentPriceFromTencent, DebugLog } from './remote_util';
import { GTVView, VIEW_TYPE_GTV } from "./grid_view"
import { GTOView, VIEW_TYPE_GTO } from './grid_overview';
import { CorView, VIEW_TYPE_COR } from './cor_view';
import { PluginEnv, FETCH_CURRENT_PRICE } from './plugin_env';
import { SETTING_NAME } from "./lang_str"


export default class TradingStrategy extends Plugin
{
    plugin_env: PluginEnv;
    interval_callback_id: number;

    constructor(app: App, manifest: PluginManifest)
    {
        super(app, manifest);
        this.plugin_env = new PluginEnv();
        this.interval_callback_id = -1;
    }

    async onload() {
        await this.LoadSettingsFromDisk();
        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', '网格策略', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            this.FetchAllStockCurrentPrice();
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new TradingStrategySettingTab(this.app, this, this.plugin_env));

        // 轮询当前价：60 秒一次（腾讯接口免费，避免限流）
        this.interval_callback_id = window.setInterval(() => this.FetchAllStockCurrentPrice(), 60 * 1000);
        this.registerInterval(this.interval_callback_id);

        this.registerView(VIEW_TYPE_GTV, (leaf: WorkspaceLeaf) => {
            const gtv_view = new GTVView(leaf, this.plugin_env);
            return gtv_view;
        });
        this.registerView(VIEW_TYPE_GTO, (leaf: WorkspaceLeaf) => {
            const gto_view = new GTOView(leaf, this.app.vault, this.plugin_env);
            return gto_view;
        });
        this.registerView(VIEW_TYPE_COR, (leaf: WorkspaceLeaf) => {
            const cor_view = new CorView(leaf);
            return cor_view;
        })
        this.registerExtensions(["gtv"], VIEW_TYPE_GTV);
        this.registerExtensions(["gto"], VIEW_TYPE_GTO);
        this.registerExtensions(["cor"], VIEW_TYPE_COR);
    }

    onunload() {

    }

    async LoadSettingsFromDisk()
    {
        const setting_data = await this.loadData();
        if (setting_data != null)
        {
            this.plugin_env.UnserializedSettings(setting_data);
        }
    }

    SaveSettingsToDisk()
    {
        const setting_data = this.plugin_env.SerializedSettings();
        this.saveData(setting_data);
    }

    async FetchAllStockCurrentPrice()
    {
        const grid_folder = this.app.vault.getAbstractFileByPath('网格策略');
        let price_cache = new Map<string, number>;
        let hist_cache = new Map<string, string>;
        if (grid_folder instanceof TFolder)
        {
            // 首次成功解析后停止轮询重建（保留 interval，仅避免重复 clear）
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];

                if (grid_file instanceof TFile && grid_file.name.endsWith(".gto"))
                {
                    const content = await this.app.vault.cachedRead(grid_file);
                    const lines = content.split("\n");
                    for (let idx=0; idx<lines.length; idx++)
                    {
                        const strs = lines[idx].split(",");
                        if (strs[0] == "PRICE")
                        {
                            price_cache.set(strs[1], Number(strs[3]));
                        }
                        if (strs[0] == 'CASH')
                        {
                            this.plugin_env.cash_balance = Number(strs[1]);
                        }
                        if (strs[0] == 'HIST')
                        {
                            hist_cache.set(strs[1], lines[idx]);
                        }
                    }
                }
            }
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];

                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    const content = await this.app.vault.cachedRead(grid_file);
                    const mode_str = content.split("\n")[0].split(",")[0];
                    let grid_trading = this.plugin_env.GetAndGenGridTrading(grid_file.name, mode_str);
                    grid_trading.InitGridTrading(content);
                    const full_name = grid_trading.market_code + String(grid_trading.target_stock);
                    if (hist_cache.has(full_name))
                    {
                        grid_trading.ParseHistData(hist_cache.get(full_name)!);
                    }
                    if (grid_trading.is_debug)
                    {
                        continue;
                    }
                    let current_price = price_cache.get(full_name);
                    if (current_price)
                    {
                        this.plugin_env.stock_remote_price_dict.set(String(grid_trading.target_stock), current_price);
                        grid_trading.UpdateRemotePrice(current_price);
                    }
                }
            }

            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];
                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    const content = await this.app.vault.cachedRead(grid_file);
                    const mode_str = content.split("\n")[0].split(",")[0];
                    let grid_trading = this.plugin_env.GetAndGenGridTrading(grid_file.name, mode_str);
                    grid_trading.InitGridTrading(content);
                    if (grid_trading.is_debug)
                    {
                        continue;
                    }
                    let current_price = -1;
                    current_price = await GetCurrentPriceFromTencent(grid_trading.market_code + String(grid_trading.target_stock));
                    current_price = Number(current_price);
                    if (current_price < 0)
                    {
                        continue;
                    }
                    this.plugin_env.stock_remote_price_dict.set(String(grid_trading.target_stock), current_price);
                    grid_trading.UpdateRemotePrice(current_price);
                }
            }
            this.plugin_env.PublishEvent(FETCH_CURRENT_PRICE);
        }
    }
}


class TradingStrategySettingTab extends PluginSettingTab {

    plugin: TradingStrategy;
    plugin_env: PluginEnv;

    constructor(app: App, plugin: TradingStrategy, plugin_env: PluginEnv) {
        super(app, plugin);
        this.plugin = plugin;
        this.plugin_env = plugin_env;
    }

    hide() {
        if (this.plugin_env.is_settings_changed)
        {
            this.plugin.SaveSettingsToDisk();
            this.plugin_env.is_settings_changed = false;
        }
        super.hide();
    }

    display(): void {
        // 清空
        this.containerEl.empty();
        // 设置标题
        this.containerEl.createEl("h1").setText("TradingStrategy");
        // 基础配置
        const base_div = this.containerEl.createEl("div");
        base_div.createEl("h2").setText("基础配置");
        let bkey: (keyof PluginBaseSettings);
        for (bkey in this.plugin_env.base_settings)
        {
            const key_name = SETTING_NAME.get(bkey)
            if (key_name != undefined)
            {
                const setting = new Setting(base_div).setName(key_name);
                setting.addText((text_comp, setting_key=bkey) => {
                    text_comp.setValue(String(GetSettingValue(this.plugin_env.base_settings, setting_key)));
                    text_comp.onChange((value: string) => {
                        SetSettingValue(this.plugin_env.base_settings, setting_key, value);
                        this.plugin_env.is_settings_changed = true;
                    });
                });
            }
        }
        // 网格交易参数
        const grid_div = this.containerEl.createEl("div");
        grid_div.createEl("h2").setText("网格配置");
        let key: (keyof GridTradingSettings);
        for (key in this.plugin_env.grid_settings)
        {
            const key_name = SETTING_NAME.get(key)
            if (key_name != undefined)
            {
                const setting = new Setting(grid_div).setName(key_name);
                setting.addText((text_comp, setting_key=key) => {
                    text_comp.setValue(String(GetSettingValue(this.plugin_env.grid_settings, setting_key)));
                    text_comp.onChange((value: string) => {
                            SetSettingValue(this.plugin_env.grid_settings, setting_key, Number(value));
                            this.plugin_env.is_settings_changed = true;
                    });
                });
            }
        }
    }
}
