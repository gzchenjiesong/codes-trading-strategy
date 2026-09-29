#!/usr/bin/env python3
"""
迁移 .gtv 文件：删 STEP 行，引入第0格，小网改名 +1
规则：
  1. 删 STEP 行
  2. SGRID 段最前插入「小网0」（第0格，价格位 = 1 + SGRID_STEP_PCT），原小网N 改名 小网N+1
  3. MGRID 段最前插入「中网0」（价格位 = 1 + MGRID_STEP_PCT），中网N 不变
  4. LGRID 段最前插入「大网0」（价格位 = 1 + LGRID_STEP_PCT），大网N 不变
  5. BUY/SELL 行第3字段：仅「小网N」→「小网N+1」，中网/大网/利息等不动
  6. 其他行（ADJ/SHARE/APY/CTRL/BASE/INTEREST/mode_three）不变
"""
import sys, re
from decimal import Decimal

def migrate(content: str):
    lines = content.split("\n")
    while lines and lines[-1].strip() == "":
        lines.pop()

    step_line = None
    for line in lines:
        if line.startswith("STEP,"):
            step_line = line
            break
    if step_line is None:
        raise ValueError("无 STEP 行")

    parts = step_line.split(",")
    # STEP,SGRID_STEP,SGRID_ADD,SGRID_RETAIN,MGRID_STEP,MGRID_ADD,MGRID_RETAIN,LGRID_STEP,LGRID_ADD,LGRID_RETAIN
    sgrid0 = f"{(Decimal('1') + Decimal(parts[1])) * 100:.2f}%"
    mgrid0 = f"{(Decimal('1') + Decimal(parts[4])) * 100:.2f}%"
    lgrid0 = f"{(Decimal('1') + Decimal(parts[7])) * 100:.2f}%"

    new_lines = []
    sgrid0_ins = False
    mgrid0_ins = False
    lgrid0_ins = False

    for line in lines:
        if line.startswith("STEP,"):
            continue
        elif line.startswith("SGRID,"):
            if not sgrid0_ins:
                new_lines.append(f"SGRID,小网0,{sgrid0},0,0")
                sgrid0_ins = True
            p = line.split(",")
            m = re.match(r"^小网(\d+)$", p[1])
            if m:
                p[1] = f"小网{int(m.group(1)) + 1}"
            new_lines.append(",".join(p))
        elif line.startswith("MGRID,"):
            if not mgrid0_ins:
                new_lines.append(f"MGRID,中网0,{mgrid0},0,0")
                mgrid0_ins = True
            new_lines.append(line)
        elif line.startswith("LGRID,"):
            if not lgrid0_ins:
                new_lines.append(f"LGRID,大网0,{lgrid0},0,0")
                lgrid0_ins = True
            new_lines.append(line)
        elif line.startswith("BUY,") or line.startswith("SELL,"):
            p = line.split(",")
            m = re.match(r"^小网(\d+)$", p[2])
            if m:
                p[2] = f"小网{int(m.group(1)) + 1}"
            new_lines.append(",".join(p))
        else:
            new_lines.append(line)

    return "\n".join(new_lines) + "\n"

def validate(content: str):
    """迁移后自检：BUY/SELL 的网格名都能在网格定义里找到"""
    lines = content.split("\n")
    grid_names = set()
    for line in lines:
        if line.startswith(("SGRID,", "MGRID,", "LGRID,")):
            grid_names.add(line.split(",")[1])
    missing = []
    for line in lines:
        if line.startswith(("BUY,", "SELL,")):
            name = line.split(",")[2]
            # 只验证 小网/中网/大网 开头的网格名；利息N（红利计息）等跳过
            if re.match(r"^(小网|中网|大网)\d+$", name) and name not in grid_names:
                missing.append(name)
    return missing

if __name__ == "__main__":
    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        old = f.read()
    new = migrate(old)
    missing = validate(new)
    if missing:
        print(f"[FAIL] {path}: 未匹配网格名 {missing}")
        sys.exit(1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new)
    print(f"[OK] {path}")
