/*
    Plugin runtime data
*/

import { PluginBaseSettings, GridTradingSettings, PackSettings, UnpackSettings } from "./settings";
import { GridTrading } from "./grid_trading";
import { DebugLog } from "./remote_util";

export const UPDATE_STOCK_SETTING = "update_stock_setting";
export const FETCH_CURRENT_PRICE = "fetch_current_price";

type Callback = () => void;

export class PluginEnv
{
    is_settings_changed: boolean;
    base_settings: PluginBaseSettings;
    grid_settings: GridTradingSettings;

    grid_trading_dict: Map<string, GridTrading>;
    stock_remote_price_dict: Map<string, number>;
    event_callback_dict: Map<string, Map<number, Callback>>
    _event_guid: number;

    constructor()
    {
        this.is_settings_changed = false;
        this.base_settings = new PluginBaseSettings();
        this.grid_settings = new GridTradingSettings();
        this.grid_trading_dict = new Map<string, GridTrading>;
        this.stock_remote_price_dict = new Map<string, number>;
        this.event_callback_dict = new Map<string, Map<number, Callback>>;
        this._event_guid = 0;
    }

    GetAPILisence(): string
    {
        return this.base_settings.DATA_API_LICENCE;
    }

    GetStockRemotePrice(stock_no: string): number
    {
        const price = this.stock_remote_price_dict.get(stock_no);
        if (price != undefined)
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

    PublishEvent(event_name: string)
    {
        //DebugLog("PublishEvent: ", event_name);
        const cb_dict = this.event_callback_dict.get(event_name)
        if (cb_dict == undefined)
        {
            return;
        }
        for (let [guid, event_cb] of cb_dict)
        {
            try
            {
                //DebugLog("TriggerEventCb guid: ", guid, " cb: ", event_cb.name);
                event_cb();
            }
            catch(e)
            {
                ;
            }
        }
    }

    SubscribeEvent(event_name: string, event_cb: Callback): number
    {
        const guid = this.GenGUID();
        let cb_dict = this.event_callback_dict.get(event_name);
        if (cb_dict == undefined)
        {
            cb_dict = new Map<number, Callback>;
            this.event_callback_dict.set(event_name, cb_dict);
        }
        cb_dict.set(guid, event_cb);
        //DebugLog("SubscribeEvent: ", event_name, " guid: ", guid, " cb: ", event_cb.name);
        return guid;
    }

    UnsubscribeEvent(event_name: string, event_guid: number): boolean
    {
        const cb_dict = this.event_callback_dict.get(event_name)
        if (cb_dict == undefined || !cb_dict.has(event_guid))
        {
            return false;
        }
        //DebugLog("UnsubscribeEvent: ", event_name, " guid: ", event_guid);
        return cb_dict.delete(event_guid);
    }

    GenGUID(): number
    {
        this._event_guid++;
        return this._event_guid;
    }
}
