# coding=utf-8

'''
https://api.biyingapi.com/zs/sz/b192f53a6d6928033
https://api.biyingapi.com/zs/sh/b192f53a6d6928033
https://api.biyingapi.com/zs/all/b192f53a6d6928033
'''

API_URL = "https://api.biyingapi.com/"
API_LICENSE = "b192f53a6d6928033"


STOCK_INFO_DICT = {
    ""
}


import json
import requests


def GetZSList(url):
    response = requests.get(url)
    resp_dict = response.json()

    for index in resp_dict:
        print(index["code"], index["name"])

def GetStockPE(url):
    response = requests.get(url)
    resp_dict = response.json()

    for stock in resp_dict:
        print(stock['dm'], stock['mc'], stock['mgsy'])


#GetZSList("https://api.biyingapi.com/zs/all/b192f53a6d6928033")
#GetZSList("https://api.biyingapi.com/zs/sz/b192f53a6d6928033")
#GetZSList("https://api.biyingapi.com/zs/sh/b192f53a6d6928033")

#GetZSList("http://api.biyingapi.com/hszg/list/b192f53a6d6928033")

'''
http://api.biyingapi.com/hicw/yl/年度(如2020)/季度(如1)/您的licence
'''

GetStockPE("http://api.biyingapi.com/hicw/yl/2022/3/b192f53a6d6928033")