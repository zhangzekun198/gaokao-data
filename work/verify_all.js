/* 中考志愿填报工具全量无头冒烟测试（jsdom）
   校验所有 <省>-<市>-zhongkao.html：无 JS 报错；规则/探校渲染；填分后冲稳保推荐；加志愿表生效。 */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const FRONT = path.resolve(__dirname, "..", "frontend");
const files = fs.readdirSync(FRONT).filter(f => /^(zhejiang|jiangsu|guangdong)-.*-zhongkao\.html$/.test(f)).sort();

let pass = 0, fail = 0;
(async () => {
  for (const f of files) {
    const html = fs.readFileSync(path.join(FRONT, f), "utf8");
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", e => errs.push("jsdomError:" + (e.message || e)));
    vc.on("error", (...a) => errs.push("console.error:" + a.join(" ")));
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", virtualConsole: vc, url: "http://localhost/" });
    dom.window.scrollTo = function () {};
    await new Promise(r => setTimeout(r, 300));
    const w = dom.window, d = w.document;
    const problems = [];
    if (!d.querySelector("#rules .tbl") && !d.querySelector("#rules .pts")) problems.push("规则未渲染");
    const skCount = d.querySelectorAll("#skList .sk").length;
    if (skCount === 0) problems.push("探校学校列表为空");
    if (!d.querySelector(".sec.show")) problems.push("无默认显示 section");
    const scoreInput = d.querySelector("#stuScore");
    const saveBtn = d.querySelector("#stuSave");
    if (!scoreInput || !saveBtn) problems.push("考生信息表单缺失");
    else {
      scoreInput.value = "600";
      saveBtn.click();
      const tiers = d.querySelectorAll("#reco .tier").length;
      const rks = d.querySelectorAll("#reco .rk").length;
      if (tiers < 3) problems.push("推荐未出三档(" + tiers + ")");
      if (rks === 0) problems.push("推荐无学校行");
      w.addWish && w.addWish("测试学校X", 590, "稳");
      if (d.querySelectorAll("#wish .wlist li").length < 1) problems.push("志愿表加入失败");
      w.renderCheck && w.renderCheck();
    }
    const ok = errs.length === 0 && problems.length === 0;
    if (ok) { pass++; console.log("PASS", f, "(学校", skCount + ")"); }
    else {
      fail++;
      console.log("FAIL", f);
      errs.forEach(e => console.log("   JSERR:", e));
      problems.forEach(p => console.log("   PROB:", p));
    }
    dom.window.close();
  }
  console.log("\n==== 结果：PASS " + pass + " / FAIL " + fail + " （共 " + files.length + " 页）====");
  process.exit(fail ? 1 : 0);
})();
