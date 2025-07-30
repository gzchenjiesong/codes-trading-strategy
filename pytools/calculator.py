# coding=utf-8

import math

RATE = 0.045

BASE_COUNT = 500000
ADD_COUNT = 100000

YEARS = 20
TOTAL = BASE_COUNT

for year in range(0, YEARS):
    income = TOTAL * RATE
    TOTAL = TOTAL * (1 + RATE) + ADD_COUNT
    print(year + 1, math.floor(TOTAL/10000), math.floor(income / 10000))


