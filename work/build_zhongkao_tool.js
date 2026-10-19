/* 中考志愿填报工具生成器（数据驱动，零依赖）
   用法：node build_zhongkao_tool.js
   读取 work/pilot_*.json（{province,cities:[...]}），为每个城市生成 frontend/<省>-<拼音>-zhongkao.html
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FRONT = path.join(ROOT, "frontend");
const ENGINE = fs.readFileSync(path.join(__dirname, "zhongkao_engine.js"), "utf8");

// 省 → 英文名
const PROV_EN = { 浙江: "zhejiang", 江苏: "jiangsu", 广东: "guangdong", 上海: "shanghai", 北京: "beijing" };
// 市 → 拼音（覆盖 24 城，含广东其余 19 市，便于后续铺开）
const PY = {
  杭州: "hangzhou", 宁波: "ningbo", 温州: "wenzhou", 嘉兴: "jiaxing", 湖州: "huzhou",
  绍兴: "shaoxing", 金华: "jinhua", 衢州: "quzhou", 舟山: "zhoushan", 台州: "taizhou", 丽水: "lishui",
  南京: "nanjing", 无锡: "wuxi", 徐州: "xuzhou", 常州: "changzhou", 苏州: "suzhou",
  南通: "nantong", 连云港: "lianyungang", 淮安: "huaian", 盐城: "yancheng", 扬州: "yangzhou",
  镇江: "zhenjiang", 泰州: "taizhou", 宿迁: "suqian",
  珠海: "zhuhai", 汕头: "shantou", 佛山: "foshan", 韶关: "shaoguan", 湛江: "zhanjiang",
  肇庆: "zhaoqing", 江门: "jiangmen", 茂名: "maoming", 惠州: "huizhou", 梅州: "meizhou",
  汕尾: "shanwei", 河源: "heyuan", 阳江: "yangjiang", 清远: "qingyuan", 东莞: "dongguan",
  中山: "zhongshan", 潮州: "chaozhou", 揭阳: "jieyang", 云浮: "yunfu"
};

const NAV = [
  ["rules", "报考规则"], ["locate", "分数定位"], ["student", "考生信息"],
  ["reco", "智能推荐"], ["schools", "探校"], ["wish", "志愿表"],
  ["check", "方案体检"], ["export", "导出"], ["sources", "信源"]
];

const CSS = `<style>
:root{--reach:#dc2626;--safe:#2563eb;--hold:#15803d;--brand:#3b5bdb;--ink:#1f2733;--mut:#5b6472;--bg:#f5f7fb;--card:#fff;--bd:#e3e8f0}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg);font-size:15px;line-height:1.6}
.top{background:linear-gradient(135deg,var(--brand),#2747c7);color:#fff;padding:22px 18px}
.top h1{margin:0 0 4px;font-size:22px}
.top .sub{opacity:.92;font-size:13px}
.top .topstu{margin-top:8px;font-size:13px;background:rgba(255,255,255,.15);display:inline-block;padding:3px 10px;border-radius:20px}
.nav{position:sticky;top:0;z-index:20;display:flex;gap:4px;overflow-x:auto;background:#fff;border-bottom:1px solid var(--bd);padding:8px 10px}
.nav a{flex:0 0 auto;text-decoration:none;color:var(--mut);font-size:13px;font-weight:600;padding:7px 12px;border-radius:8px}
.nav a.on{background:var(--brand);color:#fff}
.wrap{max-width:900px;margin:0 auto;padding:16px}
.sec{display:none}.sec.show{display:block}
.sec h3{font-size:16px;margin:18px 0 8px;border-left:4px solid var(--brand);padding-left:8px}
.note-in{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:10px 12px;border-radius:10px;font-size:13px}
.lm{font-size:13px;color:var(--mut);margin:8px 0}
.desc{color:var(--mut);font-size:14px;margin:6px 0 12px}
.tbl-wrap{overflow-x:auto}.tbl{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--bd);border-radius:10px;overflow:hidden;font-size:13px}
.tbl th,.tbl td{border-bottom:1px solid var(--bd);padding:8px 10px;text-align:left;vertical-align:top}
.tbl th{background:#eef2fb;font-weight:700}
.lines{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.ln{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:8px 12px;min-width:120px}
.ln b{display:block;font-size:12px;color:var(--mut);font-weight:600}.ln i{font-style:normal;font-size:18px;font-weight:700;color:var(--brand)}
.pts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.pt{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 12px}.pt b{color:var(--brand);font-size:13px}.pt p{margin:4px 0 0;font-size:13px}
.inrow{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
input,select{font:inherit;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;background:#fff}
.btn{background:var(--brand);color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer}
.btn.ghost{background:#fff;color:var(--brand);border:1px solid var(--brand)}
.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:end}
.form label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--mut)}
#stuMsg .ok,#locOut .loc-ok{color:var(--hold)}.ok{color:var(--hold);font-weight:600}
.warn{color:#b45309;font-size:13px}.empty{color:var(--mut);font-size:13px;padding:8px 0}
.loc-ok,.loc-next{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14px}
.tier{margin:14px 0}.tier-h{font-weight:700;padding:8px 12px;border-radius:8px 8px 0 0;color:#fff}
.t-reach{background:var(--reach)}.t-safe{background:var(--safe)}.t-hold{background:var(--hold)}
.tier-h span{opacity:.8;font-weight:400;font-size:13px}
.rlist,.sk-list{background:var(--card);border:1px solid var(--bd);border-radius:0 0 10px 10px;overflow:hidden}
.rk,.sk{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bd)}
.rk:last-child,.sk:last-child{border-bottom:0}
.rkn{font-weight:600;flex:1 1 180px}.rkn .rkg{font-size:11px;color:var(--mut);margin-left:6px;font-weight:400}
.rkm{font-size:12px;color:var(--mut);flex:1 1 160px}
.rkl{font-size:13px;flex:0 0 auto}.rkl b{color:var(--brand)}.gap{margin-left:6px;font-weight:700}.gap.up{color:var(--reach)}.gap.down{color:var(--hold)}
.mini{background:#eef2fb;color:var(--brand);border:0;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;font-weight:600}
.mini.del{color:#b91c1c;background:#fef2f2}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.sk-n{font-weight:600;flex:1 1 180px}.sk-n span{font-size:11px;color:var(--mut);margin-left:6px;font-weight:400}
.sk-m{font-size:12px;color:var(--mut);flex:1 1 160px}.sk-s{font-size:12px;color:var(--ink);flex:1 1 100%;background:#f8fafc;padding:6px 8px;border-radius:6px}
.wlist{list-style:none;padding:0;margin:0;counter-reset:w}
.wlist li{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:8px 12px;margin:6px 0;display:flex;align-items:center;gap:8px}
.wlist li i{color:var(--mut);font-style:normal;font-size:12px}.wx{margin-left:auto;display:flex;gap:4px}
.wt{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;color:#fff}
.wt-reach{background:var(--reach)}.wt-safe{background:var(--safe)}.wt-hold{background:var(--hold)}
.chkc{display:flex;gap:10px;margin:10px 0}.chk-ct{flex:1;text-align:center;background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px;font-size:13px;color:var(--mut)}
.chk-ct b{display:block;font-size:24px}.chk-ct.t-reach b{color:var(--reach)}.chk-ct.t-safe b{color:var(--safe)}.chk-ct.t-hold b{color:var(--hold)}
.warns .warn{background:#fffbeb;border:1px solid #fde68a;padding:8px 10px;border-radius:8px;margin:6px 0}
.expout{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;font-size:12px;white-space:pre-wrap;max-height:360px;overflow:auto}
.src{list-style:none;padding:0;margin:0}.src li{padding:6px 0;border-bottom:1px solid var(--bd)}.src a{color:var(--brand);word-break:break-all}
@media(max-width:576px){.top h1{font-size:19px}.rk,.sk{gap:6px}.rkn,.rkm{flex:1 1 100%}}
</style>`;

function buildCity(city) {
  const provEn = PROV_EN[city.meta.province] || "cn";
  const py = PY[city.meta.city] || city.meta.city;
  const fname = `${provEn}-${py}-zhongkao.html`;
  const navHtml = NAV.map(n => `<a href="javascript:void(0)" data-t="${n[0]}">${n[1]}</a>`).join("");
  const secHtml = NAV.map(n => `<section class="sec" id="sec-${n[0]}"><div id="${n[0]}"></div></section>`).join("");
  const html =
`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${city.meta.city}中考志愿智能推荐</title>
${CSS}
</head>
<body>
<header class="top">
  <h1>${city.meta.city}中考志愿智能推荐</h1>
  <div class="sub">${city.province} · ${city.meta.year} 年 · 满分 ${city.meta.total} 分 · 数据驱动</div>
  <div class="topstu" id="topStu"></div>
</header>
<nav class="nav">${navHtml}</nav>
<main class="wrap">${secHtml}</main>
<script>window.DATA = ${JSON.stringify(city)};</script>
<script>${ENGINE}</script>
</body>
</html>`;
  fs.writeFileSync(path.join(FRONT, fname), html, "utf8");
  return fname;
}

// 读取三个 pilot 文件
const srcs = ["pilot_zj.json", "pilot_js.json", "pilot_gd.json"].map(f => path.join(__dirname, f));
let total = 0;
srcs.forEach(sp => {
  if (!fs.existsSync(sp)) { console.log("跳过（不存在）:", sp); return; }
  const d = JSON.parse(fs.readFileSync(sp, "utf8"));
  (d.cities || []).forEach(city => {
    const f = buildCity(city);
    console.log("生成:", f, " 学校数:", (city.scores || []).length);
    total++;
  });
});
console.log("共生成", total, "个志愿填报工具页");
