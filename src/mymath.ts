/*
    mymath: 网格定制数学库, 对原生的Math库进行封装，使得计算逻辑更加符合网格交易规则
*/

export function FixedPrice(price: number, pct: number, precision: number)
{
    const scale = 10 ** precision;
    return Math.floor(Math.floor(price * scale) * Math.floor(pct * 100) / 100) / scale;
}

export function AlignPrice(price: number, precision: number)
{
    const scale = 10 ** precision;
    return Math.floor(price * scale) / scale;
}

export function MyFloor(num: number, single: number)
{
    return Math.floor(num / single) * single;
}

export function MyCeil(num: number, single: number)
{
    return Math.ceil(num / single) * single;
}

export function ToPercent(num: number, count = 0): string
{
    return (num * 100).toFixed(count) + "%";
}

export function ToPercentStr(num: number, count = 0): string
{
    return num.toFixed(count) + "%";
}

export function ToNumber(percent: string): number
{
    return Number(percent.replace("%", "")) / 100.0;
}

export function ToTradingGap(current_price: number|undefined, target_price: number|undefined, count=0): string
{
    if (target_price == undefined || current_price == undefined || current_price == 0)
    {
        return "-";
    }
    const gap = Math.abs(target_price - current_price);
    if (target_price > current_price)
    {
        return "+" + ToPercent(gap / current_price, count);
    }
    else
    {
        return "-" + ToPercent(gap / current_price, count);
    }
}

export function IsNumeric(str: string): boolean
{
    return !isNaN(Number(str));
}

export function TimeDuarion(dateStr1: string, dateStr2: string): number {
    // 创建Date对象（自动转换为UTC时间）
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);

    // 验证日期有效性
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        throw new Error("输入的日期格式不正确");
    }

    // 计算UTC午夜时间戳差值（避免夏令时影响）
    const utc1 = Date.UTC(
        date1.getUTCFullYear(),
        date1.getUTCMonth(),
        date1.getUTCDate()
    );
    const utc2 = Date.UTC(
        date2.getUTCFullYear(),
        date2.getUTCMonth(),
        date2.getUTCDate()
    );

    // 计算天数差并返回
    return Math.abs(Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24)));
}

export function AveragePrice(cost: number, count: number, single: number): number
{
    return MyCeil(cost / count, single);
}

export function StringPlus(num1: string, num2: string, single: number): string
{
    return String(MyFloor(Number(num1) + Number(num2), single));
}