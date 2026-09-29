import { describe, it, expect } from "vitest";
import { PluginEnv } from "../src/plugin_env";
import { GridTradingModeThree } from "../src/grid_trading_m3";

// 真实 .gtv 样例（取自 sz159875-新能源ETF）
const SAMPLE_GTV = [
    "mode_three,159875,新能源ETF,sz,0.75,0.525",
    "BASE,10000,0.7,0.005,3,100,0.10,0.25,0.50,0.53",
    "STEP,0.061,0,3,0.04,0,2,0.02,0,1",
    "INTEREST,2025,0.045,40,0.85",
    "SGRID,小网0,100.00%,0.01,3",
    "BUY,2024-01-23,小网0,0.760,12000",
    "SELL,2024-02-10,小网0,0.800,11000",
].join("\n");

function makeGrid(): GridTradingModeThree
{
    return new GridTradingModeThree(new PluginEnv());
}

describe("ParseRawData 解析", () =>
{
    it("解析第一行标的元信息", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.target_stock).toBe(159875);
        expect(grid.stock_name).toBe("新能源ETF");
        expect(grid.market_code).toBe("sz");
        expect(grid.target_price).toBe(0.75);
        expect(grid.current_price).toBe(0.525);
        expect(grid.is_empty).toBe(true); // ParseRawData 不改变 is_empty
    });

    it("解析 BASE 行网格参数", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.grid_settings.ONE_GRID_LIMIT).toBe(10000);
        expect(grid.grid_settings.MAX_SLUMP_PCT).toBe(0.7);
        expect(grid.grid_settings.TRIGGER_ADD_POINT).toBe(0.005);
        expect(grid.grid_settings.TRADING_PRICE_PRECISION).toBe(3);
        expect(grid.grid_settings.MIN_BATCH_COUNT).toBe(100);
        expect(grid.grid_settings.MAX_RISE_PCT).toBe(0.10);
        expect(grid.grid_settings.CLEAR_STEP_PCT).toBe(0.25);
    });

    it("解析 STEP 行步进参数", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.grid_settings.SGRID_STEP_PCT).toBe(0.061);
        expect(grid.grid_settings.SGRID_RETAIN_COUNT).toBe(3);
        expect(grid.grid_settings.MGRID_STEP_PCT).toBe(0.04);
        expect(grid.grid_settings.LGRID_STEP_PCT).toBe(0.02);
    });

    it("解析 INTEREST 行计息参数", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.grid_settings.INTEREST_YEAR).toBe(2025);
        expect(grid.grid_settings.INTEREST_RATE).toBe(0.045);
        expect(grid.grid_settings.INTEREST_STEP).toBe(40);
        expect(grid.grid_settings.INTEREST_TRIGGER).toBe(0.85);
    });

    it("解析 SGRID 步进表", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.sgrid_step_table.length).toBe(1);
        expect(grid.sgrid_step_table[0]).toEqual(["小网0", "100.00%", "0.01", "3"]);
    });

    it("解析 BUY/SELL 交易记录（买卖配对后 buy_grid_record 清空）", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.raw_trading_record.length).toBe(2);
        expect(grid.raw_trading_record[0]).toEqual(["BUY", "2024-01-23", "小网0", "0.760", "12000"]);
        expect(grid.raw_trading_record[1]).toEqual(["SELL", "2024-02-10", "小网0", "0.800", "11000"]);
        expect(grid.buy_grid_record).toEqual([]);
    });

    it("相同数据重复解析返回 false（MD5 缓存）", () =>
    {
        const grid = makeGrid();
        expect(grid.ParseRawData(SAMPLE_GTV)).toBe(true);
        expect(grid.ParseRawData(SAMPLE_GTV)).toBe(false);
    });
});

describe("CalcClearPrice / CalcGridIncomes", () =>
{
    it("计算清仓价（CLEAR_STEP_PCT=0.25）", () =>
    {
        const grid = makeGrid();
        grid.target_price = 0.75;
        grid.grid_settings.TRADING_PRICE_PRECISION = 3;
        grid.grid_settings.CLEAR_STEP_PCT = 0.25;
        // 第一档：price_step = 125/100 = 1.25 → FixedPrice(0.75, 1.25, 3) = 0.937
        expect(grid.CalcClearPrice(0.25, 1)).toBe(0.937);
        // 第二档：price_step = 156/100 = 1.56 → FixedPrice(0.75, 1.56, 3) = 1.17
        expect(grid.CalcClearPrice(0.25, 2)).toBe(1.17);
    });

    it("计算网格收益（保留份数的清仓收益）", () =>
    {
        const grid = makeGrid();
        grid.target_price = 0.75;
        grid.grid_settings.TRADING_PRICE_PRECISION = 3;
        grid.grid_settings.CLEAR_STEP_PCT = 0.25;
        // retain_count=1000，第一档清仓价 0.937，平均清仓价 = 0.937*0.4 + 1.17*0.6 = 0.3748 + 0.702 = 1.0768
        const [first_income, clear_income] = grid.CalcGridIncomes(1000);
        expect(first_income).toBe(1000 * 0.937);
        expect(clear_income).toBeCloseTo(1000 * 1.0768, 0);
    });
});
