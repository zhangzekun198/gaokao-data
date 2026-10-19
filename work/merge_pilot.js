/* 合并 pilot_<prov>.json 与 pilot_<prov>_ext*.json，把 ext 中的新城市追加进 base（不覆盖已有城市）。
   用法：node merge_pilot.js zj|js|gd
*/
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const prov = process.argv[2];
if (!prov) { console.error("usage: node merge_pilot.js zj|js|gd"); process.exit(1); }
const baseP = path.join(ROOT, "work", `pilot_${prov}.json`);
const extPs = [`pilot_${prov}_ext.json`, `pilot_${prov}_ext_a.json`, `pilot_${prov}_ext_b.json`]
  .map(f => path.join(ROOT, "work", f)).filter(f => fs.existsSync(f));

const base = JSON.parse(fs.readFileSync(baseP, "utf8"));
const have = new Set(base.cities.map(c => c.meta.city));
let added = 0;
extPs.forEach(ep => {
  if (!fs.existsSync(ep)) return;
  const ext = JSON.parse(fs.readFileSync(ep, "utf8"));
  (ext.cities || []).forEach(c => {
    if (!have.has(c.meta.city)) { base.cities.push(c); have.add(c.meta.city); added++; }
    else console.log("跳过已存在:", c.meta.city);
  });
});
fs.writeFileSync(baseP, JSON.stringify(base, "", 1) + "\n", "utf8");
console.log(`[${prov}] 新增 ${added} 城，现共 ${base.cities.length} 城 -> ${baseP}`);
