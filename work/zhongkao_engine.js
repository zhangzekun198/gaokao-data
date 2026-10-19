/* 中考志愿填报引擎（浏览器端，依赖全局 window.DATA）
   模块：规则 / 分数定位 / 智能推荐(冲稳保) / 探校 / 志愿表 / 方案体检 / 导出
   设计 token：冲#dc2626 稳#2563eb 保#15803d 品牌#3b5bdb */
(function () {
  "use strict";
  var D = window.DATA;
  if (!D) { document.body.innerHTML = "<p style='padding:24px'>数据未加载</p>"; return; }
  var meta = D.meta, pol = D.policy, scores = D.scores || [], sources = D.sources || [];
  var city = meta.city, prov = meta.province, year = meta.year, total = meta.total;

  var STU_KEY = "zk_" + prov + "_" + city + "_stu";
  var WISH_KEY = "zk_" + prov + "_" + city + "_wish";

  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // 户籍类型选项：依据数据里是否有 fei/wai 字段决定
  var hasFei = scores.some(function (s) { return s.fei2025 && s.fei2025.some(function (x) { return x != null; }); });
  var hasWai = scores.some(function (s) { return s.wai2025 && s.wai2025.some(function (x) { return x != null; }); });
  var HUKOU_OPTS = [{ v: "hu", t: "户籍生/本市生" }];
  if (hasFei) HUKOU_OPTS.push({ v: "fei", t: "非户籍/随迁" });
  if (hasWai) HUKOU_OPTS.push({ v: "wai", t: "外区生" });

  // 取某校某户籍类型的参考线：优先预测线，否则用当年线首值
  function getLine(s, type) {
    var arr = type === "fei" ? s.fei2025 : type === "wai" ? s.wai2025 : s.hu2025;
    if (!arr || !arr.some(function (x) { return x != null; })) arr = s.hu2025;
    var base = arr ? arr.filter(function (x) { return x != null; })[0] : null;
    var pred = (s.hu2026pred != null) ? s.hu2026pred : null;
    return { line: (pred != null ? pred : base), base: base, pred: pred };
  }
  function tierOf(gap) {
    if (gap >= 8) return "冲";
    if (gap <= -8) return "保";
    return "稳";
  }
  function fmtArr(a) {
    if (!a) return "—";
    var v = a.filter(function (x) { return x != null; });
    return v.length ? v.join(" / ") : "—";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---------- 考生信息 ----------
  var stu = load(STU_KEY) || { score: "", hukou: "hu", batch: "" };
  var wish = load(WISH_KEY) || [];

  // ---------- 模块① 报考规则 ----------
  function renderRules() {
    var box = $("#rules");
    var h = "";
    h += "<p class='note-in'>" + esc(meta.note || "") + "</p>";
    if (meta.lineMode) h += "<p class='lm'><b>划线方式：</b>" + esc(meta.lineMode) + "</p>";
    // 批次
    h += "<h3>录取批次与志愿</h3><div class='tbl-wrap'><table class='tbl'><thead><tr><th>批次</th><th>志愿数</th><th>说明</th></tr></thead><tbody>";
    (pol.batches || []).forEach(function (b) {
      h += "<tr><td>" + esc(b.name) + "</td><td>" + esc(b.vol || "—") + "</td><td>" + esc(b.note || "") + "</td></tr>";
    });
    h += "</tbody></table></div>";
    // 定位基准线
    var yrs = Object.keys(pol.lines || {}).sort().reverse();
    if (yrs.length) {
      var ly = yrs[0];
      h += "<h3>" + ly + " 分数定位基准（控制线 / 段线）</h3><div class='lines'>";
      Object.keys(pol.lines[ly]).forEach(function (k) {
        h += "<span class='ln'><b>" + esc(k) + "</b><i>" + esc(pol.lines[ly][k]) + " 分</i></span>";
      });
      h += "</div>";
    }
    // 政策要点
    var items = [
      ["投档规则", pol.rule], ["户籍 / 随迁", pol.hukou], ["名额分配（指标生）", pol.minge],
      ["填报梯度原则", pol.principle]
    ];
    h += "<h3>政策要点</h3><div class='pts'>";
    items.forEach(function (it) {
      if (it[1]) h += "<div class='pt'><b>" + esc(it[0]) + "</b><p>" + esc(it[1]) + "</p></div>";
    });
    h += "</div>";
    box.innerHTML = h;
  }

  // ---------- 模块② 分数定位 ----------
  function renderLocate() {
    var box = $("#locate");
    var yrs = Object.keys(pol.lines || {}).sort().reverse();
    var ly = yrs[0];
    var linesObj = ly ? pol.lines[ly] : {};
    var entries = Object.keys(linesObj).map(function (k) { return { k: k, v: linesObj[k] }; })
      .sort(function (a, b) { return b.v - a.v; });
    var h = "<p class='desc'>输入中考总分，立即看处在哪个分数线档位、距下一段还差多少。</p>";
    h += "<div class='inrow'><input id='locScore' type='number' min='0' max='" + (total || 800) + "' placeholder='输入" + (total || "") + "分制总分'> <button class='btn' id='locBtn'>定位</button></div>";
    h += "<div id='locOut'></div>";
    box.innerHTML = h;
    $("#locBtn").onclick = function () {
      var sc = parseFloat($("#locScore").value);
      var out = $("#locOut");
      if (isNaN(sc)) { out.innerHTML = "<p class='warn'>请输入分数</p>"; return; }
      var passed = entries.filter(function (e) { return sc >= e.v; });
      var next = entries.filter(function (e) { return sc < e.v; }).sort(function (a, b) { return a.v - b.v; })[0];
      var html = "";
      if (passed.length) {
        html += "<div class='loc-ok'>已过线 <b>" + passed.length + "</b> 条：" +
          passed.map(function (e) { return esc(e.k) + "(" + e.v + ")"; }).join("、") + "</div>";
      } else {
        html += "<div class='loc-warn'>尚未达到已公布的任何控制线，建议优先确保批次线。</div>";
      }
      if (next) {
        html += "<div class='loc-next'>距离下一段 <b>" + esc(next.k) + "</b> 还差 <b>" + (next.v - sc) + "</b> 分（线 " + next.v + "）。</div>";
      } else {
        html += "<div class='loc-next'>已达到公布的最高控制线档位。</div>";
      }
      out.innerHTML = html;
    };
  }

  // ---------- 模块③ 考生信息 ----------
  function renderStudent() {
    var box = $("#student");
    var h = "<p class='desc'>填写后全局复用，智能推荐与志愿表自动套用。</p><div class='form'>";
    h += "<label>中考总分<input id='stuScore' type='number' min='0' max='" + (total || 800) + "' value='" + esc(stu.score) + "'></label>";
    h += "<label>考生类别<select id='stuHukou'>";
    HUKOU_OPTS.forEach(function (o) {
      h += "<option value='" + o.v + "'" + (stu.hukou === o.v ? " selected" : "") + ">" + esc(o.t) + "</option>";
    });
    h += "</select></label>";
    var batches = (pol.batches || []).map(function (b) { return b.name; });
    h += "<label>目标批次<select id='stuBatch'><option value=''>不限</option>";
    batches.forEach(function (b) {
      h += "<option value='" + esc(b) + "'" + (stu.batch === b ? " selected" : "") + ">" + esc(b) + "</option>";
    });
    h += "</select></label>";
    h += "<button class='btn' id='stuSave'>保存并测算</button></div>";
    h += "<div id='stuMsg'></div>";
    box.innerHTML = h;
    $("#stuSave").onclick = function () {
      stu.score = $("#stuScore").value;
      stu.hukou = $("#stuHukou").value;
      stu.batch = $("#stuBatch").value;
      save(STU_KEY, stu);
      $("#stuMsg").innerHTML = "<p class='ok'>已保存，分数 " + esc(stu.score) + " / " + esc(HUKOU_OPTS.filter(function (o) { return o.v === stu.hukou; })[0].t) + "</p>";
      renderRecommend();
    };
  }

  // ---------- 模块④ 智能推荐（冲稳保） ----------
  function computeReco() {
    var sc = parseFloat(stu.score);
    if (isNaN(sc)) return null;
    var list = scores.map(function (s) {
      var g = getLine(s, stu.hukou);
      if (g.line == null) return null;
      var gap = g.line - sc;
      return { s: s, line: g.line, pred: g.pred, gap: gap, tier: tierOf(gap) };
    }).filter(Boolean);
    if (stu.batch) list = list.filter(function (r) { return r.s.b === stu.batch; });
    var groups = { 冲: [], 稳: [], 保: [] };
    list.forEach(function (r) { groups[r.tier].push(r); });
    ["冲", "稳", "保"].forEach(function (t) {
      groups[t].sort(function (a, b) { return (t === "保" ? b.gap - a.gap : a.gap - b.gap); });
    });
    return groups;
  }
  function recoRow(r) {
    var s = r.s;
    return "<div class='rk'><div class='rkn'>" + esc(s.name) + "<span class='rkg'>" + esc(s.grade || "") + "</span></div>" +
      "<div class='rkm'>" + esc(s.b) + " · " + esc(s.nature || "") + " · " + esc(s.district || "") + "</div>" +
      "<div class='rkl'>参考线 <b>" + r.line + "</b> 分<span class='gap " + (r.gap >= 0 ? "up" : "down") + "'>" + (r.gap >= 0 ? "+" : "") + r.gap + "</span></div>" +
      "<button class='mini' onclick='addWish(\"" + esc(s.name).replace(/"/g, "&quot;") + "\"," + r.line + ",\"" + r.tier + "\")'>加入志愿表</button></div>";
  }
  function renderRecommend() {
    var box = $("#reco");
    var h = "<p class='desc'>依据你填写的分数与考生类别，按「参考线 − 你的分数」自动分冲 / 稳 / 保。" +
      (scores.some(function (s) { return s.hu2026pred != null; }) ? "优先使用 2026 预测线。" : "以 " + year + " 实际录取分为基准。") + "</p>";
    if (!stu.score) {
      h += "<p class='warn'>请先在「考生信息」填写分数并保存。</p>";
      box.innerHTML = h; return;
    }
    var g = computeReco();
    if (!g) { h += "<p class='warn'>无可推荐学校（数据缺失）。</p>"; box.innerHTML = h; return; }
    var tiers = [["冲", "reach"], ["稳", "safe"], ["保", "hold"]];
    tiers.forEach(function (t) {
      var arr = g[t[0]];
      h += "<div class='tier'><div class='tier-h t-" + t[1] + "'>" + t[0] + " <span>(" + arr.length + ")</span></div>";
      if (!arr.length) h += "<p class='empty'>暂无</p>";
      else h += "<div class='rlist'>" + arr.slice(0, 40).map(recoRow).join("") + "</div>";
      h += "</div>";
    });
    box.innerHTML = h;
  }

  // ---------- 模块⑤ 探校 ----------
  function renderSchools() {
    var box = $("#schools");
    var natures = {}; var batches = {};
    scores.forEach(function (s) { if (s.nature) natures[s.nature] = 1; if (s.b) batches[s.b] = 1; });
    var h = "<div class='filters'>";
    h += "<input id='sk' placeholder='搜索学校名'>";
    h += "<select id='skBatch'><option value=''>全部批次</option>" + Object.keys(batches).map(function (b) { return "<option>" + esc(b) + "</option>"; }).join("") + "</select>";
    h += "<select id='skNature'><option value=''>全部性质</option>" + Object.keys(natures).map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("") + "</select>";
    h += "</div><div id='skList' class='sk-list'></div>";
    box.innerHTML = h;
    function draw() {
      var kw = $("#sk").value.trim(); var bsel = $("#skBatch").value; var nsel = $("#skNature").value;
      var rows = scores.filter(function (s) {
        return (!kw || s.name.indexOf(kw) >= 0) && (!bsel || s.b === bsel) && (!nsel || s.nature === nsel);
      });
      var html = rows.map(function (s) {
        return "<div class='sk'><div class='sk-n'>" + esc(s.name) + "<span>" + esc(s.grade || "") + "</span></div>" +
          "<div class='sk-m'>" + esc(s.b) + " · " + esc(s.nature || "") + " · " + esc(s.district || "") + "</div>" +
          "<div class='sk-s'>户籍/本市 " + fmtArr(s.hu2025) + " ｜ 非户籍 " + fmtArr(s.fei2025) + " ｜ 外区 " + fmtArr(s.wai2025) +
          " ｜ 2024 " + fmtArr(s.hu2024) + " ｜ 预测 " + (s.hu2026pred != null ? s.hu2026pred : "—") + " ｜ 计划 " + (s.plan2025 != null ? s.plan2025 : "—") + "</div>" +
          "<button class='mini' onclick='addWish(\"" + esc(s.name).replace(/"/g, "&quot;") + "\",0,\"\")'>加入志愿表</button></div>";
      }).join("");
      $("#skList").innerHTML = html || "<p class='empty'>无匹配</p>";
    }
    $("#sk").oninput = draw; $("#skBatch").onchange = draw; $("#skNature").onchange = draw;
    draw();
  }

  // ---------- 模块⑨ 我的志愿表 ----------
  window.addWish = function (name, line, tier) {
    if (wish.some(function (w) { return w.name === name; })) { return; }
    wish.push({ name: name, line: line, tier: tier || "" });
    save(WISH_KEY, wish); renderWish();
  };
  function renderWish() {
    var box = $("#wish");
    var h = "<p class='desc'>已加入 <b>" + wish.length + "</b> 所。可调整顺序、删除；数据存本地浏览器。</p>";
    if (!wish.length) { h += "<p class='empty'>志愿表为空，去「智能推荐」或「探校」加入学校。</p>"; box.innerHTML = h; return; }
    h += "<ol class='wlist'>";
    wish.forEach(function (w, i) {
      h += "<li><span class='wt " + (w.tier ? "wt-" + ({ "冲": "reach", "稳": "safe", "保": "hold" }[w.tier]) : "") + "'>" + (w.tier || "—") + "</span>" +
        esc(w.name) + (w.line ? " <i>" + w.line + "分</i>" : "") +
        "<span class='wx'><button class='mini' onclick='moveWish(" + i + ",-1)'>↑</button><button class='mini' onclick='moveWish(" + i + ",1)'>↓</button><button class='mini del' onclick='delWish(" + i + ")'>删</button></span></li>";
    });
    h += "</ol>";
    box.innerHTML = h;
  }
  window.delWish = function (i) { wish.splice(i, 1); save(WISH_KEY, wish); renderWish(); renderCheck(); };
  window.moveWish = function (i, d) {
    var j = i + d; if (j < 0 || j >= wish.length) return;
    var t = wish[i]; wish[i] = wish[j]; wish[j] = t; save(WISH_KEY, wish); renderWish();
  };

  // ---------- 模块⑩ 方案体检 ----------
  function renderCheck() {
    var box = $("#check");
    var h = "<p class='desc'>检查志愿梯度是否合理。</p>";
    if (!wish.length) { h += "<p class='empty'>志愿表为空，无法体检。</p>"; box.innerHTML = h; return; }
    var cnt = { 冲: 0, 稳: 0, 保: 0 };
    wish.forEach(function (w) { if (cnt[w.tier] != null) cnt[w.tier]++; });
    var warns = [];
    if (cnt.冲 === 0) warns.push("缺少「冲」档志愿，可能错失更高层次学校。");
    if (cnt.稳 === 0) warns.push("缺少「稳」档志愿，录取主力空缺。");
    if (cnt.保 === 0) warns.push("缺少「保」档志愿，存在滑档风险！");
    if (wish.length > 0 && cnt.保 < 2) warns.push("「保」档建议至少 2 所，确保兜底。");
    // 同分扎堆
    var byLine = {};
    wish.forEach(function (w) { if (w.line) byLine[w.line] = (byLine[w.line] || 0) + 1; });
    Object.keys(byLine).forEach(function (l) { if (byLine[l] >= 3) warns.push("有 " + byLine[l] + " 所志愿参考线同为 " + l + " 分，存在扎堆，建议拉开梯度。"); });
    h += "<div class='chkc'>";
    ["冲", "稳", "保"].forEach(function (t) {
      h += "<div class='chk-ct t-" + ({ "冲": "reach", "稳": "safe", "保": "hold" }[t]) + "'>" + t + "<b>" + cnt[t] + "</b></div>";
    });
    h += "</div>";
    if (!warns.length) h += "<p class='ok'>梯度结构合理，冲稳保齐全。</p>";
    else h += "<div class='warns'>" + warns.map(function (w) { return "<p class='warn'>⚠ " + esc(w) + "</p>"; }).join("") + "</div>";
    box.innerHTML = h;
  }

  // ---------- 模块⑪ 导出 ----------
  function renderExport() {
    var box = $("#export");
    var h = "<p class='desc'>导出 / 打印你的志愿方案。</p>";
    h += "<button class='btn' id='expBtn'>生成方案文本</button><button class='btn ghost' id='printBtn'>打印</button>";
    h += "<pre id='expOut' class='expout'></pre>";
    box.innerHTML = h;
    $("#expBtn").onclick = function () {
      var t = city + " 中考志愿填报方案\n";
      t += "考生：总分 " + (stu.score || "未填") + " / " + (HUKOU_OPTS.filter(function (o) { return o.v === stu.hukou; })[0] || {}).t + (stu.batch ? " / 目标批次：" + stu.batch : "") + "\n";
      t += "数据年份：" + year + "（" + (meta.src || "") + "）\n";
      t += "--------------------------------------------------\n";
      if (!wish.length) t += "（志愿表为空）\n";
      wish.forEach(function (w, i) {
        t += (i + 1) + ". [" + (w.tier || "—") + "] " + w.name + (w.line ? "  参考线 " + w.line + " 分" : "") + "\n";
      });
      t += "--------------------------------------------------\n";
      t += "体检：" + ($("#check").querySelector(".warns") ? "存在风险提示，见方案体检页" : "梯度结构合理") + "\n";
      t += "声明：本方案基于公开录取分估算，最终以官方公布为准。\n";
      $("#expOut").textContent = t;
    };
    $("#printBtn").onclick = function () { window.print(); };
  }

  // ---------- 信源 ----------
  function renderSources() {
    var box = $("#sources");
    if (!sources.length) { box.innerHTML = "<p class='empty'>暂无信源记录。</p>"; return; }
    box.innerHTML = "<ul class='src'>" + sources.map(function (s) {
      return "<li><a href='" + esc(s.url) + "' target='_blank' rel='noopener'>" + esc(s.title || s.url) + "</a></li>";
    }).join("") + "</ul>";
  }

  // ---------- 导航 ----------
  function initNav() {
    $all(".nav a").forEach(function (a) {
      a.onclick = function () {
        $all(".nav a").forEach(function (x) { x.classList.remove("on"); });
        $all(".sec").forEach(function (x) { x.classList.remove("show"); });
        a.classList.add("on");
        var id = a.getAttribute("data-t");
        var sec = $("#sec-" + id); if (sec) sec.classList.add("show");
        try { window.scrollTo(0, 0); } catch (e) {}
      };
    });
    // 默认显示第一个
    var first = $(".nav a"); if (first) first.click();
  }

  // ---------- 启动 ----------
  function start() {
    renderRules(); renderLocate(); renderStudent(); renderRecommend();
    renderSchools(); renderWish(); renderCheck(); renderExport(); renderSources();
    initNav();
    // 顶部考生信息联动
    var st = $("#topStu");
    if (st) st.innerHTML = (stu.score ? "当前：<b>" + esc(stu.score) + "</b> 分 · " + esc(HUKOU_OPTS.filter(function (o) { return o.v === stu.hukou; })[0].t) : "尚未填写考生信息");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
