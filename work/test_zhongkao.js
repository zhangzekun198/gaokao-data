/* 中考志愿填报工具无头冒烟测试（jsdom）
   校验：无 JS 报错；规则/探校渲染；填写分数后智能推荐出冲稳保；加入志愿表生效。 */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const FRONT = path.resolve(__dirname, "..", "frontend");
const files = fs.readdirSync(FRONT).filter(f => /-(hangzhou|ningbo|wenzhou|nanjing|suzhou|wuxi|foshan|dongguan|zhuhai)-zhongkao\.html$/.test(f));

let pass = 0, fail = 0;
(async () => {
  for (const f of files) {
    const html = fs.readFileSync(path.join(FRONT, f), "utf8");
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", e => errs.push("jsdomError:" + (e.message || e)));
    vc.on("error", (...a) => errs.push("console.error:" + a.join(" ")));
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", virtualConsole: vc, url: "http://localhost/" });
    dom.window.scrollTo = function () {}; // jsdom 未实现 scrollTo，stub 掉避免误报
    // 等待脚本执行
    await new Promise(r => setTimeout(r, 300));
    const w = dom.window, d = w.document;
    const problems = [];
    // 1) 规则渲染
    if (!d.querySelector("#rules .tbl") && !d.querySelector("#rules .pts")) problems.push("规则未渲染");
    // 2) 探校学校列表
    const skCount = d.querySelectorAll("#skList .sk").length;
    if (skCount === 0) problems.push("探校学校列表为空");
    // 3) 默认显示第一个 section
    const shown = d.querySelector(".sec.show");
    if (!shown) problems.push("无默认显示 section");
    // 4) 模拟填写考生信息并保存
    const scoreInput = d.querySelector("#stuScore");
    const saveBtn = d.querySelector("#stuSave");
    if (!scoreInput || !saveBtn) problems.push("考生信息表单缺失");
    else {
      scoreInput.value = "600";
      saveBtn.click();
      // 5) 推荐应有冲稳保分组
      const tiers = d.querySelectorAll("#reco .tier").length;
      const rks = d.querySelectorAll("#reco .rk").length;
      if (tiers < 3) problems.push("推荐未出三档(" + tiers + ")");
      if (rks === 0) problems.push("推荐无学校行");
      // 6) 加入志愿表
      w.addWish && w.addWish("测试学校X", 590, "稳");
      const wishItems = d.querySelectorAll("#wish .wlist li").length;
      if (wishItems < 1) problems.push("志愿表加入失败");
      // 7) 体检
      w.renderCheck && w.renderCheck();
    }
    const ok = errs.length === 0 && problems.length === 0;
    if (ok) { pass++; console.log("PASS", f, "(学校列表", skCount + ")"); }
    else {
      fail++;
      console.log("FAIL", f);
      errs.forEach(e => console.log("   JSERR:", e));
      problems.forEach(p => console.log("   PROB:", p));
    }
    dom.window.close();
  }
  console.log("\n==== 结果：PASS " + pass + " / FAIL " + fail + " ====");
  process.exit(fail ? 1 : 0);
})();
