# coding=utf-8

FST_PRICE = 3.348
FST_COST = 10000

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
MGRID,中网4,51.00%,2.81,1.5
MGRID,中网5,42.68%,2.81,1.5
LGRID,大网1,75.79%,3.01,1
LGRID,大网2,56.31%,4.01,1
LGRID,大网3,41.84%,5.01,1
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
MGRID,中网2,76.21%,2.41,1.5
MGRID,中网3,65.72%,2.41,1.5
LGRID,大网1,80.07%,3.01,1
LGRID,大网2,64.12%,4.01,1
'''

GRID_PARAM = GRID_PARAM01

lines = GRID_PARAM.split("\n")

STEP = 10
COST_DICT = {}
FST_PCT = 0

for line in lines:
    strs = line.split(",")
    if len(strs) <= 3:
        continue
    pct = float(strs[2].replace("%", ''))
    add = float(strs[3])
    key = int(pct / STEP)
    COST_DICT[key] = COST_DICT.get(key, 0) + int(add * FST_COST + FST_COST)
    FST_PCT = pct * (1 + add)


keys = list(COST_DICT.keys())
keys.sort(reverse=1)

for key in keys:
    print("%s%% : %s \t%s" % (key * STEP, COST_DICT.get(key, 0), int(COST_DICT.get(key, 0) / FST_COST) * "-"))

