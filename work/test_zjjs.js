#!/usr/bin/env node
/** 无头冒烟测试：校验生成的浙江/江苏初升高页无 JS 报错、关键元素齐全。 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FRONTEND = path.resolve(__dirname, '..', 'frontend');

// 期望：市级页 9 个 section + ≥1 个信源；枢纽页 城市卡数 = N + 表格行数 = N
const CITY_EXPECT = {
  'zhejiang': 11, 'jiangsu': 13,
};
const cityFiles = [];
for (const [prov, n] of Object.entries(CITY_EXPECT)) {
  const cities = ['hangzhou','ningbo','jiaxing','huzhou','shaoxing','wenzhou','jinhua','quzhou','zhoushan','taizhou','lishui'];
  const jsCities = ['nanjing','suzhou','wuxi','changzhou','zhenjiang','xuzhou','huaian','suqian','lianyungang','nantong','yangzhou','taizhou','yancheng'];
  const list = prov === 'zhejiang' ? cities : jsCities;
  for (const c of list) cityFiles.push({ f: `${prov}-${c}-shengxue-lujing.html`, prov, n });
}

let pass = 0, fail = 0;
const fails = [];

function testFile(file, checks) {
  const p = path.join(FRONTEND, file);
  const html = fs.readFileSync(p, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', m => errors.push('console.error: ' + m));
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, resources: 'usable' });
  const doc = dom.window.document;
  const problems = [];
  for (const c of checks) {
    const v = c.get(doc);
    if (!c.ok(v)) problems.push(`${c.label} (got: ${JSON.stringify(v)})`);
  }
  if (errors.length) problems.push('JS errors: ' + errors.join(' | '));
  return problems;
}

// 枢纽页
for (const [prov, n] of Object.entries(CITY_EXPECT)) {
  const probs = testFile(`${prov}.html`, [
    { label: 'city cards = ' + n, get: d => d.querySelectorAll('.cities a.cc').length, ok: v => v === n },
    { label: 'table rows = ' + n, get: d => d.querySelectorAll('.ctable tbody tr').length, ok: v => v === n },
    { label: 'has bar chart', get: d => d.querySelectorAll('.bar').length, ok: v => v >= n },
    { label: 'title present', get: d => d.title.length > 0, ok: v => v },
  ]);
  if (probs.length) { fail++; fails.push(`${prov}.html -> ` + probs.join('; ')); }
  else pass++;
}

// 市级页
for (const { f, prov } of cityFiles) {
  const probs = testFile(f, [
    { label: '9 sections', get: d => d.querySelectorAll('section').length, ok: v => v === 9 },
    { label: 'nav links=9', get: d => d.querySelectorAll('nav.tabs a').length, ok: v => v === 9 },
    { label: '>=1 source', get: d => d.querySelectorAll('.srclist a').length, ok: v => v >= 1 },
    { label: 'hero h1', get: d => d.querySelector('header.hero h1').textContent.length > 0, ok: v => v },
    { label: 'has dai or content', get: d => d.querySelector('.card .desc').textContent.length > 0, ok: v => v },
  ]);
  if (probs.length) { fail++; fails.push(f + ' -> ' + probs.join('; ')); }
  else pass++;
}

console.log(`PASS=${pass} FAIL=${fail} TOTAL=${pass + fail}`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(x => console.log(' - ' + x)); process.exit(1); }
console.log('ALL OK');
