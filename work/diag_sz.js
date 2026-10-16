const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('frontend/sz-zhongkao.html', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', e => console.log('jsdomError:', e.detail ? e.detail.message : e.message));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
window.onerror = (m, s, l, c, e) => console.log('onerror:', m, e ? e.message : '');
setTimeout(() => {
  const doc = window.document; const $ = id => doc.getElementById(id);
  // 选方向 pu
  window.toggleDir('pu'); window.genByDirection();
  const dirHTML = $('dirOut').innerHTML;
  const m = dirHTML.match(/加入志愿表<\/button>/g);
  console.log('pu 候选加入按钮数:', m ? m.length : 0);
  // 取出这些候选的校名
  const names = [...doc.querySelectorAll('#dirOut .nm')].map(e => e.textContent.trim());
  console.log('pu 候选校名(前8):', JSON.stringify(names.slice(0, 8)));
  // 点第一个候选加入
  const firstDraftBtn = [...doc.querySelectorAll('#dirOut button')].find(b => /加入志愿表/.test(b.textContent));
  console.log('首个候选按钮 onclick:', firstDraftBtn ? firstDraftBtn.getAttribute('onclick') : 'NONE');
  // 看深圳中学是否在 pu 候选里（撞名去重）
  console.log('深圳中学 是否在 pu 候选:', names.includes('深圳中学'));
  firstDraftBtn.click();
  console.log('点击后 wishOut wishrow 数:', [...$('wishOut').querySelectorAll('.wishrow')].length);
  console.log('wishOut 文本片段:', $('wishOut').textContent.replace(/\s+/g,' ').slice(0,200));
}, 300);
