#!/usr/bin/env node
/**
 * 数据驱动生成器：浙江 / 江苏 初升高升学路径页
 * 输入：work/zhejiang_chuzhong.json  work/jiangsu_chuzhong.json
 * 输出：frontend/zhejiang.html  frontend/jiangsu.html
 *       frontend/<prov>-<pinyin>-shengxue-lujing.html  (24 个市级页)
 * 约定：单文件、数据内联、零网络、可离线/飞书打开；遵循平台设计 token 与 guangdong.html / dg-shengxue-lujing.html 视觉。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');

// ---------- 工具 ----------
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// 把"待核"标成醒目色（数据诚实标记）
function markDai(s) {
  return esc(s).replace(/待核/g, '<span class="dai">待核</span>');
}
// 软色板：HSL 生成，保证可读性（深字 + 浅底）
function softColor(i) {
  const hue = (i * 47) % 360;
  return {
    bg: `hsl(${hue} 58% 86%)`,
    fg: `hsl(${hue} 48% 30%)`,
  };
}

// pinyin 文件名映射（省份前缀避免跨省冲突：苏州/深圳、台州/泰州）
const PINYIN = {
  '杭州': 'hangzhou', '宁波': 'ningbo', '嘉兴': 'jiaxing', '湖州': 'huzhou',
  '绍兴': 'shaoxing', '温州': 'wenzhou', '金华': 'jinhua', '衢州': 'quzhou',
  '舟山': 'zhoushan', '台州': 'taizhou', '丽水': 'lishui',
  '南京': 'nanjing', '苏州': 'suzhou', '无锡': 'wuxi', '常州': 'changzhou',
  '镇江': 'zhenjiang', '徐州': 'xuzhou', '淮安': 'huaian', '宿迁': 'suqian',
  '连云港': 'lianyungang', '南通': 'nantong', '扬州': 'yangzhou', '泰州': 'taizhou',
  '盐城': 'yancheng',
};
function cityFile(prov, city) {
  return `${prov}-${PINYIN[city]}-shengxue-lujing.html`;
}
// 志愿填报工具页（与政策页分设；工具存在时城市卡片优先指向它）
function toolFile(prov, city) {
  return `${prov}-${PINYIN[city]}-zhongkao.html`;
}
function hasTool(prov, city) {
  return fs.existsSync(path.join(FRONTEND, toolFile(prov, city)));
}

// 提取"普高录取率"真实百分比（仅当明确出现"普高录取率"短语+数字，否则 null 诚实标注）
function extractRate(d) {
  const hay = (d.keyData || '') + ' ' + (d.vocational || '');
  const m = hay.match(/普高录取率[^0-9]{0,6}(\d{1,2}(?:\.\d{1,2})?)%/);
  return m ? parseFloat(m[1]) : null;
}

// ---------- 市级升学路径页 ----------
function buildCityPage(prov, d, hubFile) {
  const provName = d.province;
  const cls = ['brand', 'wen', 'bao', 'special', 'teal', 'amber', 'chong'];
  // 志愿填报工具入口横幅（工具存在时显示，引导用户进入真正的志愿填报工具）
  const toolBanner = hasTool(prov, d.city)
    ? `<a class="toolbanner" href="${esc(toolFile(prov, d.city))}">🎯 本城市已上线中考志愿填报工具：输入分数，自动生成冲 / 稳 / 保推荐与志愿表 → 进入工具</a>`
    : '';
  // 各章节
  const sect = (idx, cat, title, sub, inner) => `
    <section id="s${idx}">
      <div class="stage cat-${cat}"><span class="num">${idx}</span>
        <div><h3>${esc(title)}</h3>${sub ? `<div class="tip">${esc(sub)}</div>` : ''}</div>
      </div>
      <div class="grid">${inner}</div>
    </section>`;

  const examCard = `
    <div class="card cat-${cls[0]}">
      <div class="ctitle">中考计分科目与满分</div>
      <div class="desc">${markDai(d.examSubjects || '待核')}</div>
      <div class="meta"><span class="pill t">满分 ${esc(d.total)} 分</span><span class="pill time">${esc(d.year)} 年</span></div>
    </div>`;

  const lineCard = `
    <div class="card cat-${cls[1]}">
      <div class="ctitle">划线方式与投档规则</div>
      <div class="desc">${markDai(d.lineMode || '待核')}</div>
    </div>`;

  const batchCards = (d.batches || []).map((b, i) => `
    <div class="card cat-${cls[(i + 2) % cls.length]}">
      <div class="ctitle">${esc(b.name)}</div>
      <div class="desc">${markDai(b.desc || '')}</div>
    </div>`).join('');

  const indicatorCard = `
    <div class="card cat-${cls[3]}">
      <div class="ctitle">名额分配（指标生）政策</div>
      <div class="desc">${markDai(d.indicator || '待核')}</div>
    </div>`;

  const selfCard = `
    <div class="card cat-${cls[4]}">
      <div class="ctitle">普通高中自主招生</div>
      <div class="desc">${markDai(d.selfRecruit || '待核')}</div>
    </div>`;

  const migrantCard = `
    <div class="card cat-${cls[5]}">
      <div class="ctitle">随迁子女报考门槛</div>
      <div class="desc">${markDai(d.migrantGate || '待核')}</div>
    </div>`;

  // 升学路径总览：按"、"拆成 chips
  const pathChips = (d.paths || '').split(/[、，,]/).map(p => p.trim()).filter(Boolean)
    .map(p => `<span class="pill t">${esc(p)}</span>`).join('');

  const pathCard = `
    <div class="card cat-${cls[6]}">
      <div class="ctitle">升学路径总览</div>
      <div class="desc">${markDai(d.paths || '待核')}</div>
      <div class="meta">${pathChips}</div>
    </div>`;

  const vocCard = `
    <div class="card cat-${cls[2]}">
      <div class="ctitle">中职与职教路径</div>
      <div class="desc">${markDai(d.vocational || '待核')}</div>
    </div>`;

  const keyCard = `
    <div class="card cat-${cls[0]}">
      <div class="ctitle">关键数据</div>
      <div class="desc">${markDai(d.keyData || '待核')}</div>
    </div>`;

  const sources = (d.sources || []).map(s => `
    <li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('');
  const sourceCard = `
    <div class="card cat-${cls[1]}">
      <div class="ctitle">官方信源</div>
      <ul class="srclist">${sources || '<li>待核</li>'}</ul>
    </div>`;

  const nav = `
  <nav class="tabs"><div class="wrap">
    <a href="#s1">① 中考概况</a><a href="#s2">② 录取批次与路径</a>
    <a href="#s3">③ 名额分配</a><a href="#s4">④ 自主招生</a>
    <a href="#s5">⑤ 随迁门槛</a><a href="#s6">⑥ 路径总览</a>
    <a href="#s7">⑦ 中职职教</a><a href="#s8">⑧ 关键数据</a>
    <a href="#s9">⑨ 官方信源</a>
  </div></nav>`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${provName}·${esc(d.city)} 初升高升学路径全景（${d.year}）</title>
<style>
:root{--brand:#3b5bdb;--chong:#dc2626;--wen:#2563eb;--bao:#15803d;--special:#7c3aed;--teal:#0d9488;--amber:#b45309;--ink:#1a1f2b;--ink-2:#33404f;--muted:#5b6472;--line:#e7eaf0;--bg:#f4f6fb;--card:#fff;
--radius:16px;--radius-sm:12px;--shadow-sm:0 1px 2px rgba(16,24,40,.05),0 3px 10px rgba(16,24,40,.05);--shadow-md:0 6px 20px rgba(16,24,40,.10);
--fs-h1:27px;--fs-h2:22px;--fs-h3:18px;--fs-card:16px;--fs-base:15px;--fs-sm:14px;--fs-xs:12.5px;--fs-2xs:11.5px}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;font-size:var(--fs-base);-webkit-font-smoothing:antialiased}
a{color:var(--brand);text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px}
header.hero{background-color:var(--brand);background-image:radial-gradient(1000px 360px at 88% -40%,rgba(255,255,255,.22),transparent 55%),linear-gradient(135deg,#3b5bdb 0%,#2563eb 100%);color:#fff;padding:38px 0 28px;position:relative;box-shadow:0 6px 24px rgba(16,24,40,.12)}
header.hero h1{font-size:var(--fs-h1);font-weight:800;letter-spacing:.5px;line-height:1.25}
header.hero p{margin-top:10px;font-size:var(--fs-sm);opacity:.95;max-width:820px;line-height:1.7}
.badge-row{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}
.badge{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.32);padding:5px 12px;border-radius:999px;font-size:var(--fs-2xs);font-weight:600}
.back{display:inline-block;margin:14px 0 0;color:#fff;background:rgba(255,255,255,.18);padding:7px 14px;border-radius:9px;font-size:var(--fs-sm);font-weight:600}
.back:hover{background:rgba(255,255,255,.3)}
nav.tabs{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);box-shadow:0 2px 10px rgba(16,24,40,.04)}
nav.tabs .wrap{display:flex;gap:6px;overflow-x:auto;padding:10px 16px;scrollbar-width:none}
nav.tabs .wrap::-webkit-scrollbar{display:none}
nav.tabs a{flex:0 0 auto;padding:8px 14px;border-radius:999px;font-size:var(--fs-sm);color:var(--muted);white-space:nowrap;font-weight:600}
nav.tabs a:hover{background:var(--bg);color:var(--ink)}
section{padding:28px 0 8px}
.stage{margin:18px 0 6px;display:flex;align-items:center;gap:12px;padding:11px 0 11px 16px;border-left:4px solid var(--brand);border-radius:0 12px 12px 0;background:linear-gradient(90deg,rgba(59,91,219,.07),transparent 55%)}
.stage .num{width:32px;height:32px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--fs-sm);flex:0 0 auto}
.stage h3{font-size:var(--fs-h3);font-weight:700}
.stage .tip{font-size:var(--fs-xs);color:var(--muted)}
.stage.cat-chong{border-left-color:var(--chong);background:linear-gradient(90deg,rgba(220,38,38,.07),transparent 55%)}.stage.cat-chong .num{background:var(--chong)}
.stage.cat-wen{border-left-color:var(--wen);background:linear-gradient(90deg,rgba(37,99,235,.07),transparent 55%)}.stage.cat-wen .num{background:var(--wen)}
.stage.cat-bao{border-left-color:var(--bao);background:linear-gradient(90deg,rgba(21,128,61,.08),transparent 55%)}.stage.cat-bao .num{background:var(--bao)}
.stage.cat-special{border-left-color:var(--special);background:linear-gradient(90deg,rgba(124,58,237,.07),transparent 55%)}.stage.cat-special .num{background:var(--special)}
.stage.cat-teal{border-left-color:var(--teal);background:linear-gradient(90deg,rgba(13,148,136,.07),transparent 55%)}.stage.cat-teal .num{background:var(--teal)}
.stage.cat-amber{border-left-color:var(--amber);background:linear-gradient(90deg,rgba(180,83,9,.07),transparent 55%)}.stage.cat-amber .num{background:var(--amber)}
.grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}
@media(min-width:600px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:992px){.grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}
.card{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--brand);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:8px;transition:box-shadow .16s}
.card:hover{box-shadow:var(--shadow-md)}
.card .ctitle{font-size:var(--fs-card);font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.4}
.card .desc{font-size:var(--fs-sm);color:var(--ink-2);line-height:1.65}
.pill{display:inline-block;font-size:var(--fs-2xs);padding:3px 10px;border-radius:999px;font-weight:600;line-height:1.4}
.pill.t{background:#eef2ff;color:#3249c7}
.pill.time{background:#ecfdf3;color:#15803d}
.pill.who{background:#fef2f2;color:#c2410c}
.pill.note{background:#fff7ed;color:#92400e}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.srclist{margin:2px 0 0 18px;font-size:var(--fs-sm);color:var(--ink-2);line-height:1.7}
.srclist a{word-break:break-all}
.dai{color:#b45309;background:#fff7ed;border-radius:5px;padding:0 4px;font-weight:600}
.callout{background:var(--card);border-left:4px solid var(--brand);border-radius:0 12px 12px 0;padding:15px 18px;margin:16px 0;color:var(--ink-2);font-size:var(--fs-sm);line-height:1.7;box-shadow:var(--shadow-sm)}
.toolbanner{display:block;margin:14px auto 0;max-width:1080px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;text-align:center;font-weight:700;font-size:15px;padding:13px 18px;border-radius:12px;box-shadow:0 6px 18px rgba(220,38,38,.25)}
.toolbanner:hover{filter:brightness(1.05)}
footer{margin:34px 0;padding:20px 0;border-top:1px solid var(--line);color:var(--muted);font-size:var(--fs-xs);line-height:1.7}
footer b{color:var(--ink)}
@media(max-width:576px){header.hero{padding:28px 0 22px}header.hero h1{font-size:22px}.stage h3{font-size:16px}.card{padding:14px}}
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <h1>${provName}·${esc(d.city)} 初升高升学路径全景</h1>
    <p>${provName}中考由市域自主命题录取（非全省统一）。本页基于 ${d.year} 年当地中招公开资料，梳理计分科目、录取批次、名额分配、自主招生、随迁门槛与中职职教路径。官方未单列的数据均标注“待核”，不作估算填充。</p>
    <div class="badge-row">
      <span class="badge">${esc(d.year)} 年</span>
      <span class="badge">中考满分 ${esc(d.total)} 分</span>
      <span class="badge">${provName} · 市域自主命题</span>
    </div>
    <a class="back" href="${esc(hubFile)}">← 返回${provName}枢纽</a>
  </div>
</header>
${toolBanner}
${nav}
<div class="wrap">
  ${sect(1, cls[0], '中考概况与计分', '考试科目、满分与划线投档规则', examCard + lineCard)}
  ${sect(2, cls[1], '录取批次与升学路径', '各批次名称与投档说明', batchCards)}
  ${sect(3, cls[3], '名额分配（指标生）', '优质普高名额分配到初中校的政策与比例', indicatorCard)}
  ${sect(4, cls[4], '普通高中自主招生', '特长生 / 特色班 / 中外合作 / 创新班等', selfCard)}
  ${sect(5, cls[5], '随迁子女报考门槛', '非本市户籍考生报考普通高中的条件', migrantCard)}
  ${sect(6, cls[6], '升学路径总览', '从普高统招到中职贯通的多条通道', pathCard)}
  ${sect(7, cls[2], '中职与职教路径', '中本贯通 / 中高职一体化 / 职教高考等', vocCard)}
  ${sect(8, cls[0], '关键数据', '考生规模、普高计划、录取率等可核验数字', keyCard)}
  ${sect(9, cls[1], '官方信源', '教育局 / 中招办公开发文（可点击核验）', sourceCard)}

  <div class="callout"><b>数据说明：</b>本页由联网检索 ${d.year} 年各市中招 / 教育局公开文件整理而成，分数与计划为公开口径；标“待核”者表示官方未在检索到的文件中单列，不构成录取承诺。最终以市中招办与学校官方公布为准。</div>

  <footer>
    <b>中高考考情分析平台</b> · ${provName}·${esc(d.city)} 初升高升学路径<br>
    返回：<a href="${esc(hubFile)}">${provName}枢纽对比页</a> · <a href="index.html">平台门户</a>
  </footer>
</div>
</body>
</html>`;
  return html;
}

// ---------- 省级枢纽对比页 ----------
function buildHub(prov, data) {
  const provName = data.province;
  const cities = data.cities;
  const n = cities.length;
  // 城市网格（工具存在时优先指向志愿填报工具，另附"路径"次级入口）
  const grid = cities.map((d, i) => {
    const c = softColor(i);
    const tool = hasTool(prov, d.city);
    const primary = tool ? toolFile(prov, d.city) : cityFile(prov, d.city);
    const sec = tool ? `<a class="ccp" href="${esc(cityFile(prov, d.city))}">路径</a>` : '';
    return `<a class="cc" style="background:${c.bg};color:${c.fg}" href="${esc(primary)}">${esc(d.city)}<small>满分 ${esc(d.total)}</small></a>${sec}`;
  }).join('');

  // 满分条形图（按满分降序）
  const byTotal = [...cities].sort((a, b) => b.total - a.total);
  const maxT = Math.max(...cities.map(c => c.total));
  const bars = byTotal.map((d, i) => {
    const c = softColor(cities.indexOf(d));
    const w = Math.max(8, Math.round(d.total / maxT * 100));
    return `<a class="bar" href="${esc(hasTool(prov, d.city) ? toolFile(prov, d.city) : cityFile(prov, d.city))}"><span class="bn">${esc(d.city)}</span><span class="bt"><span class="bf" style="background:${c.bg};width:${w}%"></span></span><span class="bv">${esc(d.total)}</span></a>`;
  }).join('');

  // 政策维度对比表
  const rows = cities.map(d => {
    const batchNames = (d.batches || []).map(b => b.name).join(' → ');
    const c = softColor(cities.indexOf(d));
    return `<tr>
      <td class="city"><a href="${esc(cityFile(prov, d.city))}" style="color:${c.fg};font-weight:700">${esc(d.city)}</a><br><span class="csub2">满分 ${esc(d.total)}</span></td>
      <td>${esc(d.total)}</td>
      <td><div class="clamp">${markDai(d.lineMode || '待核')}</div></td>
      <td><div class="clamp">${esc(batchNames || '待核')}</div></td>
      <td><div class="clamp">${markDai(d.migrantGate || '待核')}</div></td>
      <td><div class="clamp">${markDai(d.indicator || '待核')}</div></td>
      <td><div class="clamp">${markDai(d.selfRecruit || '待核')}</div></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${provName}初升高升学路径全景 · ${n} 市</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--ink:#3a3f4b;--sub:#7a8090;--line:#e9ebf0;--accent:#3b5bdb}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,"PingFang SC","Microsoft YaHei",Roboto,Arial,sans-serif;font-size:15px;line-height:1.6}
.hero{background:linear-gradient(135deg,#d6e4f7,#e9dcf4 50%,#d9ede9);color:#51586a;padding:32px 18px 28px;text-align:center}
.hero h1{margin:0 0 6px;font-size:24px;letter-spacing:1px}
.hero p{margin:0;opacity:.82;font-size:14px}
.wrap{max-width:1080px;margin:0 auto;padding:18px}
.back{display:inline-block;margin:6px 0 14px;color:var(--accent);text-decoration:none;font-size:14px;font-weight:600}
.back:hover{text-decoration:underline}
.pcard{background:#fff;border-radius:16px;padding:20px;box-shadow:0 6px 22px rgba(70,80,130,.08);border:1px solid var(--line)}
.pcard .tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:20px;color:#5660a8;background:#d9def7;margin-bottom:8px}
.pcard h2{margin:0 0 4px;font-size:20px}
.pcard p.desc{color:var(--sub);font-size:13px;margin:0 0 16px}
.cities{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}
.cities a.cc{text-align:center;text-decoration:none;padding:16px 8px;border-radius:12px;font-size:16px;font-weight:700;transition:filter .15s,transform .15s;border:1px solid rgba(0,0,0,.05)}
.cities a.cc:hover{filter:brightness(.97);transform:translateY(-1px)}
.cities a.cc small{display:block;font-size:11px;font-weight:500;opacity:.75;margin-top:3px}
.cities a.ccp{display:inline-block;margin:2px 4px 0 0;font-size:11px;font-weight:600;color:#5660a8;text-decoration:none;background:#eef1fb;padding:2px 8px;border-radius:10px}
.chart{background:#fff;border-radius:16px;padding:20px;box-shadow:0 6px 22px rgba(70,80,130,.08);border:1px solid var(--line);margin-top:16px}
.chart .tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:20px;color:#5660a8;background:#d9def7;margin-bottom:8px}
.chart h2{margin:0 0 4px;font-size:20px}
.chart p.csub{color:var(--sub);font-size:13px;margin:0 0 14px}
.tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
.tab{border:1px solid var(--line);background:#fff;color:var(--sub);font-size:13px;font-weight:600;padding:7px 15px;border-radius:20px;cursor:pointer;transition:.15s}
.tab:hover{border-color:var(--accent);color:var(--accent)}
.tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.panel{display:none}
.panel.active{display:block}
.bar{display:grid;grid-template-columns:62px 1fr 56px;align-items:center;gap:10px;text-decoration:none;color:var(--ink);padding:5px 0}
.bar:hover .bn{color:var(--accent)}
.bar:hover .bf{filter:brightness(.95)}
.bn{font-size:14px;font-weight:600;text-align:right}
.bt{background:#eef0f5;border-radius:9px;height:22px;overflow:hidden}
.bf{display:block;height:100%;border-radius:9px;min-width:6px}
.bv{font-size:13px;font-weight:700;text-align:left;color:#5a6072}
.cnote{background:#fdf3e7;border:1px solid #f6dcc0;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#a9763f;margin-top:14px}
.dai{color:#b45309;background:#fff7ed;border-radius:5px;padding:0 4px;font-weight:600}
.ctable{width:100%;border-collapse:collapse;font-size:13px;margin-top:2px}
.ctable th{text-align:left;color:var(--sub);font-weight:600;padding:9px 10px;border-bottom:2px solid var(--line);position:sticky;top:0;background:#fff}
.ctable td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.ctable tr:hover td{background:#fafbff}
.ctable .city{font-weight:700;white-space:nowrap}
.tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:2px}
.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.55}
.csub2{color:var(--sub);font-size:12px;font-weight:400;display:block;margin-top:3px}
.note{background:#fdf3e7;border:1px solid #f6dcc0;border-radius:12px;padding:12px 14px;font-size:13px;color:#a9763f;margin:16px 0}
.foot{text-align:center;color:var(--sub);font-size:12px;margin:22px 0 10px}
@media(max-width:520px){.bar{grid-template-columns:52px 1fr 48px;gap:7px}.bn{font-size:13px}.ctable{font-size:12px}}
</style>
</head>
<body>
<header class="hero">
  <h1>${provName}初升高升学路径全景</h1>
  <p>${n} 个地级市 · 一张图看全初升高（计分 / 批次 / 名额分配 / 自主招生 / 随迁门槛 / 中职贯通）</p>
</header>
<div class="wrap">
  <a class="back" href="index.html">← 返回门户</a>
  <div class="pcard">
    <span class="tag">${provName} · ${n} 市</span>
    <h2>选择城市，进入初升高升学路径全景</h2>
    <p class="desc">${provName}中考由各地级市自主命题录取（高考虽全省统一，中考由市管，非全省统一）。每个城市页含 9 大模块：中考概况 / 录取批次与路径 / 名额分配 / 自主招生 / 随迁门槛 / 路径总览 / 中职职教 / 关键数据 / 官方信源。官方未单列的数据均如实标注“待核”。</p>
    <div class="cities">${grid}</div>
  </div>

  <div class="chart">
    <span class="tag">一图看懂 · ${n} 市</span>
    <h2>${provName}各市初升高关键差异</h2>
    <p class="csub">横向对比各市中考方案。柱条按数值从高到低排列，点击可进入该市中心页；官方未单列的维度诚实标注“待核 / 未公布”，不作估算填充。</p>
    <div class="panel active" id="p-total">
      <p class="csub" style="margin-top:0">各市中考满分不同（${Math.min(...cities.map(c=>c.total))}–${maxT} 分），反映计分科目与权重差异，不代表考试难易或录取难度。普高录取率等更细维度，点柱条进对应城市页查看（官方未单列的均如实标注“待核”，不作估算填充）。</p>
      ${bars}
    </div>
  </div>

  <div class="chart">
    <span class="tag">路径差异 · 全市对照</span>
    <h2>${provName}各市初升高政策维度对照</h2>
    <p class="csub">7 列横向对比：中考满分 / 划线方式 / 录取批次 / 随迁子女门槛 / 名额分配 / 自主招生。文字较长处折叠为 3 行，点城市名进页看全文。标“待核”表示官方未单列。不作估算填充。</p>
    <div class="tscroll">
    <table class="ctable">
      <thead><tr><th>城市</th><th>中考满分</th><th>划线方式（户籍 / 随迁）</th><th>录取批次与投档</th><th>随迁子女报考门槛</th><th>名额分配（指标生）</th><th>普通高中自主招生</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  </div>

  <div class="note"><b>关于数据：</b>各城市页基于 ${data.year} 年当地中招 / 教育局公开资料整理，分数为录取参考线 / 定位分估算，官方未单列的数据均标注“官方未公布 / 未单列 / 待核”，不构成录取承诺；最终以市中招办与学校官方公布为准。</div>
  <div class="foot">中高考考情分析平台 · ${provName}初升高升学路径</div>
</div>
<script>
  document.querySelectorAll('.tab').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});
      document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active')});
      b.classList.add('active');
      document.getElementById(b.dataset.p).classList.add('active');
    });
  });
</script>
</body>
</html>`;
  return html;
}

// ---------- 主流程 ----------
function main() {
  const targets = [
    { prov: 'zhejiang', file: 'zhejiang_chuzhong.json', hub: 'zhejiang.html' },
    { prov: 'jiangsu', file: 'jiangsu_chuzhong.json', hub: 'jiangsu.html' },
  ];
  const written = [];
  for (const t of targets) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, t.file), 'utf8'));
    const hub = buildHub(t.prov, data);
    const hubPath = path.join(FRONTEND, t.hub);
    fs.writeFileSync(hubPath, hub, 'utf8');
    written.push(hubPath);
    for (const d of data.cities) {
      const html = buildCityPage(t.prov, d, t.hub);
      const f = path.join(FRONTEND, cityFile(t.prov, d.city));
      fs.writeFileSync(f, html, 'utf8');
      written.push(f);
    }
    console.log(`[${t.prov}] hub=${t.hub} cities=${data.cities.length}`);
  }
  console.log('TOTAL FILES:', written.length);
}

main();
