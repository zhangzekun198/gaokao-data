const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('frontend/sz-zhongkao.html', 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail ? e.detail.message : e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
window.onerror = (msg, src, line, col, err) => errors.push('onerror: ' + msg + ' @' + line + ':' + col + (err ? ' :: ' + err.message : ''));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS :: ' + m); } else { fail++; console.log('FAIL :: ' + m); } };

setTimeout(() => {
  const doc = window.document;
  const $ = id => doc.getElementById(id);

  // A. 智能推荐
  $('recScore').value = '560'; $('recType').value = 'ac';
  window.recommend();
  ok(/深圳中学/.test($('recOut').innerHTML), 'recommend 卡片显示校名(深圳中学)');
  const recAdd = [...doc.querySelectorAll('#recOut button')].filter(b => /加入志愿表/.test(b.textContent));
  ok(recAdd.length > 0, 'recommend 含加入按钮(' + recAdd.length + ')');
  recAdd[0].click();
  ok(/wishrow/.test($('wishOut').innerHTML), '点击加入后 志愿表出现条目');
  ok(/深圳中学/.test($('wishOut').innerHTML), '志愿表含 深圳中学');
  const afterA = [...$('wishOut').querySelectorAll('.wishrow')].length;

  // B. 重复加入同一校去重
  recAdd[0].click();
  ok([...$('wishOut').querySelectorAll('.wishrow')].length === afterA, '重复加入同一校去重(仍为' + afterA + '条)');

  // C. 选方向生成 -> 加入候选(#dirOut 内)
  window.toggleDir('pu'); window.genByDirection();
  const dirNames = [...doc.querySelectorAll('#dirOut .nm')].map(e => e.textContent.trim());
  ok(dirNames.every(n => n.length > 0), '选方向候选全部带校名');
  const dirAdd = [...doc.querySelectorAll('#dirOut button')].filter(b => /加入志愿表/.test(b.textContent));
  const beforeC = [...$('wishOut').querySelectorAll('.wishrow')].length;
  dirAdd[0].click();
  const afterC = [...$('wishOut').querySelectorAll('.wishrow')].length;
  ok(afterC === beforeC + 1, '选方向加入后 志愿表条目+1(' + beforeC + '->' + afterC + ')');

  // D. 方案体检
  $('stType').value = 'ac'; $('stScore').value = '560'; window.saveStudent();
  window.healthCheck();
  ok($('hcOut').innerHTML.length > 50, '方案体检有结论输出');

  // E. 导出文本含校名(在删除前)
  const txt = window.buildText();
  ok(/深圳中学/.test(txt), '导出文本含校名');

  // F. 删除一条
  const beforeF = [...$('wishOut').querySelectorAll('.wishrow')].length;
  const delBtn = [...doc.querySelectorAll('#wishOut button')].find(b => b.textContent.trim() === '删');
  if (delBtn) delBtn.click();
  ok([...$('wishOut').querySelectorAll('.wishrow')].length === beforeF - 1, '删除条目生效(' + beforeF + '->' + ([...$('wishOut').querySelectorAll('.wishrow')].length) + ')');

  console.log('\n=== 错误汇总 ===');
  console.log(errors.length ? errors.join('\n') : 'NONE');
  console.log(`\nRESULT: ${fail === 0 ? 'ALL PASS' : fail + ' FAIL'} (${pass} pass / ${fail} fail)`);
}, 300);
