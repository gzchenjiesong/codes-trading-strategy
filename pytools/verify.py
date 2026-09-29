#!/usr/bin/env python3
"""验证迁移前后语义一致性：
1. BUY/SELL 行：日期/价格/份数 不变，仅小网网格名 +1
2. 网格定义：价格位/追加值/保留数 不变（除小网改名 + 新增第0格）
3. 第0格价格位 = 1 + 步进值
"""
import sys, re
from decimal import Decimal

def verify(old_path, new_path):
    old_lines = open(old_path, encoding="utf-8").read().split("\n")
    new_lines = open(new_path, encoding="utf-8").read().split("\n")

    # 1. BUY/SELL 数字不变 + 改名正确
    old_bs = [l for l in old_lines if l.startswith(("BUY,", "SELL,"))]
    new_bs = [l for l in new_lines if l.startswith(("BUY,", "SELL,"))]
    assert len(old_bs) == len(new_bs), f"BUY/SELL 数量不一致"
    for o, n in zip(old_bs, new_bs):
        op, np = o.split(","), n.split(",")
        assert op[0] == np[0] and op[1] == np[1] and op[3] == np[3] and op[4] == np[4], f"数字字段变化: {o} vs {n}"
        om = re.match(r"^小网(\d+)$", op[2])
        nm = re.match(r"^小网(\d+)$", np[2])
        if om:
            assert nm and int(nm.group(1)) == int(om.group(1)) + 1, f"小网改名错误: {o} vs {n}"
        else:
            assert op[2] == np[2], f"非小网名变化: {o} vs {n}"

    # 2. 网格定义：价格位/追加值/保留数 不变（除改名 + 新增第0格）
    def grid_map(lines, prefix):
        d = {}
        for l in lines:
            if l.startswith(prefix):
                p = l.split(",")
                d[p[1]] = (p[2], p[3], p[4])
        return d
    old_s = grid_map(old_lines, "SGRID,")
    new_s = grid_map(new_lines, "SGRID,")
    new_m = grid_map(new_lines, "MGRID,")
    new_l = grid_map(new_lines, "LGRID,")
    # 旧小网N 的价格位 == 新小网N+1 的价格位
    for name, val in old_s.items():
        m = re.match(r"^小网(\d+)$", name)
        if m:
            assert new_s[f"小网{int(m.group(1))+1}"] == val, f"SGRID 价格位变化: {name}"
    # 新增第0格存在
    assert "小网0" in new_s and "中网0" in new_m and "大网0" in new_l, "缺少第0格"

    # 3. 第0格价格位 = 1 + 步进值
    step = [l for l in old_lines if l.startswith("STEP,")][0].split(",")
    sgrid0 = new_s["小网0"][0]
    mgrid0 = new_m["中网0"][0]
    lgrid0 = new_l["大网0"][0]
    exp_s = f"{(Decimal('1') + Decimal(step[1])) * 100:.2f}%"
    exp_m = f"{(Decimal('1') + Decimal(step[4])) * 100:.2f}%"
    exp_l = f"{(Decimal('1') + Decimal(step[7])) * 100:.2f}%"
    assert sgrid0 == exp_s, f"小网0价格位错误: {sgrid0} != {exp_s}"
    assert mgrid0 == exp_m, f"中网0价格位错误: {mgrid0} != {exp_m}"
    assert lgrid0 == exp_l, f"大网0价格位错误: {lgrid0} != {exp_l}"

    print(f"[OK] {old_path}: BUY/SELL {len(old_bs)} 条数字一致，改名正确，第0格={sgrid0}/{mgrid0}/{lgrid0}")

if __name__ == "__main__":
    verify(sys.argv[1], sys.argv[2])
