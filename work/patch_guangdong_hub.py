# -*- coding: utf-8 -*-
"""
补丁：把 guangdong.html 的城市入口全面指向中考志愿填报工具页，并保持「路径」次级入口可达。
- 城市网格（.cities 内的 .c-XXX 锚点）：主链接→工具页，新增次级「路径」链接→原升学路径页。
- 条形图（.bar 锚点）：链接→工具页。
- 顶部横幅：从「深圳已上线 / 其余 20 市建设中」改为「21 市全部上线」。
工具命名规则：gz/sz 独立工具（gz-zhongkao.html / sz-zhongkao.html）；其余 guangdong-<拼音>-zhongkao.html。
"""
import re, io

PATH = r"C:/Users/zhangzekun03/gaokao_data_repo/frontend/guangdong.html"

def tool_of(orig):
    """根据原升学路径页链接推导工具页链接。"""
    if orig == "gz-shengxue-lujing.html":
        return "gz-zhongkao.html"
    if orig == "sz-shengxue-lujing.html":
        return "sz-zhongkao.html"
    m = re.match(r"^([a-z]+)-shengxue-lujing\.html$", orig)
    if m:
        return "guangdong-" + m.group(1) + "-zhongkao.html"
    return orig  # 已经是工具页，原样返回

# 城市卡片「路径」次级链接：按 class token 直接定位升学路径页（东莞/珠海/佛山原网格即指向工具页，需还原到路径页）
CITY_PATH = {
    'gz': 'gz-shengxue-lujing.html', 'sz': 'sz-shengxue-lujing.html',
    'dg': 'dg-shengxue-lujing.html', 'zh': 'zhuhai-shengxue-lujing.html',
    'fs': 'foshan-shengxue-lujing.html', 'hz': 'huizhou-shengxue-lujing.html',
    'zs': 'zhongshan-shengxue-lujing.html', 'jm': 'jiangmen-shengxue-lujing.html',
    'st': 'shantou-shengxue-lujing.html', 'zj': 'zhanjiang-shengxue-lujing.html',
    'zq': 'zhaoqing-shengxue-lujing.html', 'mm': 'maoming-shengxue-lujing.html',
    'mz': 'meizhou-shengxue-lujing.html', 'sw': 'shanwei-shengxue-lujing.html',
    'hy': 'heyuan-shengxue-lujing.html', 'yj': 'yangjiang-shengxue-lujing.html',
    'qy': 'qingyuan-shengxue-lujing.html', 'sg': 'shaoguan-shengxue-lujing.html',
    'cz': 'chaozhou-shengxue-lujing.html', 'jy': 'jieyang-shengxue-lujing.html',
    'yf': 'yunfu-shengxue-lujing.html',
}

with io.open(PATH, "r", encoding="utf-8") as f:
    html = f.read()

# ---------- 1) 城市网格：主链接→工具，新增次级「路径」 ----------
cities_pat = re.compile(r'(<div class="cities">)(.*?)(</div>)', re.S)
def repl_cities(m):
    head, body, tail = m.group(1), m.group(2), m.group(3)
    anchor_pat = re.compile(r'<a class="(c-[a-z]+)" href="([^"]+)">(.+?)</a>', re.S)
    def repl_anchor(a):
        cls, orig, inner = a.group(1), a.group(2), a.group(3)
        tool = tool_of(orig)
        token = cls[2:-2]  # c-gzlu -> gz ; c-hylm -> hy ; c-yflu -> yf
        path = CITY_PATH.get(token, orig)
        return ('<span class="ccw"><a class="%s" href="%s">%s</a>'
                '<a class="ccp" href="%s">路径</a></span>') % (cls, tool, inner, path)
    new_body = anchor_pat.sub(repl_anchor, body)
    return head + new_body + tail

html, n_cities = cities_pat.subn(repl_cities, html)
if n_cities != 1:
    raise SystemExit("ERROR: 城市网格块匹配数=%d（应为 1）" % n_cities)

# ---------- 2) 条形图：.bar 锚点链接→工具 ----------
bar_pat = re.compile(r'(<a class="bar" href=")([^"]+)(")')
def repl_bar(m):
    pre, orig, post = m.group(1), m.group(2), m.group(3)
    return pre + tool_of(orig) + post
html, n_bars = bar_pat.subn(repl_bar, html)

# ---------- 3) 顶部横幅：21 市全部上线 ----------
banner_pat = re.compile(
    r'<p style="margin:14px 0 0"><a href="sz-zhongkao\.html"[^>]*>深圳已上线[^<]*</a>\s*'
    r'<span[^>]*>其余 20 市志愿填报工具建设中</span></p>')
new_banner = ('<p style="margin:14px 0 0">'
    '<span style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);'
    'color:#fff;font-weight:700;padding:10px 16px;border-radius:10px;font-size:14px;'
    'box-shadow:0 6px 18px rgba(220,38,38,.22)">'
    '🎯 广东 21 市中考志愿智能推荐工具已全部上线：点击上方城市卡片，进入对应城市的志愿填报（冲 / 稳 / 保 + 志愿表）</span></p>')
html, n_banner = banner_pat.subn(new_banner, html)
if n_banner != 1:
    raise SystemExit("ERROR: 横幅匹配数=%d（应为 1）" % n_banner)

# ---------- 4) 注入 .ccw / .ccp 样式 ----------
css_add = (
    "\n  /* 城市卡片：主链接=工具页，次级=升学路径页 */\n"
    "  .ccw{display:flex;flex-direction:column;border:1px solid rgba(0,0,0,.05);"
    "border-radius:12px;overflow:hidden;background:#fff}\n"
    "  .ccw>a:first-child{border:none!important;border-radius:0!important}\n"
    "  .cities a.ccp{font-size:11px;font-weight:700;text-align:center;color:#5660a8;"
    "background:#eef1fb;padding:4px 0;border:none;border-radius:0;letter-spacing:1px}\n"
    "  .cities a.ccp:hover{background:#e2e7f7;color:#3b5bdb}\n"
    "  .ccw:hover{filter:brightness(.985);transform:translateY(-1px);transition:filter .15s,transform .15s}\n"
)
html = html.replace("</style>", css_add + "</style>", 1)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print("OK guangdong.html 已补丁化")
print("  城市网格块: %d" % n_cities)
print("  条形图链接替换: %d" % n_bars)
print("  横幅替换: %d" % n_banner)
