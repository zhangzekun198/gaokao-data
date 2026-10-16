const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('frontend/sz-zhongkao.html', 'utf8');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/', virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errors.push('jsdomError: ' + (e.detail ? e.detail.stack : e.message))).on('error', (...a) => errors.push('console.error: ' + a.join(' '))) });
const { window } = dom;
window.onerror = (msg, src, line, col, err) => errors.push('onerror: ' + msg + ' @' + line + ':' + col + (err ? ' :: ' + err.stack : ''));
setTimeout(() => {
  const doc = window.document;
  const $ = id => doc.getElementById(id);
  console.log('1) 直接调用 window.addWish:');
  try {
    const r = window.addWish('第一批', '测试学校A', 550);
    console.log('   返回值:', r, '| wishOut 含 wishrow:', /wishrow/.test($('wishOut').innerHTML));
  } catch (e) { errors.push('addWish直接调用 threw: ' + e.stack); }

  console.log('2) 通过 window 访问 state:');
  console.log('   typeof window.state =', typeof window.state);

  console.log('3) 通过 window 访问 $:');
  console.log('   typeof window.$ =', typeof window.$);

  // 4) 模拟内联 handler 执行环境：把 handler 字符串当函数体在全局执行
  console.log('4) 在 window 作用域 eval 内联 handler 字符串:');
  try {
    const code = "addWish('第一批','内联测试校',500)";
    const fn = new window.Function(code);
    fn.call(window);
    console.log('   执行后 wishOut 含 wishrow:', /wishrow/.test($('wishOut').innerHTML));
  } catch (e) { errors.push('inline-eval threw: ' + e.stack); }

  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'NONE');
}, 300);
