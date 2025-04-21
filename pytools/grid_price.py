# coding=utf-8

import os
import time
import requests
import datetime
import calendar
import json

'''
最新K线
API接口:http://api.biyingapi.com/jj/zxkx/基金代码/分时级别/您的licence
备用接口:http://api1.biyingapi.com/jj/zxkx/基金代码/分时级别/您的licence
接口说明:根据基金代码（《封闭式基金列表》、《ETF基金列表》、《LOF基金列表》接口获取的基金代码）获取最新K线数据。目前分时级别支持日、周、月级别，对应的参数分别是 dn、wn、mn。
数据更新:每日16点更新。
请求频率:1分钟20次 | 包年版1分钟3000次 | 白金版1分钟6000次
返回格式:标准Json格式 [{},...{}]
'''

API_PERFIX = "http://api.biyingapi.com/jj/lskx"
API_PERFIX2 = "http://api1.biyingapi.com/jj/lskx"
API_LICENCE = "b192f53a6d6928033"

STOCK_RECORD_DATE_LIST = [
    "sh510050,2005-02-04,SPL,1.1838",
    "sh510050,2006-05-19,DIV,0.0240",
    "sh510050,2006-11-16,DIV,0.0370",
    "sh510050,2008-11-19,DIV,0.0600",
    "sh510050,2010-11-16,DIV,0.0260",
    "sh510050,2012-05-16,DIV,0.0110",
    "sh510050,2012-11-13,DIV,0.0370",
    "sh510050,2013-11-15,DIV,0.0530",
    "sh510050,2014-11-17,DIV,0.0430",
    "sh510050,2016-11-29,DIV,0.0530",
    "sh510050,2017-11-28,DIV,0.0540",
    "sh510050,2018-12-03,DIV,0.0490",
    "sh510050,2019-12-02,DIV,0.0470",
    "sh510050,2020-11-30,DIV,0.0510",
    "sh510050,2021-11-29,DIV,0.0410",
    "sh510050,2022-12-01,DIV,0.0370",
    "sh510050,2023-11-27,DIV,0.0390",
    "sh510050,2024-12-02,DIV,0.0550",
    "sh512200,2024-08-09,SPL,0.3581",
    "sh512400,2024-09-18,DIV,0.0100",
    "sh512710,2021-03-19,SPL,2.0000",
    "sh512760,2020-09-09,SPL,2.0000",
    "sz159845,2021-03-22,SPL,1.5739",
    "sz159845,2022-08-01,SPL,0.3523",
    "sz159845,2023-02-28,SPL,0.7476",
    "sz159901,2006-04-14,SPL,0.9495",
    "sz159901,2007-07-11,DIV,0.1200",
    "sz159901,2010-11-19,SPL,5.0000",
    "sz159901,2014-08-29,SPL,0.2000",
    "sz159901,2021-04-09,SPL,2.0000",
    "sz159920,2018-06-22,DIV,0.0760",
    "sz159938,2022-05-27,SPL,2.0000",
]

STOCK_RECORD_DATE_DICT = {}
today_str = datetime.date.today().strftime("%Y-%m-%d")
#today_str = "2025-03-28"

def GetStockRecordDate():
    STOCK_RECORD_DATE_DICT.clear()

    for record_date in STOCK_RECORD_DATE_LIST:
        strs = record_date.split(",")
        date_list = STOCK_RECORD_DATE_DICT.setdefault(strs[0], [])
        if strs[2] == "SPL":
            date_list.append((strs[1], "real_price / %s" % strs[3]))
        elif strs[2] == "REV":
            date_list.append((strs[1], "real_price * %s" % strs[3]))
        elif strs[2] == "DIV":
            date_list.append((strs[1], "real_price - %s" % strs[3]))


def CalcForwardAdjustedPrice(record_date_list, date_str, real_price):
    for record_date, eval_str in record_date_list:
        if date_str <= record_date:
            real_price = eval(eval_str)
    return real_price


