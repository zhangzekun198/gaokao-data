# -*- coding: utf-8 -*-
"""构建 pilot_gd_ext_a.json：从已核验的 pilot_gd_ext.json 提取 8 市，
用江门日报 2026-05-27 真实对比表补全江门 2024 线，补登来源，校验 schema，写出合法 JSON。"""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
src = json.load(open(os.path.join(WORK, "pilot_gd_ext.json"), encoding="utf-8"))
eight = ["汕头", "韶关", "湛江", "肇庆", "江门", "茂名", "惠州", "梅州"]

by_city = {c["meta"]["city"]: c for c in src["cities"]}

# ---- 江门 2024 真实数据（来源：江门日报 2026-05-27 T02 版 2024/2025 对比表，真实可访问）----
jm_2024 = {
    "江门市第一中学": 700,
    "江门市培英高级中学": 661,
    "江门市棠下中学": 621,
    "新会第一中学": 683,
    "新会华侨中学": 649,
    "台山市第一中学": 639,
    "台山市华侨中学": 585,
    "开平市第一中学": 588,
    "开平市开侨中学": 600,
    "鹤山市第一中学": 684,
    "鹤山市鹤华中学": 653,
    "恩平市第一中学": 590,
}
jm = by_city["江门"]
filled = 0
for s in jm["scores"]:
    if s["name"] in jm_2024:
        s["hu2024"] = jm_2024[s["name"]]
        filled += 1
# 补登 2024 数据来源（真实 URL，江门日报数字版）
jm["sources"].append({
    "title": "江门日报2026-05-27 T02《2024年和2025年江门部分普通高中录取分数线》对比表（含2024真实值）",
    "url": "http://dzb.jmrb.com:8090/jmrb/page/21/2026-05-27/T02/43381779807593598.pdf",
})
jm["meta"]["note"] = (
    jm["meta"]["note"].rstrip("。")
    + "；江门日报2026-05-27对比表提供12所国家级示范性高中2024年真实线，已补入 hu2024。"
)

# ---- schema 校验 ----
REQ_META = ["city", "province", "year", "total", "src", "note", "lineMode"]
REQ_POLICY = ["batches", "lines", "rule", "hukou", "minge", "principle", "total"]
REQ_SCORE = ["name", "grade", "district", "belong", "nature", "b",
             "hu2025", "wai2025", "hu2024", "hu2026pred", "plan2025", "note"]
REQ_SRC = ["title", "url"]

errors = []
cities_out = []
for city in eight:
    c = by_city[city]
    for k in REQ_META:
        if k not in c.get("meta", {}):
            errors.append(f"{city}.meta 缺 {k}")
    for k in REQ_POLICY:
        if k not in c.get("policy", {}):
            errors.append(f"{city}.policy 缺 {k}")
    for i, s in enumerate(c.get("scores", [])):
        for k in REQ_SCORE:
            if k not in s:
                errors.append(f"{city}.scores[{i}] 缺 {k}")
    for i, sc in enumerate(c.get("sources", [])):
        for k in REQ_SRC:
            if k not in sc:
                errors.append(f"{city}.sources[{i}] 缺 {k}")
    # 规范化：确保数值字段为整数/None，列表为 list
    for s in c["scores"]:
        for fld in ["hu2025", "wai2025"]:
            if s.get(fld) is None:
                s[fld] = []
        for fld in ["hu2024", "hu2026pred", "plan2025"]:
            v = s.get(fld)
            if v is not None:
                s[fld] = int(v)
    cities_out.append(c)

if errors:
    print("SCHEMA ERROR:")
    for e in errors:
        print("  ", e)
    raise SystemExit(1)

out = {"province": "广东", "year": 2025, "cities": cities_out}
path = os.path.join(WORK, "pilot_gd_ext_a.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

# 合法性校验：能被 json.loads 读回
with open(path, encoding="utf-8") as f:
    re = json.load(f)
print("OK 写出:", path)
print("province:", re["province"], "year:", re["year"], "cities:", len(re["cities"]))
print("江门 hu2024 已补:", filled, "所")
for c in re["cities"]:
    print("  -", c["meta"]["city"], "| total", c["meta"]["total"],
          "| scores", len(c["scores"]), "| sources", len(c["sources"]))
