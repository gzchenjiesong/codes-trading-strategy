/*
    数据来源: 必盈数据(https://ad.biyingapi.com/apidoc.html)
    数据范围:
        沪深基础数据: 股票列表、公司详情、实时交易、历史数据、涨跌股池、资金流向等60余个不同类型的数据接口
        沪深深度数据: 投资参考、龙虎榜、市场表现、财务分析、机构持股、资金流等80余个向个不同类型的数据接口
        沪深指数数据: 沪深指数列表、实时交易、历史数据、分时KDJ、分时MACD、分时BOLL等16个不同类型的数据接口
        基金行情数据: 基金列表、估值行情、最新K线、历史K线、资产负债表、档案信息等70余个不同类型的数据接口
    数据接口:
        ETF基金行情
            API接口：https://api.biyingapi.com/jj/etfhq/ETF基金代码/您的licence
            备用接口：https://api1.biyingapi.com/jj/etfhq/ETF基金代码/您的licence
        LOF基金行情
            API接口：https://api.biyingapi.com/jj/lofhq/LOF基金代码/您的licence
            备用接口：https://api1.biyingapi.com/jj/lofhq/LOF基金代码/您的licence
*/
import { Notice, requestUrl } from "obsidian";

const data_url_prefix = "http://api.biyingapi.com";


async function FetchData(data_api: string, api_licence: string, debug_log: string[][])
{
    const url = data_url_prefix + data_api + "/" + api_licence;
    debug_log.push(["Info", "full url", url]);
    const response = await requestUrl(url);
    return response.json;
}

export async function GetETFCurrentPrice(etf_code: string, api_licence: string)
{
    if (!(etf_code.startsWith("sz") || etf_code.startsWith("sh")))
    {
        // 非sz/sh市场的ETF价格无法自动获取
        return -1;
    }
    const data_api = data_url_prefix + "/jj/etfhq/" + etf_code + "/" + api_licence;
    //DebugLog("request url: ", data_api);
    try
    {
        const response = await requestUrl(data_api);
        return response.json["zxj"];
    }
    catch(e)
    {
        DebugLog("request ", data_api, "  error ", e.message);
        return -1;
    }
}

export async function GetLOFCurrentPrice(lof_code: string, api_licence: string)
{
    if (!(lof_code.startsWith("sz") || lof_code.startsWith("sh")))
    {
        // 非sz/sh市场的LOF价格无法自动获取
        return -1;
    }
    const data_api = data_url_prefix + "/jj/lofhq/" + lof_code + "/" + api_licence;
    //DebugLog("request url: ", data_api);
    try
    {
        const response = await requestUrl(data_api);
        return response.json["zxj"];
    }
    catch(e)
    {
        DebugLog("request ", data_api, "  error ", e.message);
        return -1;
    }
}

export function DebugLog(...args)
{
    let log_str = "";
    args.forEach((cell, i) => {
        log_str = log_str + String(cell);
    });
    new Notice(log_str, 0);
}
