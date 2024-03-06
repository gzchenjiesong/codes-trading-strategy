/*
    mymath: 网格定制数学库, 对原生的Math库进行封装，使得计算逻辑更加符合网格交易规则
*/


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