def GetStockHistoryPrice(stock_code):
    if os.path.exists("caches/%s_%s.txt" % (stock_code, today_str)):
        content = open("caches/%s_%s.txt" % (stock_code, today_str)).read()
        return json.loads(content)

    api_url = "%s/%s/dn/%s" % (API_PERFIX, stock_code, API_LICENCE)

    try:
        # 发送 GET 请求（可设置超时时间）
        response = requests.get(api_url, timeout=5)
        
        # 检查请求是否成功（HTTP 状态码 200 表示成功）
        if response.status_code == 200:
            # 获取网页内容（自动处理编码）
            content = response.text
            open("caches/%s_%s.txt" % (stock_code, today_str), "w").write(content)
            return json.loads(content)
        else:
            print(f"请求失败，状态码：{response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"请求异常：{e}")
    return


def n_years_ago(year_delta):
    today = datetime.date.today()
    target_year = today.year - year_delta
    try:
        # 尝试直接替换年份
        target_date = today.replace(year=target_year)
    except ValueError:
        # 处理闰日等特殊情况（如2月29日遇到非闰年）
        _, last_day = calendar.monthrange(target_year, today.month)
        target_date = datetime.date(target_year, today.month, last_day)
    return target_date.strftime("%Y-%m-%d")


def CalcHistoryPrice(stock_code):
    cur_price, max_price, min_price = 0, 0, 999999999
    series_10, series_5 = [], []
    price_list = GetStockHistoryPrice(stock_code)
    five_years_ago = n_years_ago(5)
    ten_years_ago = n_years_ago(10)
    record_date_list = STOCK_RECORD_DATE_DICT.get(stock_code, [])
    for data in price_list:
        date_str = data['d']
        close = CalcForwardAdjustedPrice(record_date_list, date_str, data['c'])
        high = CalcForwardAdjustedPrice(record_date_list, date_str, data['h'])
        low = CalcForwardAdjustedPrice(record_date_list, date_str, data['l'])
        if date_str > five_years_ago:
            series_5.append(close)
        if date_str > ten_years_ago:
            series_10.append(close)
        if date_str == today_str:
            cur_price = close
        if high > max_price:
            max_price = high
        if low < min_price:
            min_price = low
    return cur_price, max_price, min_price, series_5, series_10


def HistoryPriceTimePercent(price_series, target_price):
    total = len(price_series)
    count = 0
    for price in price_series:
        if target_price > price:
            count += 1
    return int((count / total) * 1000) / 10


def HistoryPricePositionPercent(price_series, target_price):
    min_price = min(price_series)
    max_price = max(price_series)
    pos = (target_price - min_price) / (max_price - min_price)
    return int(pos * 1000) / 10


def CalcGrid(MAX_PRICE, MIN_PRICE, CUR_PRICE, FST_PRICE):
    grid_min = MIN_PRICE / FST_PRICE
    grid_cur = CUR_PRICE / FST_PRICE
    grid_max = MAX_PRICE / FST_PRICE

    print("GRID_PCT_MIN: %s -> %s%%" % (MIN_PRICE, int(grid_min * 1000) / 10))
    print("GRID_PCT_CUR: %s -> %s%%" % (CUR_PRICE, int(grid_cur * 1000) / 10))
    print("GRIC_PCT_MAX: %s -> %s%%" % (MAX_PRICE, int(grid_max * 1000) / 10))


def Calc(stock_code, fst_price, cur_price = None):
    cur, max_price, min_price, series_5, series_10 = CalcHistoryPrice(stock_code)
    if cur_price is None: cur_price = cur
    up_price = int(fst_price * 1.03 * 1000) / 1000
    print("HIS_CUR_5 : %s%% -> %s%%" % (HistoryPricePositionPercent(series_5, cur_price), HistoryPriceTimePercent(series_5, cur_price)))
    print("HIS_CUR_10: %s%% -> %s%%" % (HistoryPricePositionPercent(series_10, cur_price), HistoryPriceTimePercent(series_10, cur_price)))
    #print("MIN: \t", min_price)
    #print("CUR: \t", cur_price)
    #print("MAX: \t", max_price)
    #print("---------------------------------")
    print("HIS_FST_5 : %s%% -> %s%%" % (HistoryPricePositionPercent(series_5, fst_price), HistoryPriceTimePercent(series_5, fst_price)))
    print("HIS_FST_10: %s%% -> %s%%" % (HistoryPricePositionPercent(series_5, fst_price), HistoryPriceTimePercent(series_5, fst_price)))
    CalcGrid(max_price, min_price, cur_price, fst_price)
    #print("---------- %s UP_TO %s ----------" % (fst_price, up_price))
    #print("HIS_UP_5  : %s" % HistoryPricePercent(series_5, up_price))
    #print("HIS_UP_10 : %s" % HistoryPricePercent(series_10, up_price))
    #CalcGrid(max_price, min_price, cur_price, up_price)


STOCK_DICT = {
    "sz159611": ("电力ETF", 1.12),
    "sz159819": ("人工智能ETF", 0.98),
    "sz159845": ("中证1000ETF", 2.92),
    "sz159869": ("游戏ETF", 1.1),
    "sz159875": ("新能源ETF", 0.75),
    "sz159901": ("深证100ETF", 3.811),
    "sz159920": ("恒生ETF", 1.470),
    "sz159938": ("医药卫生ETF", 1.046),
    "sz162411": ("华宝油气LOF", 0.810),
    "sh510050": ("上证50ETF", 3.450),
    "sh512200": ("房地产ETF", 1.5),
    "sh512400": ("有色金属ETF", 1.2),
    "sh512710": ("军工龙头ETF", 0.820),
    "sh512760": ("芯片ETF", 1.5),
    "sh512880": ("证券ETF", 1.15),
    "sh513050": ("中概互联网ETF", 1.790),
    "sh513180": ("恒生科技ETF", 0.951),
    "sh515650": ("消费50ETF", 1.433),
    "sh516970": ("基建50ETF", 1.250),
    "sh588380": ("双创50ETF", 0.840),
}

GetStockRecordDate()

for stock_code, (stock_name, fst_price) in STOCK_DICT.items():
    print(stock_name, "POS -> TIME")
    Calc(stock_code, fst_price)
    print("---------------------------------")
    time.sleep(1)
