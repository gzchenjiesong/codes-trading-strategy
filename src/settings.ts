/*
    Setting 各种配置信息及常量定义
    GridTradingSettings: 网格交易的参数定义，覆盖关系为 默认全局参数<--自定义全局参数<--自定义标的参数
*/

import { SETTING_NAME } from "./lang_str";

// 颜色定义
export const GRID_COLOR_BUY_MONITOR         = "#FFFF00";    // 黄色
export const GRID_COLOR_SELL_MONITOR        = "#FFFF00";    // 黄色
export const GRID_COLOR_BUY_TRIGGERED       = "#D3D3D3";    // 灰色
export const GRID_COLOR_SELL_TRIGGERED      = "#FFFFE0";    // 浅黄
export const GRID_COLOR_DISABLE             = "#FFFFE0";    // 深灰
export const GRID_COLOR_STOCK_OVERVIEW      = "#FFFFFF";    // 同时肩负标记数据类型，故颜色值不能完全相等
export const GRID_COLOR_TABLE_TITLE         = "#D3D3D3";    // 同时肩负标记数据类型，故颜色值不能完全相等
export const GRID_COLOR_BUY_OVERVIEW        = "#FFFF01";    // 同时肩负标记数据类型，故颜色值不能完全相等
export const GRID_COLOR_SELL_OVERVIEW       = "#FFFF00";    // 同时肩负标记数据类型，故颜色值不能完全相等


export function PackSettings<T>(settings: T): string
{
    let pack_str = "";
    let key: keyof T;
    for (key in settings)
    {
        if (SETTING_NAME.has(String(key)))
        {
            pack_str = pack_str + String(key) + ":" + String(settings[key]) + "\n";
        }
    }
    return pack_str;
}

export function UnpackSettings<T>(settings: T, lines: string[])
{
    lines.forEach((line, idx) => {
        const strs = line.split(":");
        if (SETTING_NAME.has(strs[0]))
        {
            SetSettingValue(settings, strs[0] as keyof T, strs[1]);
        }
    });
}

export function GetSettingValue<T>(settings: T, key: keyof T)
{
    return settings[key];
}

export function SetSettingValue<T, VT>(settings: T, key: keyof T, value: VT)
{
    if (key in settings)
    {
        settings[key] = value;
    }
}

// 插件配置
export class PluginBaseSettings
{
    DATA_API_LICENCE: string;

    constructor()
    {
        // 免费默认License
        this.DATA_API_LICENCE = "112e84656174f0a5";
        // 个人付费License
        this.DATA_API_LICENCE = "b192f53a6d6928033";
    }
}


// 网格配置
export class GridTradingSettings {
    ONE_GRID_LIMIT: number;
    MAX_SLUMP_PCT: number;
    TRIGGER_ADD_POINT: number;
    TRADING_PRICE_PRECISION: number;
    MIN_BATCH_COUNT: number;
    MAX_RISE_PCT: number;
    MINIMUM_BUY_PCT: number;
    CLEAR_STEP_PCT: number;
    BOTTOM_BUY_PCT: number;

    SGRID_STEP_PCT: number;
    SGRID_ADD_PCT: number;
    SGRID_RETAIN_COUNT: number;

    MGRID_STEP_PCT: number;
    MGRID_ADD_PCT: number;
    MGRID_RETAIN_COUNT: number;

    LGRID_STEP_PCT: number;
    LGRID_ADD_PCT: number;
    LGRID_RETAIN_COUNT: number;

    constructor()
    {
        // 按照默认参数值初始化
        this.ONE_GRID_LIMIT = 10000;
        this.MAX_SLUMP_PCT = 0.67;
        this.TRIGGER_ADD_POINT = 0.005;
        this.TRADING_PRICE_PRECISION = 3;
        this.MIN_BATCH_COUNT = 100;
        this.MAX_RISE_PCT = 0.1;
        this.CLEAR_STEP_PCT = 0.25;
        this.MINIMUM_BUY_PCT = 0.1;
        this.BOTTOM_BUY_PCT = 0.2
    
        this.SGRID_STEP_PCT = 0.05;
        this.SGRID_ADD_PCT = 0.05;
        this.SGRID_RETAIN_COUNT = 4;

        this.MGRID_STEP_PCT = 0.22;
        this.MGRID_ADD_PCT = 0.2;
        this.MGRID_RETAIN_COUNT = 2;

        this.LGRID_STEP_PCT = 0.52;
        this.LGRID_ADD_PCT = 0.5;
        this.LGRID_RETAIN_COUNT = 1;
    }

