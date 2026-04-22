# coding=utf-8

import requests

"""Utilities for formatting drip trading data."""

API_PREFIX = "http://api.biyingapi.com/jj/lskx"
API_LICENCE = "b192f53a6d6928033"

DIVIDEND_STOCK_LIST = ["sh510880", "sh600519", "sh601318"]

# 1. 设置你的API Key
API_KEY = "sk-cc2c4664628543d3a91fd33e634dd6a2"  # 请务必替换成你自己的Key

# 2. API地址和请求头
url = "https://api.deepseek.com/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"  # 在请求头中进行认证
}

# 3. 构建高级提示语
advanced_prompt = """作为金融信息专家，请为基金520890执行结构化数据提取。

**数据字段规范：**
- 数据前缀：固定为"STOCK"
- 基金代码：原样输出
- 基金名称：基金的简称,从完整官方名称中提取,比如使用ETF等标识来代替具体的中文,去掉发行的公司名称等冗余信息
- 交易所代码: sh表示上海, sz表示深圳, hk表示香港, us表示美国
- 分红周期：每月/每季/每年N次/暂无记录
- 发行日期: YYYY-MM-DD格式
- 资金规模: X.XX亿元格式
- 跟踪指数：完整指数名称
- 最近分红日期: YYYY-MM-DD或"无记录"
- 最近分红金额: X.XXXX, 如果没有记录则填写"0"
- 历史累计分红次数：计算历史上总共的分红次数，结果用数字表示,如果没有记录则填写"0"
- 历史累计分红金额: 计算历次分红的累计总额，结果为X.XXXX,如果没有记录则填写"0"

**严格输出格式：**
{数据前缀},{基金代码},{基金名称},{交易所代码},{分红周期},{发行日期},{规模},{跟踪指数},{最近分红日期},{最近分红金额},{累计次数},{累计金额}

**参考模板：**
STOCK,510880,中证红利ETF,sh,每年一次,2024-06-01,100亿,中证红利指数,2024-05-15,0.50,14,2.50

现在处理基金520890，请严格按照上述格式输出结果，不要添加任何额外信息。"""

# 4. 准备请求数据
data = {
    "model": "deepseek-chat",  # 按需切换模型：deepseek-reasoner 或 deepseek-chat
    "messages": [
        {"role": "system", "content": "作为金融信息专家，以及熟练利用互联网获取信息的助手"},  # 系统提示，用于设定助手的行为
        {"role": "user", "content": advanced_prompt}  # 用户的问题
    ],
    "stream": False  # 是否开启流式响应
}

# 5. 发送请求并获取响应
response = requests.post(url, headers=headers, json=data)

# 6. 处理返回结果
if response.status_code == 200:
    result = response.json()
    # 提取并打印模型的回复内容
    reply = result['choices'][0]['message']['content']
    print(reply)
else:
    print("请求失败，错误码：", response.status_code)


