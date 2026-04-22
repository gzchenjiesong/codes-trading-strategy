# coding=utf-8

import math

# 计算定投固收
RATE = 0.045
BASE_COUNT = 500000
ADD_COUNT = 100000
YEARS = 0
TOTAL = BASE_COUNT

for year in range(0, YEARS):
    income = TOTAL * RATE
    TOTAL = TOTAL * (1 + RATE) + ADD_COUNT
    print(year + 1, math.floor(TOTAL/10000), math.floor(income / 10000))


# 计算买入份数
MIN_LOT_SIZE = 100

def CalcBuyCount(stock_code, current_price, buy_cost):
    buy_count = buy_cost / current_price
    buy_count = int(buy_count / MIN_LOT_SIZE + 1) * MIN_LOT_SIZE
    print(stock_code, buy_count)
    return buy_count

#CalcBuyCount("sh510880", 3.140, 20000)
#CalcBuyCount("sz159201", 1.119, 20000)
#CalcBuyCount("sh518880", 8.009, 20000)
#CalcBuyCount("sh513950", 1.408, 20000)
#CalcBuyCount("sh510720", 0.966, 20000)
CalcBuyCount("sh515080", 1.538, 20000)

# 计算网格的持仓利息格
RATE = 0.045
STEP = 2
HOLDING = 100
CUR_PCT = 40

def CalcProfitPct():
    while CUR_PCT < 90:
        #PROFIT = 120 if CUR_PCT >= 75 else 105 if CUR_PCT >= 60 else 95
        PROFIT = (math.floor(CUR_PCT / 10) + 3) * 10 + 10
        buy_pct = HOLDING * (RATE / (PROFIT / CUR_PCT - 1.0))
        print("%3d -> %3d : %4.2f%%" % (CUR_PCT, PROFIT, buy_pct))
        CUR_PCT += STEP

#CalcProfitPct()

# 计算网格间隔
SGRID_PCTS = []
MGRID_PCTS = []
LGRID_PCTS = []

def One():
    '''
STEP,0.061,0,3,0.03,0,2,0.01,0,1
    '''
    FST_PCT = 115.93
    STEP = 1.03
    index = -5

    while True:
        FST_PCT = FST_PCT / STEP
        index += 1
        if FST_PCT <= 40:
            break
        tail = ""
        if (index >= 0 and index % 2 == 0) or index == -2:
            tail = "S "
            if index >=0:
                SGRID_PCTS.append(FST_PCT)
        else:
            tail = "  "
        if index in (29, 23, 17, 11, 5, -1):
            tail += "M "
            if index >= 0:
                MGRID_PCTS.append(FST_PCT)
        else:
            tail += "  "
        if index in (27, 18, 9):
            tail += "L"
            if index >= 0:
                LGRID_PCTS.append(FST_PCT)
        else:
            tail += " "

        print("%2d : %6.2f %s" % (index, FST_PCT, tail))

    for idx in range(12):
        print("%2d : %.2f" % (idx, math.pow(STEP, idx)))


def Two():
    '''
STEP,0.051,0,3,0.025,0,2,0.01,0,1
    '''
    FST_PCT = 113.14
    STEP = 1.025
    index = -5

    while True:
        FST_PCT = FST_PCT / STEP
        index += 1
        if FST_PCT <= 60:
            break
        tail = ""
        if (index >= 0 and index % 2 == 0) or index == -2:
            tail = "S "
            if index >=0:
                SGRID_PCTS.append(FST_PCT)
        else:
            tail = "  "
        if index in (17, 11, 5, -1):
            tail += "M "
            if index >= 0:
                MGRID_PCTS.append(FST_PCT)
        else:
            tail += "  "
        if index in (18, 9):
            tail += "L"
            if index >= 0:
                LGRID_PCTS.append(FST_PCT)
        else:
            tail += " "

        print("%2d : %6.2f %s" % (index, FST_PCT, tail))

    for idx in range(12):
        print("%2d : %.2f" % (idx, math.pow(STEP, idx)))


def Three():
    '''
STEP,0.061,0,3,0.04,0,2,0.02,0,1
    '''
    FST_PCT = 110.41
    STEP = 1.02
    index = -5

    while True:
        FST_PCT = FST_PCT / STEP
        index += 1
        if FST_PCT <= 40:
            break
        tail = ""
        if (index >=0 and index % 3 == 0) or index == -3:
            tail = "S "
            if index >= 0:
                SGRID_PCTS.append(FST_PCT)
        else:
            tail = "  "
        #if index in (-2, 7, 16, 25, 34, 43):
        if index in (-4, 4, 12, 20, 28, 36, 44):
            tail += "M "
            if index >= 0:
                MGRID_PCTS.append(FST_PCT)
        else:
            tail += "  "
        if index in (-1, 13, 27, 41):
            tail += "L "
            if index >= 0:
                LGRID_PCTS.append(FST_PCT)
        else:
            tail += "  "

        print("%2d : %6.2f %s" % (index, FST_PCT, tail))

    for idx in range(17):
        print("%2d : %.3f" % (idx, math.pow(STEP, idx)))


