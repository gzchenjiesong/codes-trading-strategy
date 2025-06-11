# coding=utf-8

import requests
import datetime


STOCK_DICT = {
    "sz159611": ("电力ETF", 1.12),
    "sz159632": ("纳斯达克ETF", 1.5),
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
    "sh513500": ("标普500ETF", 1.608),
    "sh515650": ("消费50ETF", 1.433),
    "sh516970": ("基建50ETF", 1.250),
    "sh562500": ("机器人ETF", 1.0),
    "sh588380": ("双创50ETF", 0.840),
}

api_url = "http://hq.sinajs.cn/list="
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