    Clone(): GridTradingSettings
    {
        const clone = new GridTradingSettings();
        clone.ONE_GRID_LIMIT = this.ONE_GRID_LIMIT;
        clone.MAX_SLUMP_PCT = this.MAX_SLUMP_PCT;
        clone.TRIGGER_ADD_POINT = this.TRIGGER_ADD_POINT;
        clone.TRADING_PRICE_PRECISION = this.TRADING_PRICE_PRECISION;
        clone.MIN_BATCH_COUNT = this.MIN_BATCH_COUNT;
        clone.MAX_RISE_PCT = this.MAX_RISE_PCT;
        clone.CLEAR_STEP_PCT = this.CLEAR_STEP_PCT;
        clone.MINIMUM_BUY_PCT = this.MINIMUM_BUY_PCT;
        clone.BOTTOM_BUY_PCT = this.BOTTOM_BUY_PCT;
    
        clone.SGRID_STEP_PCT = this.SGRID_STEP_PCT;
        clone.SGRID_ADD_PCT = this.SGRID_ADD_PCT;
        clone.SGRID_RETAIN_COUNT = this.SGRID_RETAIN_COUNT;
    
        clone.MGRID_STEP_PCT = this.MGRID_STEP_PCT;
        clone.MGRID_ADD_PCT = this.MGRID_ADD_PCT;
        clone.MGRID_RETAIN_COUNT = this.MGRID_RETAIN_COUNT;
    
        clone.LGRID_STEP_PCT = this.LGRID_STEP_PCT;
        clone.LGRID_ADD_PCT = this.LGRID_ADD_PCT;
        clone.LGRID_RETAIN_COUNT = this.LGRID_RETAIN_COUNT;
        return clone;
    }

    PackBase(): string
    {
        const setting = ["BASE", String(this.ONE_GRID_LIMIT), String(this.MAX_SLUMP_PCT), String(this.TRIGGER_ADD_POINT),
                        String(this.TRADING_PRICE_PRECISION), String(this.MIN_BATCH_COUNT), String(this.MAX_RISE_PCT),
                        String(this.CLEAR_STEP_PCT), String(this.MINIMUM_BUY_PCT), String(this.BOTTOM_BUY_PCT)]
        return setting.join(",");
    }

    UnpackBase(strs: string[])
    {
        if (strs.length < 10)
        {
            return;
        }
        this.ONE_GRID_LIMIT = Number(strs[1]);
        this.MAX_SLUMP_PCT = Number(strs[2]);
        this.TRIGGER_ADD_POINT = Number(strs[3]);
        this.TRADING_PRICE_PRECISION = Number(strs[4]);
        this.MIN_BATCH_COUNT = Number(strs[5]);
        this.MAX_RISE_PCT = Number(strs[6]);
        this.CLEAR_STEP_PCT = Number(strs[7]);
        this.MINIMUM_BUY_PCT = Number(strs[8]);
        this.BOTTOM_BUY_PCT = Number(strs[9]);
    }

    PackStep(): string
    {
        const setting = ["STEP", String(this.SGRID_STEP_PCT), String(this.SGRID_ADD_PCT), String(this.SGRID_RETAIN_COUNT),
                        String(this.MGRID_STEP_PCT), String(this.MGRID_ADD_PCT), String(this.MGRID_RETAIN_COUNT),
                        String(this.LGRID_STEP_PCT), String(this.LGRID_ADD_PCT), String(this.LGRID_RETAIN_COUNT)]
        return setting.join(",");
    }

    UnpackStep(strs: string[])
    {
        if (strs.length != 10)
        {
            return;
        }
        this.SGRID_STEP_PCT = Number(strs[1]);
        this.SGRID_ADD_PCT = Number(strs[2]);
        this.SGRID_RETAIN_COUNT = Number(strs[3]);
        this.MGRID_STEP_PCT = Number(strs[4]);
        this.MGRID_ADD_PCT = Number(strs[5]);
        this.MGRID_RETAIN_COUNT = Number(strs[6]);
        this.LGRID_STEP_PCT = Number(strs[7]);
        this.LGRID_ADD_PCT = Number(strs[8]);
        this.LGRID_RETAIN_COUNT = Number(strs[9]);
    }

    PackQuant(): string
    {
        const setting = ["QUANT", ]

        return setting.join(",")
    }

    UnpackQuant(strs: string [])
    {

    }
}
