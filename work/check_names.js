const fs = require('fs');
const d = JSON.parse(fs.readFileSync('work/sz_data.json', 'utf8'));
const names = (d.scores || []).map(s => s.n || s.name).concat((d.indicator || []).map(s => s.name));
let bad = [];
names.forEach(n => {
  if (n == null) return;
  const s = String(n);
  if (/[`]/.test(s)) bad.push('反引号: ' + s);
  if (/\$\{/.test(s)) bad.push('${: ' + s);
  if (/["]/.test(s)) bad.push('双引号: ' + s);
  if (/[']/.test(s)) bad.push("单引号: " + s);
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) bad.push('控制符: ' + s);
});
console.log('校名总数:', names.length);
console.log('危险字符校名:', bad.length ? bad.join(' | ') : '无');
