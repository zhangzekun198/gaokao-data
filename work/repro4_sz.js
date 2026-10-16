const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('frontend/sz-zhongkao.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
setTimeout(() => {
  const doc = dom.window.document;
  doc.getElementById('recScore').value = '550';
  doc.getElementById('recType').value = 'ac';
  dom.window.recommend();
  // 取出第一条加入按钮的原始 outerHTML
  const btns = [...doc.querySelectorAll('button')].filter(b => /加入志愿表/.test(b.textContent));
  console.log('加入按钮数:', btns.length);
  if (btns.length) {
    console.log('--- 第1个按钮 outerHTML ---');
    console.log(btns[0].outerHTML);
    console.log('--- 该按钮 onclick 属性原文 ---');
    console.log(JSON.stringify(btns[0].getAttribute('onclick')));
  }
  // 找出所有加入按钮中 onclick 是否都正常（含引号配对）
  let broken = 0;
  btns.forEach((b, i) => {
    const oc = b.getAttribute('onclick') || '';
    // 粗略检查：是否包含未转义的双引号（会破 outerHTML 属性）
    if (/[^\\]"[^']*'/.test(oc)) { /* 允许内部单引号串 */ }
  });
  // 直接 eval 每个按钮的 onclick，看哪些抛错
  btns.slice(0, 20).forEach((b, i) => {
    const oc = b.getAttribute('onclick');
    try { new dom.window.Function(oc); } catch (e) { broken++; console.log('按钮#'+i+' onclick 语法错: ' + e.message + ' :: ' + oc); }
  });
  console.log('前20个按钮中语法错数量:', broken);
}, 300);
