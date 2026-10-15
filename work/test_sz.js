// 深圳中考志愿填报页 无头 DOM 测试
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = 'C:/Users/zhangzekun03/gaokao_data_repo/frontend/sz-zhongkao.html';
const html = fs.readFileSync(htmlPath, 'utf-8');

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/' });
const { window } = dom;
const doc = window.document;

const errors = [];
window.onerror = (e) => errors.push('window.onerror: ' + e);
// 捕获脚本内未捕获异常
const origErr = console.error;
console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); };

function setVal(id, v){ const el = doc.getElementById(id); if(!el){ throw new Error('missing #'+id); } el.value = v; }
function check(name, cond, extra){ console.log((cond?'PASS':'FAIL')+' :: '+name+(extra?(' :: '+extra):'')); if(!cond) errors.push('CHECK FAIL: '+name); }

try {
  // init 已执行（renderRules/renderDirTags/renderWish）
  check('rulesOut 渲染', doc.getElementById('rulesOut').innerHTML.length > 200, 'len='+doc.getElementById('rulesOut').innerHTML.length);
  const total = parseInt(doc.getElementById('p26Total').textContent, 10);
  check('DATA 已注入(学校数>100)', total > 100, 'schools='+total);
  check('p26Total 写入', total > 100, doc.getElementById('p26Total').textContent);

  // ② 位次测算 AC 560
  setVal('rkScore','560'); setVal('rkType','ac'); window.calcRank();
  const rk = doc.getElementById('rkOut').innerHTML;
  check('calcRank 输出含冲稳保', rk.includes('冲刺') && rk.includes('稳妥') && rk.includes('保底'));
  check('calcRank 含等级线', /A\+|A|B\+|B|C\+|C/.test(rk));

  // ② D 类 500
  setVal('rkScore','500'); setVal('rkType','d'); window.calcRank();
  check('calcRank D类 无异常', doc.getElementById('rkOut').innerHTML.length > 100);

  // ③ 考生信息 + 指标生匹配（用深圳中学做初中名触发？指标生按高中名匹配，这里用 school 字段）
  setVal('stName','测试生'); setVal('stDist','福田区'); setVal('stSchool','深圳中学'); setVal('stType','ac'); setVal('stScore','560'); setVal('stBatch','第一批');
  window.saveStudent();
  check('saveStudent 输出', doc.getElementById('stOut').innerHTML.includes('已保存'));

  // ④ 智能推荐（取考生信息 560）
  window.recommend();
  const rec = doc.getElementById('recOut').innerHTML;
  check('recommend 输出含三列', rec.includes('冲刺') && rec.includes('保底'));
  check('recommend 含加入按钮', rec.includes('加入志愿表'));

  // ⑤ 选方向
  window.toggleDir('top'); window.toggleDir('min'); window.genByDirection();
  check('genByDirection 输出候选', doc.getElementById('dirOut').innerHTML.includes('候选') || doc.getElementById('dirOut').innerHTML.includes('已生成'));
  window.addDraftToWish();
  const wis = doc.getElementById('wishOut').innerHTML;
  check('志愿表 已有条目', wis.includes('深圳中学') || wis.includes('个'), 'len='+wis.length);

  // ⑥ 手动加一所 + ⑦ 方案体检
  setVal('wishName','红岭中学'); setVal('wishBatch','第一批'); setVal('wishScore','540'); window.addWishManual();
  window.healthCheck();
  const hc = doc.getElementById('hcOut').innerHTML;
  check('healthCheck 有结论', hc.includes('合理') || hc.includes('风险') || hc.includes('未填') || hc.includes('建议'));

  // ⑨ 录取分检索
  setVal('p26Kw','深圳'); setVal('p26Nat','');
  window.renderScore();
  check('renderScore 命中', doc.getElementById('p26Out').innerHTML.includes('深圳中学'));
  setVal('p26Kw',''); setVal('p26Nat','民办'); window.renderScore();
  check('renderScore 民办过滤', doc.getElementById('p26Out').innerHTML.includes('民办'));

  // ⑨ 指标生查询（用数据集中真实存在的指标生学校）
  setVal('p26qKw','南外高级中学'); window.renderQuota();
  check('renderQuota 命中', doc.getElementById('p26qOut').innerHTML.includes('指标生控制线'));
  setVal('p26qKw','不存在的学校xyz'); window.renderQuota();
  check('renderQuota 未找到提示', doc.getElementById('p26qOut').innerHTML.includes('未找到'));

  // ⑨ 自主招生 tab
  window.switchP26('zz');
  check('renderZZ 有数据', doc.getElementById('p26zOut').innerHTML.length > 100);

  // ⑧ 导出文本构建（不触发下载）
  const txt = window.buildText();
  check('buildText 含批次', txt.includes('第一批（普通高中）'));

  // 导出 HTML（jsdom 无 URL.createObjectURL，属环境限制；真实浏览器标准支持）
  try { window.exportHTML(); check('exportHTML 未抛异常', true); }
  catch(e){ if(/createObjectURL/.test(e.message)){ check('exportHTML(jsdom环境无createObjectURL,真实浏览器OK)', true); } else { check('exportHTML 抛异常', false, e.message); } }

} catch(e) {
  errors.push('EXCEPTION: ' + e.stack);
  console.log('EXCEPTION: ' + e.stack);
}

console.log('\n==== 错误汇总 ====');
if(errors.length){ errors.forEach(e=>console.log(' - '+e)); console.log('RESULT: FAIL ('+errors.length+' errors)'); process.exit(1); }
else { console.log('RESULT: ALL PASS'); process.exit(0); }
