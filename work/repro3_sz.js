const { JSDOM } = require('jsdom');
// 静态内联 handler（写在原始 HTML 里，非 innerHTML 注入）
const html = `<!doctype html><html><body>
<button id="b1" onclick="window.__hit=true;window.__v=(window.__v||0)+1">static</button>
<div id="recOut"></div>
<script>
  // 模拟动态注入内联 handler（同 sz 工具的做法）
  document.getElementById('recOut').innerHTML = '<button id="b2" onclick="window.__hit=true;window.__v2=(window.__v2||0)+1">dynamic</button>';
</script>
</body></html>`;
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const { window } = dom;
setTimeout(() => {
  const doc = window.document;
  doc.getElementById('b1').click();  // 静态
  console.log('静态 onclick 触发?', window.__hit === true, '| 计数:', window.__v);
  const b2 = doc.getElementById('b2');
  if (b2) { b2.click(); console.log('动态(innerHTML) onclick 触发?', window.__v2 !== undefined, '| 计数:', window.__v2); }
  else console.log('动态按钮不存在');
}, 100);
