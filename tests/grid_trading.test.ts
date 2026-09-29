import { describe, it, expect } from "vitest";
import { PluginEnv } from "../src/plugin_env";
import { GridTradingModeThree } from "../src/grid_trading_m3";

// 真实 .gtv 样例（改造后：删 STEP 行，新增第0格，小网从 1 开始）
const SAMPLE_GTV = [
    "mode_three,159875,新能源ETF,sz,0.75,0.525",
    "BASE,10000,0.7,0.005,3,100,0.10,0.25,0.50,0.53",
    "INTEREST,2025,0.045,40,0.85",
    "SGRID,小网0,106.10%,0,0",
    "SGRID,小网1,100.00%,0.01,3",
    "SGRID,小网2,94.23%,0.06,3",
    "MGRID,中网0,104.00%,0,0",
    "MGRID,中网1,87.06%,2.01,1.5",
    "LGRID,大网0,102.00%,0,0",
    "LGRID,大网1,77.30%,3.01,1",
    "BUY,2024-01-23,小网1,0.760,12000",
    "SELL,2024-02-10,小网1,0.800,11000",
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

    it("解析 INTEREST 行计息参数", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.grid_settings.INTEREST_YEAR).toBe(2025);
        expect(grid.grid_settings.INTEREST_RATE).toBe(0.045);
        expect(grid.grid_settings.INTEREST_STEP).toBe(40);
        expect(grid.grid_settings.INTEREST_TRIGGER).toBe(0.85);
    });

    it("解析第0格（卖出参考格）", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        // 第0格：价格位 = 首网卖出价
        expect(grid.sgrid_step_table[0]).toEqual(["小网0", "106.10%", "0", "0"]);
        expect(grid.sgrid_step_table[1]).toEqual(["小网1", "100.00%", "0.01", "3"]);
        expect(grid.mgrid_step_table[0]).toEqual(["中网0", "104.00%", "0", "0"]);
        expect(grid.lgrid_step_table[0]).toEqual(["大网0", "102.00%", "0", "0"]);
    });

    it("解析 BUY/SELL 交易记录（小网从 1 开始，买卖配对后 buy_grid_record 清空）", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        expect(grid.raw_trading_record.length).toBe(2);
        expect(grid.raw_trading_record[0]).toEqual(["BUY", "2024-01-23", "小网1", "0.760", "12000"]);
        expect(grid.raw_trading_record[1]).toEqual(["SELL", "2024-02-10", "小网1", "0.800", "11000"]);
        expect(grid.buy_grid_record).toEqual([]);
    });

    it("相同数据重复解析返回 false（MD5 缓存）", () =>
    {
        const grid = makeGrid();
        expect(grid.ParseRawData(SAMPLE_GTV)).toBe(true);
        expect(grid.ParseRawData(SAMPLE_GTV)).toBe(false);
    });
});

describe("InitTradingTable 首网卖出价（第0格逻辑）", () =>
{
    it("首网（小网1）卖出价 = 第0格价格位", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        grid.InitTradingTable();
        // trading_table[1] = 小网1（首网）
        expect(grid.trading_table[1][0]).toBe("小网1");
        // 买入价 = 目标价 × 100% = 0.75
        expect(grid.trading_table[1][3]).toBe("0.750");
        // 卖出价 = 目标价 × 106.10% = 0.795（第0格价格位）
        expect(grid.trading_table[1][7]).toBe("0.795");
    });

    it("小网2 卖出价 = 小网1 的买入价（100%）", () =>
    {
        const grid = makeGrid();
        grid.ParseRawData(SAMPLE_GTV);
        grid.InitTradingTable();
        expect(grid.trading_table[2][0]).toBe("小网2");
        expect(grid.trading_table[2][3]).toBe("0.706"); // 0.75 × 94.23% 向下取整
        expect(grid.trading_table[2][7]).toBe("0.750"); // 0.75 × 100%
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
        expect(grid.CalcClearPrice(0.25, 1)).toBe(0.937);
        expect(grid.CalcClearPrice(0.25, 2)).toBe(1.17);
    });

    it("计算网格收益（保留份数的清仓收益）", () =>
    {
        const grid = makeGrid();
        grid.target_price = 0.75;
        grid.grid_settings.TRADING_PRICE_PRECISION = 3;
        grid.grid_settings.CLEAR_STEP_PCT = 0.25;
        const [first_income, clear_income] = grid.CalcGridIncomes(1000);
        expect(first_income).toBe(1000 * 0.937);
        expect(clear_income).toBeCloseTo(1000 * 1.0768, 0);
    });
});
