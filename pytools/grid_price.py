# coding=utf-8

import os
import time
import requests
import datetime
import calendar
import json
import math

'''
最新K线
API接口:http://api.biyingapi.com/jj/zxkx/基金代码/分时级别/您的licence
备用接口:http://api1.biyingapi.com/jj/zxkx/基金代码/分时级别/您的licence
接口说明:根据基金代码 《封闭式基金列表》、《ETF基金列表》、《LOF基金列表》接口获取的基金代码 获取最新K线数据。目前分时级别支持日、周、月级别,对应的参数分别是 dn、wn、mn。
数据更新:每日16点更新。
请求频率:1分钟20次 | 包年版1分钟3000次 | 白金版1分钟6000次
返回格式:标准Json格式 [{},...{}]
'''

API_PERFIX = "http://api.biyingapi.com/jj/lskx"
API_PERFIX2 = "http://api1.biyingapi.com/jj/lskx"
API_LICENCE = "b192f53a6d6928033"

STOCK_RECORD_DATE_LIST = [
    # sh510050,上证50ETF
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
    # sz159901,深证100ETF
    "sz159901,2006-04-14,SPL,0.9495",
    "sz159901,2007-07-11,DIV,0.1200",
    "sz159901,2010-11-19,SPL,5.0000",
    "sz159901,2014-08-29,SPL,0.2000",
    "sz159901,2021-04-09,SPL,2.0000",
    # sz159845,中证1000ETF
    "sz159845,2021-03-22,SPL,1.5739",
    "sz159845,2022-08-01,SPL,0.3523",
    "sz159845,2023-02-28,SPL,0.7476",
    # sh588380,双创50ETF
    # sz159920,恒生ETF
    "sz159920,2018-06-22,DIV,0.0760",
    # sh513180,恒生科技ETF
    # sh513500,标普500ETF
    "sh513500,2022-03-29,SPL,2.0000",
    # sz159632,纳斯达克ETF
    # sh512880,证券ETF
    # sh512760,芯片ETF
    "sh512760,2020-09-09,SPL,2.0000",
    # sz159611,电力ETF
    # sz159869,游戏ETF
    # sh512200,房地产ETF
    "sh512200,2024-08-09,SPL,0.3581",
    # sh512710,军工龙头ETF
    "sh512710,2021-03-19,SPL,2.0000",
    # sz159938,医药卫生ETF
    "sz159938,2022-05-27,SPL,2.0000",
    # sz161725,白酒LOF
    "sz161725,2021-09-07,DIV,0.0120",
    "sz161725,2021-12-09,DIV,0.0280",
    "sz161725,2021-12-31,DIV,0.0450",
    # sh515650,消费50ETF
    # sh516970,基建50ETF
    # sz159875,新能源ETF
    # sh562500,机器人ETF
    # sz159819,人工智能ETF
    # sh513050,中概互联ETF
    # sz162411,华宝油气LOF
    # sh512400,有色金属ETF
    "sh512400,2024-09-18,DIV,0.0100",
]

CACHE_DIR_PATH = "pytools/caches"
STOCK_RECORD_DATE_DICT = {}
#today_str = datetime.date.today().strftime("%Y-%m-%d")
today_str = "2025-06-03"

'''
HIST,RANGE,2021-10-14,2025-04-10
HIST,CUR01,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,CUR03,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,CUR05,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,CUR10,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,FST03,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,FST05,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
HIST,FST10,1.5,2025-04-10,89.2%,0.5,2021-04-10,-59%,67.7%,45.2%
'''


