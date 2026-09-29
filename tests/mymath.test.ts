import { describe, it, expect } from "vitest";
import {
    FixedPrice, AlignPrice, MyFloor, MyCeil, ToPercent, ToPercentStr, ToNumber,
    ToTradingGap, IsNumeric, TimeDuarion, AveragePriceStr, ProportionPctStr, NextInterestDate
} from "../src/mymath";

describe("ToPercent / ToNumber", () =>
{
    it("整数百分比", () =>
    {
        expect(ToPercent(0.5)).toBe("50%");
        expect(ToPercent(0.5, 1)).toBe("50.0%");
        expect(ToPercent(0.333, 1)).toBe("33.3%");
    });

    it("百分比转数值", () =>
    {
        expect(ToNumber("50%")).toBe(0.5);
        expect(ToNumber("33.3%")).toBeCloseTo(0.333);
    });

    it("ToPercentStr 不乘 100", () =>
    {
        expect(ToPercentStr(50, 1)).toBe("50.0%");
    });
});

describe("MyFloor / MyCeil", () =>
{
    it("按单手份数向下取整", () =>
    {
        expect(MyFloor(105, 10)).toBe(100);
        expect(MyFloor(3.7, 1)).toBe(3);
        expect(MyFloor(108, 100)).toBe(100);
    });

    it("按单手份数向上取整", () =>
    {
        expect(MyCeil(105, 10)).toBe(110);
        expect(MyCeil(3.2, 1)).toBe(4);
    });
});

describe("ToTradingGap", () =>
{
    it("目标价高于现价，返回正涨幅", () =>
    {
        expect(ToTradingGap(0.5, 0.55)).toBe("+10%");
    });

    it("目标价低于现价，返回负跌幅", () =>
    {
        expect(ToTradingGap(0.6, 0.55)).toBe("-8%");
    });

    it("现价为 0 返回占位符", () =>
    {
        expect(ToTradingGap(0, 0.55)).toBe("-");
    });
});

describe("FixedPrice / AlignPrice", () =>
{
    it("FixedPrice 按精度向下取整", () =>
    {
        expect(FixedPrice(3.348, 0.9, 3)).toBe(3.013);
    });

    it("AlignPrice 直接按精度取整", () =>
    {
        expect(AlignPrice(3.348, 3)).toBe(3.348);
        expect(AlignPrice(3.3489, 3)).toBe(3.348);
    });
});

describe("IsNumeric / AveragePriceStr / ProportionPctStr", () =>
{
    it("IsNumeric 判断数字字符串", () =>
    {
        expect(IsNumeric("123")).toBe(true);
        expect(IsNumeric("abc")).toBe(false);
        expect(IsNumeric("12.5")).toBe(true);
    });

    it("AveragePriceStr 计算均价", () =>
    {
        expect(AveragePriceStr(100, 2, 2)).toBe("50.00");
        expect(AveragePriceStr(100, 0, 2)).toBe("0.00");
    });

    it("ProportionPctStr 计算占比", () =>
    {
        expect(ProportionPctStr(3, 10, 1)).toBe("30.0%");
        expect(ProportionPctStr(1, 0, 1)).toBe("0.0%");
    });
});

describe("TimeDuarion / NextInterestDate", () =>
{
    it("TimeDuarion 计算天数差", () =>
    {
        expect(TimeDuarion("2024-01-01", "2024-01-11")).toBe(10);
    });

    it("NextInterestDate 计算下次计息日", () =>
    {
        expect(NextInterestDate(2025, 1)).toBe("2026-10-01");
        expect(NextInterestDate(2020, 2)).toMatch(/^\d{4}-10-01$/);
    });
});
