# coding=utf-8

'''
fetch_history_db.py
说明: 拉取所有上市公司的财报信息, 缓存原始数据并且按照股票代码进行分类存储, PE数据归一到每个季度的滚动市盈率跟静态市盈率
盈利接口说明: 
    地址: http://api.biyingapi.com/hicw/yl/年度(如2020)/季度(如1)/您的licence
    说明: 个股盈利能力汇总，支持“年份_季度”查询，年份可选（1989~当前年份），季度可选（1:一季报，2：中报，3：三季报，4：年报），如“2021_1”，表示查询2021年一季度数据。
    返回值：
        字段名称	数据类型	字段说明
        dm	string	代码
        mc	string	名称
        jzcsy	number	净资产收益率(%)
        jll	number	净利率(%)
        mll	number	毛利率(%)
        jlr	number	净利润(百万元)
        mgsy	number	每股收益(元)
        yysr	number	营业收入(百万元)
        mgzysr	number	每股主营业务收入(元)
        y	number	报告年份，如2021
        q	number	报告季度，1:一季报，2：中报，3：三季报，4：年报
        yq	string	报告年份季度含义，如“2021年一季报”
'''

import os
import json
import requests

API_LICENSE = "b192f53a6d6928033"
RAW_DATA_PATH = "history_db/raw_data/"
INCOME_DATA_PATH = "history_db/stock_income/"


def GetStockHistoryIncome(year, quarter, is_force=False):
    full_path = "%s/income_%s_%s.txt" % (RAW_DATA_PATH, year, quarter)
    if not is_force and os.path.exists(full_path):
        content = open(full_path).read()
        return json.loads(content)

    api_url = "http://api.biyingapi.com/hicw/yl/%s/%s/%s" % (year, quarter, API_LICENSE)

    try:
        # 发送 GET 请求（可设置超时时间）
        response = requests.get(api_url, timeout=5)
        
        # 检查请求是否成功（HTTP 状态码 200 表示成功）
        if response.status_code == 200:
            # 获取网页内容（自动处理编码）
            content = response.text
            open(full_path, "w").write(content)
            return json.loads(content)
        else:
            print(f"请求失败，状态码：{response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"请求异常：{e}")
    return

# stock_code : {year_quarter: mgsy}
stock_income_dict = {}

for year in range(1999, 2026):
    for quarter in [1, 2, 3, 4]:
        time_str = f"{year}_{quarter}"
        stock_list = GetStockHistoryIncome(year, quarter)
        if stock_list:
            for stock in stock_list:
                if stock["dm"] not in stock_income_dict:
                    stock_income_dict[stock["dm"]] = {}
                stock_income_dict[stock["dm"]][time_str] = stock["mgsy"]


# check data

for stock_code, stock_income in stock_income_dict.items():
    is_first = True
    for year in range(1999, 2006):
        for quarter in [1, 2, 3, 4]:
            time_str = f"{year}_{quarter}"
            if is_first:
                if time_str in stock_income:
                    print(f"{stock_code} start at {time_str}")
                    is_first = False
            else:
                if time_str not in stock_income:
                    print(f"{stock_code} lost {time_str}")

"""
stock_ttm_income_dict = {}

for stock_code, stock_income in stock_income_dict.items():
    for year in range(2000, 2020):
        last_q1 = stock_income[f"{year - 1}_1"]
        last_q2 = stock_income[f"{year - 1}_2"]
        last_q3 = stock_income[f"{year - 1}_3"]
        last_q4 = stock_income[f"{year - 1}_4"]
        stock_ttm = stock_ttm_income_dict.setdefault(stock_code, {})
        stock_ttm[f"{year}_1"] = last_q4 - last_q1 + stock_income[f"{year}_1"]
        stock_ttm[f"{year}_2"] = last_q4 - last_q2 + stock_income[f"{year}_2"]
        stock_ttm[f"{year}_3"] = last_q4 - last_q3 + stock_income[f"{year}_3"]
        stock_ttm[f"{year}_4"] = stock_income[f"{year}_4"]

for stock_code, stock_ttm in stock_ttm_income_dict.items():
    full_path = f"{INCOME_DATA_PATH}{stock_code}.txt"
    open(full_path, "w").write(json.dumps(stock_ttm))
"""