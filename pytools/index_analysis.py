# coding=utf-8

import os
import requests
import json
import time
import datetime
from calendar import monthrange

API_PERFIX = "http://api.biyingapi.com/zs/hfsjy"
API_PERFIX2 = "http://api.biyingapi.com/hszg/gg"
API_LICENCE = "b192f53a6d6928033"


def GetStockHistoryPrice(stock_code):
    today_str = datetime.date.today().strftime("%Y-%m-%d")
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


def GetStockListBelongIndex(index_code):
    api_url = "%s/%s/%s" % (API_PERFIX2, index_code, API_LICENCE)

    try:
        response = requests.get(api_url, timeout=5)

        if response.status_code == 200:
            content = response.text
            return json.loads(content)
        else:
            print(f"Request failed, status code: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"Request exception: {e}")


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
    cur_price = 0
    series_10, series_5, series_all = [], [], []
    price_list = GetStockHistoryPrice(stock_code)
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    first_day, last_day = today_str, '0'
    five_years_ago = n_years_ago(5)
    ten_years_ago = n_years_ago(10)
    for data in price_list:
        if data['d'] > five_years_ago:
            series_5.append(data['c'])
        if data['d'] > ten_years_ago:
            series_10.append(data['c'])
        if data['d'] == today_str:
            cur_price = data['c']
        series_all.append(data['c'])
        if data['d'] < first_day:
            first_day = data['d']
        if data['d'] > last_day:
            last_day = data['d']
    return cur_price, series_5, series_10, series_all, first_day, last_day


def HistoryPriceTimePercent(price_series, target_price):
    total = len(price_series)
    count = 0
    for price in price_series:
        if target_price >= price:
            count += 1
    return int((count / total) * 1000) / 10


def HistoryPricePositionPercent(price_series, target_price):
    min_price = min(price_series)
    max_price = max(price_series)
    pos = (target_price - min_price) / (max_price - min_price)
    return int(pos * 1000) / 10


def Calc(stock_code):
    cur_price, series_5, series_10, series_all, first_day, last_day = CalcHistoryPrice(stock_code)
    years = int(last_day.split('-')[0]) - int(first_day.split('-')[0])
    print("--TIME: %s years ago" % years)
    print("\tMIN\tCUR\tMAX\tHIS_POS\tHIS_TIME\t")
    print("%syears\t%8.2f%8.2f%8.2f%8.2f\t%s\t" % (years, min(series_all), cur_price, max(series_all), HistoryPricePositionPercent(series_all, cur_price), HistoryPriceTimePercent(series_all, cur_price)))
    print("10years\t%8.2f%8.2f%8.2f%8.2f\t%s\t" % (min(series_10), cur_price, max(series_10), HistoryPricePositionPercent(series_10, cur_price), HistoryPriceTimePercent(series_10, cur_price)))
    print(" 5years\t%8.2f%8.2f%8.2f%8.2f\t%s\t" % (min(series_5), cur_price, max(series_5), HistoryPricePositionPercent(series_5, cur_price), HistoryPriceTimePercent(series_5, cur_price)))
    print("---------------------------------")


INDEX_DICT = {
    "sh000016": "上证50",
    "sz399330": "深证100",
    "sh000852": "中证1000",
}


"""for index_code, index_name in INDEX_DICT.items():
    print("index: %s %s" % (index_code, index_name))
    Calc(index_code)
    time.sleep(1)
"""

stock_list = GetStockListBelongIndex("zhishu_000016")

for stock in stock_list:
    print("%s %s %s" % (stock['dm'], stock['mc'], stock['jys']))
