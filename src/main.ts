/*
    Main: 插件定义及主逻辑
    设置面板选项
*/
import { App, Plugin, PluginSettingTab, PluginManifest, Setting, WorkspaceLeaf, TFile, TFolder } from 'obsidian';
import { GridTradingSettings, PluginBaseSettings, SetSettingValue, GetSettingValue } from "./settings"
import { GetETFCurrentPrice, DebugLog } from './remote_util';
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
        const ribbonIconEl = this.addRibbonIcon('dice', 'GridTrading', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            this.FetchAllStockCurrentPrice();
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new TradingStrategySettingTab(this.app, this, this.plugin_env));

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.interval_callback_id = window.setInterval(() => this.FetchAllStockCurrentPrice(), 1 * 1000);
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
        //DebugLog("Finish loading setting, setting_data: ", setting_data);
        if (setting_data != null)
        {
            this.plugin_env.UnserializedSettings(setting_data);
        }
    }

    SaveSettingsToDisk()
    {
        DebugLog("MAX_SLUMP_PCT1 ", this.plugin_env.grid_settings.MAX_SLUMP_PCT);
        const setting_data = this.plugin_env.SerializedSettings();
        DebugLog("MAX_SLUMP_PCT2 ", this.plugin_env.grid_settings.MAX_SLUMP_PCT);
        DebugLog(setting_data);
        this.saveData(setting_data);
    }

    async FetchAllStockCurrentPrice()
    {
        //DebugLog('run FetchAllStockCurrentPrice ', this.app.vault.getName());
        const api_licence = this.plugin_env.GetAPILisence()
        const grid_folder = this.app.vault.getAbstractFileByPath('GridTrading');
        //DebugLog("getAbstractFileByPath ", String(grid_folder));
        if (grid_folder instanceof TFolder)
        {
            if (this.interval_callback_id > 0)
            {
                window.clearInterval(this.interval_callback_id);
                this.interval_callback_id = -1;
            }
            //DebugLog('Folder children count ', String(grid_folder.children.length));
            for (let index=0; index < grid_folder.children.length; index++)
            {
                const grid_file = grid_folder.children[index];
                //DebugLog("For file name ", grid_file.name);
                if (grid_file instanceof TFile && grid_file.name.endsWith(".gtv"))
                {
                    //DebugLog("read file ", grid_file.name);
                    const content = await this.app.vault.cachedRead(grid_file);
                    const mode_str = content.split("\n")[0].split(",")[0];
                    let grid_trading = this.plugin_env.GetAndGenGridTrading(grid_file.name, mode_str);
                    //DebugLog("GetAndGenGridTrading, name: ", grid_file.name, ", mode: ", mode_str);
                    grid_trading.InitGridTrading(content);
                    //DebugLog("Try to fetch remote price, ", grid_trading.market_code, grid_trading.target_stock);
                    let current_price = await GetETFCurrentPrice(grid_trading.market_code + String(grid_trading.target_stock), api_licence);
                    // PS: 需要强转一下，不强制转换无法使用 toFixed 函数，可能是类型问题，没深究
                    current_price = Number(current_price);
                    this.plugin_env.stock_remote_price_dict.set(String(grid_trading.target_stock), current_price);
                    //DebugLog("查询 ", grid_trading.stock_name, " 当前最新价格为: ", current_price);
                    grid_trading.UpdateRemotePrice(current_price);
                }

                if (grid_file instanceof TFile && grid_file.name.endsWith(".gto"))
                {
                    const content = await this.app.vault.cachedRead(grid_file);
                    //521880,证券ETF,sh,1.030,0.890
                    const lines = content.split("\n");
                    for (let index=0; index < lines.length; index++)
                    {
                        const strs = lines[index].split(",");
                        if (strs[0] != "BUY" && strs[0] != "SELL")
                        {
                            let current_price = await GetETFCurrentPrice(strs[2] + strs[0], api_licence);
                            current_price = Number(current_price);
                            this.plugin_env.stock_remote_price_dict.set(strs[0], current_price);
                            //DebugLog("查询 ", strs[1], " 当前最新价格为: ", current_price);
                        }
                    }
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
        //DebugLog("enter display settings")
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
                    DebugLog("add Setting Key: ", setting_key);
                    text_comp.setValue(String(GetSettingValue(this.plugin_env.grid_settings, setting_key)));
                    text_comp.onChange((value: string) => {
                            SetSettingValue(this.plugin_env.grid_settings, setting_key, Number(value));
                            DebugLog("SetValue succeed ", setting_key, GetSettingValue(this.plugin_env.grid_settings, setting_key));
                            this.plugin_env.is_settings_changed = true;
                    });
                });
            }
        }
    }
}

