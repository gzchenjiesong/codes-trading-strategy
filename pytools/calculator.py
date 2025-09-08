# coding=utf-8

import math

RATE = 0.045

BASE_COUNT = 500000
ADD_COUNT = 100000

YEARS = 0
TOTAL = BASE_COUNT

for year in range(0, YEARS):
    income = TOTAL * RATE
    TOTAL = TOTAL * (1 + RATE) + ADD_COUNT
    print(year + 1, math.floor(TOTAL/10000), math.floor(income / 10000))

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
        if index in (-2, 7, 16, 25, 34, 43):
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

#One()
#Two()
Three()

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
