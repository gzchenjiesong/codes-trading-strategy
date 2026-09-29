/*
    数据来源: 腾讯行情 qt.gtimg.cn
    ETF/LOF/指数当前价: https://qt.gtimg.cn/q=<市场><代码>  (GBK 编码)
    返回格式: v_sh513180="1~名称~代码~现价~昨收~今开~...";
    字段用 ~ 分隔, 现价在 index 3
*/
import { requestUrl } from "obsidian";


export async function GetCurrentPriceFromTencent(etf_code: string): Promise<number>
{
    // etf_code 形如 "sh513180" / "sz159869"
    const data_api = "https://qt.gtimg.cn/q=" + etf_code;
    try
    {
        const response = await requestUrl({
            url: data_api,
            method: "GET",
            headers: {
                referer: "https://gu.qq.com/",
            },
        });

        // 腾讯返回 GBK, requestUrl 按 UTF-8 解析会导致中文乱码,
        // 但价格字段(数字)与分隔符 ~ 不受影响, 直接按 ~ 切分取 index 3 即可
        const content = response.text;
        const contents = content.trim().split("\n");
        const strs = contents[0].split("~");
        const current_price = Number(strs[3]);
        return current_price;
    }
    catch (error)
    {
        console.warn("GetCurrentPriceFromTencent failed", etf_code, error);
    }

    return -1;
}


export function DebugLog(...args: unknown[])
{
    let log_str = "";
    args.forEach((cell) => {
        log_str = log_str + String(cell);
    });
    console.log(log_str);
}
