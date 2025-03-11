# coding=utf-8

import time
import requests
import datetime
from calendar import monthrange
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


def GetStockHistoryPrice(stock_code):
    api_url = "%s/%s/dn/%s" % (API_PERFIX, stock_code, API_LICENCE)

    try:
        # 发送 GET 请求（可设置超时时间）
        response = requests.get(api_url, timeout=5)
        
        # 检查请求是否成功（HTTP 状态码 200 表示成功）
        if response.status_code == 200:
            # 获取网页内容（自动处理编码）
            content = response.text
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
        _, last_day = monthrange(target_year, today.month)
        target_date = datetime.date(target_year, today.month, last_day)
    return target_date.strftime("%Y-%m-%d")


def CalcHistoryPrice(stock_code):
    cur_price, max_price, min_price = 0, 0, 999999999
    series_10, series_5 = [], []
    price_list = GetStockHistoryPrice(stock_code)
    today = datetime.date.today().strftime("%Y-%m-%d")
    five_years_ago = n_years_ago(5)
    ten_years_ago = n_years_ago(10)
    for data in price_list:
        if data['d'] > five_years_ago:
            series_5.append(data['c'])
        if data['d'] > ten_years_ago:
            series_10.append(data['c'])
        if data['d'] == today:
            cur_price = data['c']
        if data['h'] > max_price:
            max_price = data['h']
        if data['l'] < min_price:
            min_price = data['l']
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
    #"sz159611": ("电力ETF", 1.12),
    #"sz159819": ("人工智能ETF", 0.98),
    #"sz159845": ("中证1000ETF", 2.92),
    #"sz159869": ("游戏ETF", 1.1),
    #"sz159875": ("新能源ETF", 0.75),
    #"sz159901": ("深证100ETF", 3.811),
    #"sz159920": ("恒生ETF", 1.470),
    #"sz159938": ("医药卫生ETF", 0.951),
    #"sz162411": ("华宝油气LOF", 0.810),
    #"sh510050": ("上证50ETF", 3.450),
    #"sh512200": ("房地产ETF", 1.5),
    #"sh512400": ("有色金属ETF", 1.2),
    #"sh512710": ("军工龙头ETF", 0.820),
    #"sh512760": ("芯片ETF", 1.5),
    #"sh512280": ("证券ETF", 1.15),
    #"sh513050": ("中概互联网ETF", 1.790),
    #"sh513180": ("恒生科技ETF", 0.951),
    #"sh515650": ("消费50ETF", 1.433),
    #"sh516970": ("基建50ETF", 1.250),
    "sh588380": ("双创50ETF", 0.750),
}


for stock_code, (stock_name, fst_price) in STOCK_DICT.items():
    print(stock_name, "POS -> TIME")
    Calc(stock_code, fst_price)
    print("---------------------------------")
    time.sleep(10)
