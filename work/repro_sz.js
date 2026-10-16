const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('frontend/sz-zhongkao.html', 'utf8');
const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost/'
});
const { window } = dom;
window.onerror = (msg, src, line, col, err) => { errors.push('onerror: ' + msg + ' @' + line + ':' + col + (err ? ' :: ' + err.stack : '')); };
window.addEventListener('error', e => errors.push('errorEvent: ' + (e.error ? e.error.stack : e.message)));

// 等脚本执行
setTimeout(() => {
  const doc = window.document;
  const $ = id => doc.getElementById(id);
  console.log('window.addWish type:', typeof window.addWish);
  console.log('window.state type:', typeof window.state);

  // 模拟用户：填分数 -> recommend()
  $('recScore').value = '550';
  $('recType').value = 'ac';
  try { window.recommend(); } catch (e) { errors.push('recommend threw: ' + e.stack); }
  const recOut = $('recOut').innerHTML;
  console.log('recOut 长度:', recOut.length, '| 含加入按钮:', /加入志愿表/.test(recOut));

  // 找一个加入按钮真实点击
  const btns = [...doc.querySelectorAll('button')].filter(b => /加入志愿表/.test(b.textContent));
  console.log('加入按钮数量:', btns.length);
  const wishBefore = $('wishOut').innerHTML;
  if (btns.length) {
    try { btns[0].click(); } catch (e) { errors.push('click threw: ' + e.stack); }
  }
  const wishAfter = $('wishOut').innerHTML;
  console.log('点击前 wishOut 长度:', wishBefore.length);
  console.log('点击后 wishOut 长度:', wishAfter.length);
  console.log('wishOut 增加(含校名行):', /wishrow/.test(wishAfter));

  // 也测 genByDirection -> addDraftToWish
  if (window.toggleDir) {
    try { window.toggleDir('pu'); window.genByDirection(); } catch (e) { errors.push('genByDirection threw: ' + e.stack); }
    const dirOut = $('dirOut').innerHTML;
    console.log('dirOut 含候选:', /候选/.test(dirOut));
    const draftBtns = [...doc.querySelectorAll('button')].filter(b => /加入志愿表/.test(b.textContent));
    console.log('选方向后加入按钮数量:', draftBtns.length);
    if (draftBtns.length) {
      try { draftBtns[0].click(); } catch (e) { errors.push('draft click threw: ' + e.stack); }
    }
    console.log('二次点击后 wishOut 含 wishrow:', /wishrow/.test($('wishOut').innerHTML));
  }

  console.log('\n=== JS ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'NONE');
}, 300);
