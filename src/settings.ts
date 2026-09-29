/*
    Setting 各种配置信息及常量定义
    GridTradingSettings: 网格交易的参数定义，覆盖关系为 默认全局参数<--自定义全局参数<--自定义标的参数
*/

import { SETTING_NAME } from "./lang_str";

// 行类型标记（第0列 + 比较，用于整行背景色 class）
export const ROW_TYPE_STOCK = "grid-row-stock";      // 标的信息（默认无背景）
export const ROW_TYPE_TITLE = "grid-row-title";      // 表头
export const ROW_TYPE_BUY   = "grid-row-buy";        // 买入监控行（绿）
export const ROW_TYPE_SELL  = "grid-row-sell";       // 卖出监控行（红）

// 单元格状态标记（用于单元格背景色 class，买入=绿，卖出=红）
export const CELL_BUY_MONITOR    = "grid-cell-buy-monitor";    // 买入监控（绿）
export const CELL_BUY_TRIGGERED  = "grid-cell-buy-triggered";  // 买入已触发（浅绿）
export const CELL_SELL_MONITOR   = "grid-cell-sell-monitor";   // 卖出监控（红）
export const CELL_SELL_TRIGGERED = "grid-cell-sell-triggered"; // 卖出已触发（浅红）


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
        (settings as Record<string, unknown>)[key as string] = value;
    }
}

// 插件配置
export class PluginBaseSettings
{
    DATA_API_LICENCE: string;

    constructor()
    {
        this.DATA_API_LICENCE = "";
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

    INTEREST_YEAR: number;
    INTEREST_RATE: number;
    INTEREST_STEP: number;
    INTEREST_TRIGGER: number;

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
    
        this.INTEREST_YEAR = 2025;
        this.INTEREST_RATE = 0.045;
        this.INTEREST_STEP = 40;
        this.INTEREST_TRIGGER = 0.85
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
    }

    PackQuant(): string
    {
        const setting = ["QUANT", ]

        return setting.join(",")
    }

    UnpackQuant(strs: string [])
    {

    }

    PackInterest(): string
    {
        const setting = ["INTEREST", ];

        return setting.join(",");
        
    }

    UnpackInterest(strs: string [])
    {
        if (strs.length != 5)
        {
            return;
        }
        this.INTEREST_YEAR = Number(strs[1]);
        this.INTEREST_RATE = Number(strs[2]);
        this.INTEREST_STEP = Number(strs[3]);
        this.INTEREST_TRIGGER = Number(strs[4]);
    }
}
