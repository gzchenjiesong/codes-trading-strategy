/*
    Plugin runtime data
*/

import { PluginBaseSettings, GridTradingSettings, PackSettings, UnpackSettings } from "./settings";
import { GridTrading } from "./grid_trading";


export class PluginEnv
{
    is_settings_changed: boolean;
    base_settings: PluginBaseSettings;
    grid_settings: GridTradingSettings;

    grid_trading_dict: Map<string, GridTrading>;
    stock_remote_price_dict: Map<string, number>;

    constructor()
    {
        this.is_settings_changed = false;
        this.base_settings = new PluginBaseSettings();
        this.grid_settings = new GridTradingSettings();
        this.grid_trading_dict = new Map<string, GridTrading>;
        this.stock_remote_price_dict = new Map<string, number>;
    }

    GetAPILisence(): string
    {
        return this.base_settings.DATA_API_LICENCE;
    }

    GetStockRemotePrice(stock_no: string): number
    {
        const price = this.stock_remote_price_dict.get(stock_no);
        if (typeof(price) === "number")
        {
            return price;
        }
        else
        {
            return -1;
        }
    }

    GetAndGenGridTrading(grid_name: string): GridTrading
    {
        let grid_trading = this.grid_trading_dict.get(grid_name)
        if (grid_trading instanceof GridTrading)
        {
            return grid_trading;
        }
        grid_trading = new GridTrading(this);
        this.grid_trading_dict.set(grid_name, grid_trading);
        return grid_trading;
    }

    UnserializedSettings(data: string)
    {
        const lines = data.split("\n");
        if (lines.length <= 0)
        {
            return
        }
        UnpackSettings(this.base_settings, lines);
        UnpackSettings(this.grid_settings, lines);
    }

    SerializedSettings(): string
    {
        return PackSettings(this.base_settings) + PackSettings(this.grid_settings);
    }
}