def OutputStep():
    ADD_PCT = 0.01
    for idx, pct in enumerate(SGRID_PCTS):
        ADD_PCT = 0.01 + 0.05 * int((idx + 1) / 2)
        print("SGRID,小网%s,%.2f%%,%.2f,3" % (idx, pct, ADD_PCT))

    ADD_PCT = 2.01
    for idx, pct in enumerate(MGRID_PCTS, start=1):
        ADD_PCT = 2.01 + 0.4 * int(idx / 2)
        print("MGRID,中网%s,%.2f%%,%.2f,1.5" % (idx, pct, ADD_PCT))

    ADD_PCT = 3.01
    for idx, pct in enumerate(LGRID_PCTS, start=1):
        ADD_PCT = 3.01 + 1 * (idx - 1)
        print("LGRID,大网%s,%.2f%%,%.2f,1" % (idx, pct, ADD_PCT))


#One()
#Two()
#Three()
#OutputStep()

# 计算生成网格买入记录

GRID_PARAM01 = '''
SGRID,小网0,100.00%,0.01,3
SGRID,小网1,94.23%,0.06,3
SGRID,小网2,88.80%,0.06,3
SGRID,小网3,83.68%,0.11,3
SGRID,小网4,78.85%,0.11,3
SGRID,小网5,74.30%,0.16,3
SGRID,小网6,70.02%,0.16,3
SGRID,小网7,65.98%,0.21,3
SGRID,小网8,62.17%,0.21,3
SGRID,小网9,58.59%,0.26,3
SGRID,小网10,55.21%,0.26,3
SGRID,小网11,52.02%,0.31,3
SGRID,小网12,49.02%,0.31,3
SGRID,小网13,46.20%,0.36,3
SGRID,小网14,43.53%,0.36,3
SGRID,小网15,41.02%,0.41,3
MGRID,中网1,87.06%,2.01,1.5
MGRID,中网2,72.85%,2.41,1.5
MGRID,中网3,60.95%,2.41,1.5
MGRID,中网4,50.90%,2.81,1.5
MGRID,中网5,42.68%,2.81,1.5
LGRID,大网1,77.30%,3.01,1
LGRID,大网2,58.52%,4.01,1
LGRID,大网3,44.35%,5.01,1
'''

GRID_PARAM02 = '''
SGRID,小网0,100.00%,0.01,3
SGRID,小网1,95.18%,0.06,3
SGRID,小网2,90.59%,0.06,3
SGRID,小网3,86.23%,0.11,3
SGRID,小网4,82.07%,0.11,3
SGRID,小网5,78.12%,0.16,3
SGRID,小网6,74.36%,0.16,3
SGRID,小网7,70.77%,0.21,3
SGRID,小网8,67.36%,0.21,3
SGRID,小网9,64.12%,0.26,3
SGRID,小网10,61.03%,0.26,3
MGRID,中网1,88.38%,2.01,1.5
MGRID,中网2,76.01%,2.41,1.5
MGRID,中网3,65.52%,2.41,1.5
LGRID,大网1,80.47%,3.01,1
LGRID,大网2,64.12%,4.01,1
'''


def GenBuyRecord(today_str, grid_param, fst_price, current_price, stop_pct):
    grid_lines = grid_param.strip().split("\n")
    # 记录各个网格的交易记录
    buy_total_count = 0
    origin_buy_cost = 0
    sgrid_total_count = 0
    sgrid_cost_add = 0.0
    buy_records = {}
    for line in grid_lines:
        strs = line.split(",")
        pct = float(strs[2].replace("%", ''))
        if pct < stop_pct:
            continue
        buy_price = int(fst_price * pct * 10.0) / 1000.0
        buy_cost = int(10000 * (1 + float(strs[3])))
        buy_count = int(buy_cost / buy_price / MIN_LOT_SIZE) * MIN_LOT_SIZE
        origin_buy_cost += buy_price * buy_count
        buy_records[strs[1]] = (buy_price, buy_count)
        if strs[0] != "SGRID":
            sgrid_cost_add += (current_price - buy_price) * buy_count
        else:
            sgrid_total_count += buy_count
    sgrid_buy_price = int((current_price + sgrid_cost_add / sgrid_total_count) * 1000 + 1) / 1000.0
    for grid_name, (buy_price, buy_count) in buy_records.items():
        buy_total_count += buy_count
        if grid_name.startswith("小网"):
            print("BUY,%s,%s,%.3f,%d,%.3f" % (today_str, grid_name, sgrid_buy_price, buy_count, buy_price))
        else:
            print("BUY,%s,%s,%.3f,%d" % (today_str, grid_name, buy_price, buy_count))
    print("TOTAL,%.3f,%d,%d,%d" % (current_price, buy_total_count, int(current_price * buy_total_count), origin_buy_cost))

#GenBuyRecord("2025-09-29", GRID_PARAM02, 1.371, 1.165, 80)
# 双创50
# GenBuyRecord("2025-09-29", GRID_PARAM01, 0.923, 0.820, 87)