class Stock:

    def __init__(self, code, name, fst_price):
        self.stock_code = code
        self.stock_name = name
        self.fst_price = fst_price
        #
        self.cur_price = 0
        self.series_01 = []
        self.series_03 = []
        self.series_05 = []
        self.series_10 = []
        self.series_99 = []
        self.begin_date = None
        self.end_date = None

    def Output(self):
        def _PCT(s, t):
            return "%3.0f%%" % math.ceil(t / s * 100)
        
        def _GAP(s, t):
            if (s > t):
                return "-%.0f%%" % math.ceil((s - t) / s * 100)
            else:
                return "+%.0f%%" % math.ceil((t - s) / s * 100)

        print("%s\t%s\t%s~%s\t" %(self.stock_code, self.stock_name, self.begin_date, self.end_date))
        print("\tCUR: %2.3f\t%s" % (self.cur_price, _PCT(self.fst_price, self.cur_price)))
        print("RANGE\tMIN\t PCT\tMAX\t PCT\tPOS\tTIME(目标价比%X时间高)")
        self.OutputSeries("CUR01", self.series_01, self.cur_price)
        self.OutputSeries("CUR03", self.series_03, self.cur_price)
        self.OutputSeries("CUR05", self.series_05, self.cur_price)
        self.OutputSeries("CUR10", self.series_10, self.cur_price)
        self.OutputSeries("CUR99", self.series_99, self.cur_price)
        print("\tFST: %2.3f\t%s" % (self.fst_price, _GAP(self.cur_price, self.fst_price)))
        print("RANGE\tMIN\t PCT\tMAX\t PCT\tPOS\tTIME(目标价比%X时间高)")
        self.OutputSeries("FST01", self.series_01, self.fst_price)
        self.OutputSeries("FST03", self.series_03, self.fst_price)
        self.OutputSeries("FST05", self.series_05, self.fst_price)
        self.OutputSeries("FST10", self.series_10, self.fst_price)
        self.OutputSeries("FST99", self.series_99, self.fst_price)
        print("----------------------------------------------------")

    def OutputSeries(self, perfix_str, price_series, target_price):
        min_price = min(price_series)
        max_price = max(price_series)
        total_count = len(price_series)
        up_count = 0
        for price in price_series:
            if target_price > price:
                up_count += 1
        pos_pct = (target_price - min_price) / (max_price - min_price) * 100
        time_pct = up_count / total_count * 100
        def _PCT(s, t):
            return "%3.0f%%" % math.ceil(t / s * 100)
        print("%s\t%2.3f\t%s\t%2.3f\t%s\t%3.2f%%\t%3.2f%%" % (perfix_str, min_price, _PCT(target_price, min_price), max_price, _PCT(target_price, max_price), pos_pct, time_pct))


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
    if os.path.exists("%s/%s_%s.txt" % (CACHE_DIR_PATH, stock_code, today_str)):
        content = open("%s/%s_%s.txt" % (CACHE_DIR_PATH, stock_code, today_str)).read()
        return json.loads(content)

    api_url = "%s/%s/dn/%s" % (API_PERFIX, stock_code, API_LICENCE)

    try:
        # 发送 GET 请求（可设置超时时间）
        response = requests.get(api_url, timeout=5)
        
        # 检查请求是否成功（HTTP 状态码 200 表示成功）
        if response.status_code == 200:
            # 获取网页内容（自动处理编码）
            content = response.text
            open("%s/%s_%s.txt" % (CACHE_DIR_PATH, stock_code, today_str), "w").write(content)
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


def CalcHistoryPrice(stock: Stock):
    cur_price = 0
    begin_date = today_str
    end_date = '0'
    price_list = GetStockHistoryPrice(stock_code)
    one_years_ago = n_years_ago(1)
    three_years_ago = n_years_ago(3)
    five_years_ago = n_years_ago(5)
    ten_years_ago = n_years_ago(10)
    record_date_list = STOCK_RECORD_DATE_DICT.get(stock_code, [])
    for data in price_list:
        date_str = data['d']
        close = CalcForwardAdjustedPrice(record_date_list, date_str, data['c'])
        high = CalcForwardAdjustedPrice(record_date_list, date_str, data['h'])
        low = CalcForwardAdjustedPrice(record_date_list, date_str, data['l'])
        stock.series_99.append(close)
        if date_str > one_years_ago:
            stock.series_01.append(close)
        if date_str > three_years_ago:
            stock.series_03.append(close)
        if date_str > five_years_ago:
            stock.series_05.append(close)
        if date_str > ten_years_ago:
            stock.series_10.append(close)
        if date_str == today_str:
            cur_price = close
        if date_str < begin_date:
            begin_date = date_str
        if date_str > end_date:
            end_date = date_str
    stock.cur_price = cur_price
    stock.begin_date = begin_date
    stock.end_date = end_date
    return True


STOCK_DICT = {
    # 指数
    "sh510050": ("上证50ETF", 3.450),
    "sz159901": ("深证100ETF", 3.811),
    "sz159845": ("中证1000ETF", 2.92),
    "sh588380": ("双创50ETF", 0.840),
    "sz159920": ("恒生 ETF", 1.470),
    "sh513180": ("恒生科技ETF", 0.951),
    "sh513500": ("标普500ETF", 1.608),
    "sz159632": ("纳斯达克ETF", 1.5),
    # 行业
    "sh512880": ("证券 ETF", 1.15),
    "sh512760": ("芯片 ETF", 1.5),
    "sz159611": ("电力 ETF", 0.95),
    "sz159869": ("游戏 ETF", 1.1),
    "sh512200": ("房地产ETF", 1.5),
    "sh512710": ("军工龙头ETF", 0.820),
    "sz159938": ("医药卫生ETF", 1.046),
    "sz161725": ("白酒LOF", 0.90),
    # 概念
    "sh515650": ("消费50ETF", 1.433),
    "sh516970": ("基建50ETF", 1.250),
    "sz159875": ("新能源ETF", 0.75),
    "sh562500": ("机器人ETF", 0.98),
    "sz159819": ("人工智能ETF", 0.98),
    "sh513050": ("中概互联网ETF", 1.790),
    # 大宗
    "sz162411": ("华宝油气LOF", 0.810),
    "sh512400": ("有色金属ETF", 1.2),
}

#STOCK_DICT = {"sh562500": ("机器人ETF", 0.9),}

if not os.path.exists(CACHE_DIR_PATH):
    os.mkdir(CACHE_DIR_PATH)

GetStockRecordDate()

for stock_code, (stock_name, fst_price) in STOCK_DICT.items():
    stock = Stock(stock_code, stock_name, fst_price)
    CalcHistoryPrice(stock)
    stock.Output()
    #time.sleep(1)
