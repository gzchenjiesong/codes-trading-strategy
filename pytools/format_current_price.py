# coding=utf-8

import requests
import datetime


STOCK_DICT = {
    # 指数
    "sh510050": ("上证50ETF", 3.348),
    "sz159901": ("深证100ETF", 3.636),
    "sh562000": ("中证A100ETF", 1.266),
    "sz159845": ("中证1000ETF", 3.522),
    "sh588380": ("双创50ETF", 0.923),
    "sz159920": ("恒生ETF", 1.468),
    "sh513180": ("恒科ETF", 0.951),
    "sh513500": ("标普500ETF", 1.819),
    "sz159632": ("纳指100ETF", 1.405),
    # 行业
    "sh512880": ("证券ETF", 1.354),
    "sh512760": ("芯片ETF", 1.503),
    "sz159869": ("游戏ETF", 1.092),
    "sh512710": ("军工ETF", 0.820),
    "sz159938": ("医药ETF", 1.046),
    "sz159611": ("电力ETF", 0.950),
    "sh512200": ("地产ETF", 1.523),
    "sz161725": ("白酒LOF", 0.900),
    "sz159870": ("化工ETF", 0.861),
    "sz159852": ("软件ETF", 0.984),
    "sh515880": ("通信ETF", 2.068),
    # 概念
    "sh515650": ("消费50ETF", 1.433),
    "sh516970": ("基建50ETF", 1.247),
    "sz159875": ("新能源ETF", 0.750),
    "sh562500": ("机器人ETF", 1.231),
    "sz159559": ("机器人50ETF", 1.651),
    "sz159819": ("人工智能ETF", 1.298),
    "sh513050": ("中概ETF", 1.790),
    # 大宗
    "sz162411": ("油气LOF", 0.810),
    "sh512400": ("有色ETF", 1.198),
}


api_url = "https://hq.sinajs.cn/list="
for stock_code in STOCK_DICT.keys():
    api_url = api_url + stock_code + ","

resp = requests.get(api_url, headers={"referer" : "https://finance.sina.com.cn/"})

try:
    content = resp.content.decode('gbk')
except UnicodeDecodeError:
    content = resp.content.decode('utf-8')

contents = content.strip().split("\n")
today_str = datetime.date.today().strftime("%Y-%m-%d")
print("DATE,%s" % today_str)

for stock_info in contents:
    stock_name = stock_info.split(",")[0].replace("var hq_str_", "").replace("=", ",").replace('"', "").strip()
    stock_price = stock_info.split(",")[3]

    print("PRICE," + stock_name + "," + stock_price)
