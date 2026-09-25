(function () {
  "use strict";

  const DATA = window.WORD_NOVEL_DATA || { categories: {}, units: [] };
  const app = document.getElementById("app");
  const STORAGE_KEY = "word-fiction-progress-v1";
  let session = null;

  const categoryMeta = {
    required: { label: "必考词", eyebrow: "01 / CORE WORDS", description: "把必考词放进一篇篇可以读下去的文字故事里。当前版本已收录单词表中的全部 Unit。" },
    basic: { label: "基础词", eyebrow: "02 / FOUNDATION", description: "基础词内容将在后续资料补充后开放。" },
    advanced: { label: "超纲词", eyebrow: "03 / BEYOND", description: "超纲词内容将在后续资料补充后开放。" }
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }

  function progress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (_) { return {}; }
  }

  function saveProgress(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function findUnit(id) { return (DATA.units || []).find(unit => String(unit.id) === String(id)); }

  function route() {
    const raw = (location.hash || "#home").slice(1);
    const parts = raw.split("/");
    if (parts[0] === "category") return { type: "category", id: parts[1] || "required" };
    if (parts[0] === "unit") return { type: "unit", id: parts[1] || "1" };
    return { type: "home" };
  }

  function render() {
    const r = route();
    if (r.type === "home") return renderHome();
    if (r.type === "category") return renderCategory(r.id);
    return renderUnit(r.id);
  }

  function renderHome() {
    const requiredCount = DATA.units?.length || 0;
    const totalWords = (DATA.units || []).reduce((sum, u) => sum + (u.words?.length || 0), 0);
    app.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">VOCABULARY FICTION</div>
          <h1>把单词，<em>读成</em><br>一段人生。</h1>
        </div>
        <div class="hero-lede">
          这里不是单词表的终点，而是故事的入口。选择一个词库，再从一个 Unit 开始，让词义跟着剧情一起被记住。
          <div class="hero-note">先读故事，再做选择。错词在结尾统一复盘。</div>
        </div>
      </section>
      <section>
        <div class="section-head"><h2>选择你的词库</h2><div class="rule"></div><p>SELECT A COLLECTION</p></div>
        <div class="category-grid">
          ${categoryCard("required", `已收录 ${requiredCount} 个 Unit · ${totalWords} 个词`, "打开目录", "必")}
          ${categoryCard("basic", "资料待加入", "即将开放", "基")}
          ${categoryCard("advanced", "资料待加入", "即将开放", "超")}
        </div>
      </section>
    `;
  }

  function categoryCard(id, meta, action, stamp) {
    const item = categoryMeta[id];
    const disabled = id !== "required";
    return `<a class="category-card ${disabled ? "is-disabled" : ""}" ${disabled ? "aria-disabled=\"true\"" : `href="#category/${id}"`}>
      <span class="card-arrow">${disabled ? "·" : "↗"}</span>
      <div><div class="card-kicker">${esc(item.eyebrow)}</div><div class="card-title">${esc(item.label)}</div></div>
      <div class="card-meta">${esc(meta)}<br><span>${esc(action)}</span></div>
      <span class="card-stamp" aria-hidden="true">${esc(stamp)}</span>
    </a>`;
  }

  function renderCategory(id) {
    const item = categoryMeta[id] || categoryMeta.required;
    if (id !== "required") {
      app.innerHTML = `<section class="catalog-head"><div><div class="eyebrow">${esc(item.eyebrow)}</div><h1>${esc(item.label)}</h1></div><p>${esc(item.description)}</p></section><section class="empty-state"><h2>这一页还在等待下一份词表</h2><p>先返回首页，进入已经收录的必考词目录。</p><p style="margin-top:22px"><a class="text-link" href="#category/required">打开必考词目录 ↗</a></p></section>`;
      return;
    }
    const units = DATA.units || [];
    const saved = progress();
    app.innerHTML = `<section class="catalog-head"><div><div class="eyebrow">${esc(item.eyebrow)}</div><h1>${esc(item.label)}</h1><div class="catalog-info"><span><strong>${units.length}</strong> UNITS</span><span><strong>${units.reduce((n,u)=>n+(u.words?.length||0),0)}</strong> WORDS</span></div></div><p>${esc(item.description)}<br><br>每个 Unit 都会以纯文字剧情展开，选择单词后继续阅读，最后统一查看错词。</p></section><section class="unit-grid">${units.map(unitCard).join("")}</section>`;
  }

  function unitCard(unit) {
    const saved = progress()[unit.id];
    const status = saved ? `已完成 · ${saved.score}/${saved.total}` : "尚未开始";
    return `<a class="unit-card" href="#unit/${unit.id}"><div><div class="unit-num">UNIT ${String(unit.id).padStart(2, "0")}</div><h3>${esc(unit.title)}</h3><div class="unit-theme">${esc(unit.theme)}</div></div><div class="unit-bottom"><span>${unit.words.length} 个词</span><span class="unit-status ${saved ? "" : "pending"}">${esc(status)}</span></div></a>`;
  }

  function renderUnit(id) {
    const unit = findUnit(id);
    if (!unit) { location.hash = "#category/required"; return; }
    const saved = progress()[unit.id];
    const existing = session && session.unitId === unit.id ? session : null;
    const mode = existing ? "play" : (saved && saved.showResult ? "result" : "intro");
    const body = mode === "play" ? renderPlay(unit, existing) : mode === "result" ? renderResult(unit, saved) : renderIntro(unit, saved);
    app.innerHTML = `<section class="reader-head"><div><div class="breadcrumbs"><a href="#category/required">必考词目录</a> / UNIT ${String(unit.id).padStart(2, "0")}</div><h1>${esc(unit.title)}</h1></div><div class="reader-side"><strong>${unit.words.length}</strong>个词 · ${esc(unit.theme)}</div></section><div class="story-wrap">${body}</div>`;
    bindUnitEvents(unit);
  }

  function renderIntro(unit, saved) {
    return `<section class="story-intro"><div class="story-label">${esc(unit.genre)} / TEXT FICTION</div><h2>${esc(unit.subtitle)}</h2><p>${esc(unit.intro)}</p><div class="story-actions"><button class="button primary" data-action="start">${saved ? "重新开始本 Unit" : "开始阅读"} ↗</button><a class="button subtle" href="#category/required">返回目录</a></div></section><details class="word-bank"><summary>查看本单元词库（${unit.words.length} 个词）</summary><div class="word-grid">${unit.words.map(w => `<div class="word-chip"><strong>${esc(w.word)}</strong><span>${esc(w.meaning || "单词表释义")}</span></div>`).join("")}</div></details>`;
  }

  function renderPlay(unit, s) {
    const step = unit.steps[s.index];
    const done = Boolean(s.selected);
    const progressWidth = Math.round(((s.index + (done ? 1 : 0)) / unit.steps.length) * 100);
    return `<section class="story-intro"><div class="story-label">${esc(unit.genre)} / ${String(s.index + 1).padStart(2, "0")} OF ${String(unit.steps.length).padStart(2, "0")}</div><p>${esc(unit.playNote || "选择一个最符合剧情的英文词。无论选什么，故事都会继续。")}</p></section><section class="story-panel"><div class="progress-row"><span>剧情进度</span><span>${s.index + 1} / ${unit.steps.length}</span></div><div class="progress-track"><div class="progress-fill" style="width:${progressWidth}%"></div></div><div class="scene" style="margin-top:28px">${esc(step.scene)}</div><div class="prompt">${esc(step.prompt)}</div>${done ? `<div class="selected-note"><span>你的选择已记录，剧情继续。</span><strong>${esc(s.selected)}</strong></div><div class="story-actions"><button class="button primary" data-action="next">继续阅读 ↗</button></div>` : `<div class="choice-grid">${step.options.map((word, i) => `<button class="choice" data-choice="${esc(word)}"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span class="choice-word">${esc(word)}</span></button>`).join("")}</div>`}</section>`;
  }

  function renderResult(unit, result) {
    const wrong = result.wrong || [];
    return `<section class="story-intro"><div class="story-label">${esc(unit.genre)} / UNIT COMPLETE</div><p>${esc(unit.ending || "你完成了这一段故事。真正需要记住的词，会在这里重新出现。")}</p></section><section class="story-panel"><div class="result-panel"><div class="result-mark">${wrong.length ? "复" : "✓"}</div><h2>Unit ${String(unit.id).padStart(2,"0")} 完成</h2><div class="score">${result.score} / ${result.total} <small>正确</small></div>${wrong.length ? `<div class="wrong-box"><h3>这一次，需要复习的词</h3><ul class="wrong-list">${wrong.map(w => `<li><strong>${esc(w.word)}</strong><span>${esc(w.meaning || "请回看单词表释义")}</span></li>`).join("")}</ul></div>` : `<p class="perfect">这一轮没有错词，做得很好。</p>`}<div class="story-actions" style="justify-content:center;margin-top:30px">${wrong.length ? `<button class="button primary" data-action="review">复习错词</button>` : ""}<button class="button" data-action="restart">再读一次</button><a class="button subtle" href="#category/required">回到目录</a></div></div></section>`;
  }

  function bindUnitEvents(unit) {
    document.querySelectorAll("[data-action='start']").forEach(btn => btn.addEventListener("click", () => { session = { unitId: unit.id, index: 0, answers: [], selected: null }; render(); }));
    document.querySelectorAll("[data-choice]").forEach(btn => btn.addEventListener("click", () => { session.selected = btn.dataset.choice; session.answers.push({ selected: session.selected, answer: unit.steps[session.index].answer }); render(); }));
    document.querySelectorAll("[data-action='next']").forEach(btn => btn.addEventListener("click", () => {
      if (session.index < unit.steps.length - 1) { session.index += 1; session.selected = null; render(); }
      else finish(unit);
    }));
    document.querySelectorAll("[data-action='restart']").forEach(btn => btn.addEventListener("click", () => { session = { unitId: unit.id, index: 0, answers: [], selected: null }; render(); }));
    document.querySelectorAll("[data-action='review']").forEach(btn => btn.addEventListener("click", () => { const saved = progress()[unit.id]; if (!saved || !saved.wrong.length) return; session = { unitId: unit.id, index: 0, answers: [], selected: null, review: saved.wrong.map(w => w.word) }; renderReview(unit, saved.wrong); }));
  }

  function finish(unit) {
    const answers = session.answers;
    const wrong = answers.filter(a => a.selected !== a.answer).map(a => unit.words.find(w => w.word === a.answer) || { word: a.answer, meaning: "" });
    const result = { score: answers.length - wrong.length, total: answers.length, wrong, showResult: true, finishedAt: Date.now() };
    const all = progress(); all[unit.id] = result; saveProgress(all); session = null; render();
  }

  function renderReview(unit, wrong) {
    app.innerHTML = `<section class="reader-head"><div><div class="breadcrumbs"><a href="#category/required">必考词目录</a> / UNIT ${String(unit.id).padStart(2, "0")}</div><h1>错词复习</h1></div><div class="reader-side"><strong>${wrong.length}</strong>个词需要回看</div></section><div class="story-wrap"><section class="story-intro"><div class="story-label">REVIEW / ${esc(unit.title)}</div><h2>把遗漏的线索，再看一遍。</h2><p>这一页只保留本次没有选对的词。先看英文，再看释义；复习完成后可以回到 Unit 目录。</p></section><section class="story-panel"><ul class="wrong-list">${wrong.map(w => `<li><strong>${esc(w.word)}</strong><span>${esc(w.meaning || "请回看单词表释义")}</span></li>`).join("")}</ul><div class="story-actions"><a class="button primary" href="#category/required">回到 Unit 目录 ↗</a><a class="button subtle" href="#unit/${unit.id}">返回本 Unit</a></div></section></div>`;
  }

  window.addEventListener("hashchange", () => { session = null; render(); });
  render();
})();
