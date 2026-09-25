(function () {
  "use strict";

  const DATA = window.WORD_NOVEL_DATA || { categories: {}, units: [] };
  const app = document.getElementById("app");
  const STORAGE_KEY = "word-fiction-progress-v4";
  const THEME_STORAGE_KEY = "word-fiction-theme-v2";
  const DEFAULT_THEME = {
    bg: "#fff8f1",
    panel: "#fffdf9",
    text: "#3b2d31",
    accent: "#d9878d",
    gold: "#b8896b"
  };
  const THEME_PRESETS = {
    default: DEFAULT_THEME,
    sage: { bg: "#f1f5ee", panel: "#fbfdf9", text: "#304039", accent: "#7fa18a", gold: "#aa8967" },
    sky: { bg: "#f2f5f8", panel: "#fcfdff", text: "#30404d", accent: "#7e9fbd", gold: "#ae8e70" },
    coffee: { bg: "#f5ece3", panel: "#fffaf5", text: "#44332d", accent: "#b77e61", gold: "#a87750" }
  };
  let themeState = readTheme();
  let session = null;

  function validHex(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  }

  function readTheme() {
    try {
      const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || "{}");
      return {
        bg: validHex(stored.bg, DEFAULT_THEME.bg),
        panel: validHex(stored.panel, DEFAULT_THEME.panel),
        text: validHex(stored.text, DEFAULT_THEME.text),
        accent: validHex(stored.accent, DEFAULT_THEME.accent),
        gold: validHex(stored.gold, DEFAULT_THEME.gold)
      };
    } catch (_) {
      return Object.assign({}, DEFAULT_THEME);
    }
  }

  function hexRgb(value) {
    const hex = validHex(value, "#000000").slice(1);
    return parseInt(hex.slice(0, 2), 16) + ", " + parseInt(hex.slice(2, 4), 16) + ", " + parseInt(hex.slice(4, 6), 16);
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const textRgb = hexRgb(theme.text);
    const accentRgb = hexRgb(theme.accent);
    const goldRgb = hexRgb(theme.gold);
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--bg-soft", theme.panel);
    root.style.setProperty("--panel", "rgba(" + hexRgb(theme.panel) + ", .88)");
    root.style.setProperty("--panel-strong", theme.panel);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--muted", "color-mix(in srgb, " + theme.text + " 68%, " + theme.bg + ")");
    root.style.setProperty("--muted-2", "color-mix(in srgb, " + theme.text + " 44%, " + theme.bg + ")");
    root.style.setProperty("--red", theme.accent);
    root.style.setProperty("--red-deep", theme.accent);
    root.style.setProperty("--gold", theme.gold);
    root.style.setProperty("--red-rgb", accentRgb);
    root.style.setProperty("--red-deep-rgb", accentRgb);
    root.style.setProperty("--gold-rgb", goldRgb);
    root.style.setProperty("--text-rgb", textRgb);
    root.style.setProperty("--line", "rgba(" + textRgb + ", .14)");
    root.style.setProperty("--line-strong", "rgba(" + textRgb + ", .25)");
  }

  function saveTheme() {
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeState)); } catch (_) {}
  }

  function syncThemeInputs() {
    document.querySelectorAll("[data-theme-color]").forEach(function (input) {
      const key = input.dataset.themeColor;
      if (themeState[key]) input.value = themeState[key];
    });
  }

  function setTheme(nextTheme) {
    themeState = {
      bg: validHex(nextTheme.bg, DEFAULT_THEME.bg),
      panel: validHex(nextTheme.panel, DEFAULT_THEME.panel),
      text: validHex(nextTheme.text, DEFAULT_THEME.text),
      accent: validHex(nextTheme.accent, DEFAULT_THEME.accent),
      gold: validHex(nextTheme.gold, DEFAULT_THEME.gold)
    };
    applyTheme(themeState);
    saveTheme();
    syncThemeInputs();
  }

  function closeThemePanel() {
    const toggle = document.getElementById("theme-toggle");
    const panel = document.getElementById("theme-panel");
    if (!toggle || !panel) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function bindThemeControls() {
    const toggle = document.getElementById("theme-toggle");
    const panel = document.getElementById("theme-panel");
    if (!toggle || !panel) return;
    syncThemeInputs();
    toggle.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });
    document.getElementById("theme-close").addEventListener("click", closeThemePanel);
    panel.querySelectorAll("[data-theme-preset]").forEach(function (button) {
      button.addEventListener("click", function () {
        setTheme(THEME_PRESETS[button.dataset.themePreset] || DEFAULT_THEME);
      });
    });
    panel.querySelectorAll("[data-theme-color]").forEach(function (input) {
      input.addEventListener("input", function () {
        const next = Object.assign({}, themeState);
        next[input.dataset.themeColor] = input.value;
        setTheme(next);
      });
    });
    panel.querySelector("[data-theme-reset]").addEventListener("click", function () {
      setTheme(DEFAULT_THEME);
    });
    document.addEventListener("click", function (event) {
      const tools = document.querySelector(".theme-tools");
      if (!panel.hidden && tools && !tools.contains(event.target)) closeThemePanel();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeThemePanel();
    });
  }

  applyTheme(themeState);

  const categoryMeta = {
    required: {
      label: "必考词",
      eyebrow: "01 / CORE WORDS",
      description: "每个 Unit 都是一篇完整的大剧情。"
    },
    basic: {
      label: "基础词",
      eyebrow: "02 / FOUNDATION",
      description: "基础词也按 Unit 整理成连续的故事剧情。"
    },
    advanced: {
      label: "超纲词",
      eyebrow: "03 / BEYOND",
      description: "超纲词按首字母整理，每个字母组都是一篇完整的大剧情。"
    }
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch];
    });
  }

  function progress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveProgress(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (_) {}
  }

  function activeProgressKey(category, id) {
    return "active:" + progressKey(category, id);
  }

  function isLetterGroup(category) {
    return category === "advanced";
  }

  function segmentLabel(category, id) {
    return isLetterGroup(category) ? "字母 " + id : "Unit " + id;
  }

  function segmentNoun(category) {
    return isLetterGroup(category) ? "本字母" : "本 Unit";
  }

  function wordBankLabel(category, id) {
    if (isLetterGroup(category)) return "超纲词" + id + "单词表";
    return (categoryMeta[category] ? categoryMeta[category].label : category) + "Unit" + id + "单词表";
  }

  function sameSegment(left, category, id) {
    return left && left.category === category && String(left.unitId).toLowerCase() === String(id).toLowerCase();
  }

  function readActiveSession(category, id) {
    const stored = progress()[activeProgressKey(category, id)];
    if (!sameSegment(stored, category, id)) return null;
    return {
      category: category,
      unitId: stored.unitId,
      index: Math.max(0, Number(stored.index) || 0),
      answers: Array.isArray(stored.answers) ? stored.answers.slice() : []
    };
  }

  function persistSession() {
    if (!session || !session.category || session.unitId === undefined) return;
    const all = progress();
    all[activeProgressKey(session.category, session.unitId)] = {
      category: session.category,
      unitId: session.unitId,
      index: session.index,
      answers: Array.isArray(session.answers) ? session.answers.slice() : []
    };
    saveProgress(all);
  }

  function clearActiveSession(category, id) {
    const all = progress();
    delete all[activeProgressKey(category, id)];
    saveProgress(all);
  }

  function findUnit(id) {
    return (DATA.units || []).find(function (unit) {
      return String(unit.id) === String(id);
    });
  }

  function collectionData(category) {
    const key = category || "required";
    if (DATA.collections && DATA.collections[key]) return DATA.collections[key];
    if (key === "required") return { label: "必考词", units: DATA.units || [] };
    return { label: categoryMeta[key] ? categoryMeta[key].label : key, units: [] };
  }

  function collectionUnits(category) {
    return collectionData(category).units || [];
  }

  function progressKey(category, id) {
    return (category || "required") + ":" + id;
  }

  function findUnitInCollection(id, category) {
    return collectionUnits(category).find(function (unit) {
      return String(unit.id).toLowerCase() === String(id).toLowerCase();
    });
  }

  function route() {
    const raw = (location.hash || "#home").slice(1);
    const parts = raw.split("/");
    if (parts[0] === "category") return { type: "category", id: parts[1] || "required" };
    if (parts[0] === "unit") {
      if (categoryMeta[parts[1]]) {
        return { type: "unit", category: parts[1], id: parts[2] || "1", view: parts[3] || "" };
      }
      return { type: "unit", category: "required", id: parts[1] || "1", view: parts[2] || "" };
    }
    return { type: "home" };
  }

  function render() {
    const current = route();
    if (current.type === "home") return renderHome();
    if (current.type === "category") return renderCategory(current.id);
    return renderUnit(current.category, current.id, current.view);
  }

  function renderHome() {
    const requiredUnits = collectionUnits("required");
    const basicUnits = collectionUnits("basic");
    const advancedUnits = collectionUnits("advanced");
    const requiredCount = requiredUnits.length;
    const basicCount = basicUnits.length;
    const requiredWords = requiredUnits.reduce(function (sum, unit) {
      return sum + (unit.words ? unit.words.length : 0);
    }, 0);
    const basicWords = basicUnits.reduce(function (sum, unit) {
      return sum + (unit.words ? unit.words.length : 0);
    }, 0);
    const advancedWords = advancedUnits.reduce(function (sum, unit) {
      return sum + (unit.words ? unit.words.length : 0);
    }, 0);
    app.innerHTML = [
      '<section class="hero hero-cover-section">',
      '<figure class="hero-cover"><img src="./home-cover.png" alt="在小说里学单词的故事学习场景：人物、书本、单词卡片与城市生活交织在一起"><figcaption><span>VOCABULARY FICTION</span><span>让故事带你遇见更大的世界</span></figcaption></figure>',
      '<div class="hero-caption"><div class="hero-copy"><div class="eyebrow">STORY-BASED VOCABULARY</div>',
      '<h1>把单词，<em>读成</em><br>一段人生。</h1><p class="hero-note">每个词，都是故事里下一步要做的事。</p></div>',
      '<div class="hero-lede">这里不是单词表的终点，而是故事的入口。选择一个词库，再从一个 Unit 或字母组开始，让词义跟着剧情一起被记住。</div></div>',
      '</section>',
      '<section><div class="section-head"><h2>选择你的词库</h2><div class="rule"></div><p>SELECT A COLLECTION</p></div>',
      '<div class="category-grid">',
      categoryCard("required", "已收录 " + requiredCount + " 个 Unit · " + requiredWords + " 个词", "打开目录", "必"),
      categoryCard("basic", "已收录 " + basicCount + " 个 Unit · " + basicWords + " 个词", "打开目录", "基"),
      categoryCard(
        "advanced",
        advancedUnits.length ? "已收录 " + advancedUnits.length + " 个字母组 · " + advancedWords + " 个词" : "资料待加入",
        advancedUnits.length ? "打开目录" : "即将开放",
        "超"
      ),
      "</div></section>"
    ].join("");
  }

  function categoryCard(id, meta, action, stamp) {
    const item = categoryMeta[id];
    const disabled = !collectionUnits(id).length;
    return '<a class="category-card ' + (disabled ? "is-disabled" : "") + '" ' +
      (disabled ? 'aria-disabled="true"' : 'href="#category/' + id + '"') + '>' +
      '<span class="card-arrow">' + (disabled ? "·" : "↗") + "</span>" +
      '<div><div class="card-kicker">' + esc(item.eyebrow) + '</div><div class="card-title">' + esc(item.label) + "</div></div>" +
      '<div class="card-meta">' + esc(meta) + "<br><span>" + esc(action) + "</span></div>" +
      '<span class="card-stamp" aria-hidden="true">' + esc(stamp) + "</span></a>";
  }

  function renderCategory(id) {
    const item = categoryMeta[id] || categoryMeta.required;
    const units = collectionUnits(id);
    if (!units.length) {
      app.innerHTML =
        '<section class="catalog-head"><div><div class="eyebrow">' + esc(item.eyebrow) +
        "</div><h1>" + esc(item.label) + "</h1></div><p>" + esc(item.description) +
        '</p></section><section class="empty-state"><h2>这一页还在等待下一份词表</h2>' +
        '<p>先返回首页，进入已经收录的词库目录。</p><p style="margin-top:22px">' +
        '<a class="text-link" href="#category/required">打开必考词目录 ↗</a></p></section>';
      return;
    }

    const totalWords = units.reduce(function (sum, unit) {
      return sum + (unit.words ? unit.words.length : 0);
    }, 0);
    app.innerHTML =
      '<section class="catalog-head"><div><div class="eyebrow">' + esc(item.eyebrow) +
      "</div><h1>" + esc(item.label) + '</h1><div class="catalog-info"><span><strong>' +
      units.length + "</strong> " + (isLetterGroup(id) ? "LETTER GROUPS" : "UNITS") + "</span><span><strong>" + totalWords +
      '</strong> WORDS</span></div></div><p>' + esc(item.description) +
      "<br><br>" + (isLetterGroup(id) ? "进入字母组后先阅读完整的故事开场，再沿着剧情连续选择单词。" : "进入 Unit 后先阅读完整的故事开场，再沿着剧情连续选择单词。") + "点击后下一段剧情会立即出现。</p></section>" +
      '<section class="unit-grid">' + units.map(function (unit) { return unitCard(unit, id); }).join("") + "</section>";
  }

  function unitCard(unit, category) {
    const saved = progress()[progressKey(category, unit.id)];
    const active = readActiveSession(category, unit.id);
    const activeChapter = active ? chapterFor(unit, active.index) : null;
    const status = active
      ? activeChapter
        ? "第 " + activeChapter.number + " 章 · " + (active.index - activeChapter.start + 1) + "/" + activeChapter.count
        : "进行中 · " + Math.min(active.index + 1, unit.steps.length) + "/" + unit.steps.length
      : saved ? "上次完成 · " + saved.score + "/" + saved.total : "尚未开始";
    const wordCount = unit.words ? unit.words.length : 0;
    const nodeCount = unit.steps ? unit.steps.length : wordCount;
    const chapterNote = unit.chapterPlan ? " · " + unit.chapterPlan.length + " 章" : "";
    const href = category === "required" ? "#unit/" + unit.id : "#unit/" + category + "/" + unit.id;
    const cardLabel = isLetterGroup(category) ? "LETTER " + String(unit.id).toUpperCase() : "UNIT " + String(unit.id).padStart(2, "0");
    return '<a class="unit-card" href="' + href + '"><div><div class="unit-num">' +
      cardLabel + "</div><h3>" + esc(unit.title) +
      '</h3><div class="unit-theme">' + esc(unit.theme) +
      '</div></div><div class="unit-bottom"><span>' + wordCount + " 个词 · " +
      nodeCount + ' 个连续选择' + chapterNote + '</span><span class="unit-status ' + (saved ? "" : "pending") +
      '">' + esc(status) + "</span></div></a>";
  }

  function chapterFor(unit, index) {
    if (!unit || !Array.isArray(unit.chapterPlan)) return null;
    return unit.chapterPlan.find(function (chapter) {
      return index >= chapter.start && index < chapter.end;
    }) || unit.chapterPlan[unit.chapterPlan.length - 1];
  }

  function renderUnit(category, id, view) {
    category = category || "required";
    const unit = findUnitInCollection(id, category);
    if (!unit) {
      location.hash = "#category/" + category;
      return;
    }
    const saved = progress()[progressKey(category, unit.id)];
    const existing = sameSegment(session, category, unit.id) ? session : null;
    const active = existing || readActiveSession(category, unit.id);
    const mode = existing ? "play" : (view === "intro" ? "intro" : (saved && saved.showResult ? "result" : "intro"));
    const unitBase = category === "required" ? "#unit/" + unit.id : "#unit/" + category + "/" + unit.id;
    const body = mode === "play"
      ? renderPlay(unit, existing)
      : mode === "result"
        ? renderResult(unit, saved, category)
        : renderIntro(unit, saved, category, active);
    const segment = segmentLabel(category, unit.id);
    const returnText = isLetterGroup(category) ? "返回本字母剧情介绍 ↗" : "返回本 Unit 剧情介绍 ↗";

    app.innerHTML =
      '<section class="reader-head"><div><div class="breadcrumbs"><a href="#category/' + category + '">' +
      esc(categoryMeta[category] ? categoryMeta[category].label : category) + '目录</a> / ' +
      esc(segment) + '</div><h1>' + esc(unit.title) +
      '</h1></div><div class="reader-side"><div class="reader-count"><span>单词数量</span><strong>' + unit.words.length +
      '</strong></div><a class="reader-intro-link" data-action="intro" href="' + unitBase + '/intro">' + returnText + '</a></div></section>' +
      '<div class="story-wrap">' + body + "</div>";
    bindUnitEvents(unit, category);
  }

  function renderIntro(unit, saved, category, active) {
    const label = isLetterGroup(category)
      ? "LETTER " + String(unit.id).toUpperCase() + " / LONGFORM STORY"
      : "UNIT " + String(unit.id).padStart(2, "0") + " / LONGFORM STORY";
    const continueText = active ? "继续剧情" : (saved ? "重新开始" + segmentNoun(category) : "进入剧情");
    return '<section class="story-intro"><div class="story-label">' + label + "</div><h2>" +
      esc(unit.subtitle) + '</h2><div class="story-opening">' + paragraphMarkup(unit.intro) + "</div>" +
      '<div class="story-spec"><span><strong>' + unit.words.length +
      "</strong> 个目标词</span><span><strong>" + unit.steps.length +
      '</strong> 个连续选择</span><span>' + (unit.chapterPlan ? unit.chapterPlan.length + ' 个连续章节' : '一个完整剧情') + '</span></div>' +
      (unit.chapterPlan ? '<section class="chapter-roadmap"><div class="chapter-roadmap-head"><span>STORY ROUTE</span><strong>12 章 · 每章 62 个词</strong></div><div class="chapter-roadmap-list">' +
        unit.chapterPlan.map(function (chapter) {
          return '<button type="button" class="chapter-roadmap-item" data-action="chapter" data-chapter="' + chapter.number + '" aria-label="进入第 ' + chapter.number + ' 章：' + esc(chapter.title) + '"><span>' + String(chapter.number).padStart(2, "0") + '</span><div><strong>' + esc(chapter.title) + '</strong><small>' + chapter.count + ' 个连续选择</small></div></button>';
        }).join("") + '</div></section>' : '') +
      '<div class="story-actions"><button class="button primary" data-action="start">' +
      continueText +
      ' ↗</button><a class="button subtle" href="#category/' + category + '">返回目录</a></div></section>' +
      '<details class="word-bank word-bank-featured"><summary><span class="word-bank-summary-copy"><span class="word-bank-kicker">STUDY INDEX</span><strong>' + esc(wordBankLabel(category, unit.id)) +
      '</strong><small>查看本' + esc(isLetterGroup(category) ? "字母组" : "Unit") + '的全部单词、音标与中文释义</small></span><span class="word-bank-summary-meta"><strong>' + unit.words.length +
      '</strong><span>个词</span><b>展开</b></span></summary><div class="word-bank-head"><span>' + esc(segmentNoun(category)) + '完整词表</span><strong>' +
      unit.words.length + ' 个词</strong></div><div class="word-grid">' +
      unit.words.map(function (word) {
        return '<div class="word-chip"><div class="word-key"><strong>' + esc(word.word) +
          '</strong><span class="word-phonetic">' + esc(word.phonetic || "") +
          '</span></div><span class="word-meaning">' + esc(word.meaning || "单词表释义") + "</span></div>";
      }).join("") + "</div></details>";
  }

  function paragraphMarkup(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map(function (paragraph) {
        return '<p>' + esc(paragraph).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  function renderPlay(unit, currentSession) {
    const step = unit.steps[currentSession.index];
    const selected = currentSession.answers[currentSession.index];
    const progressWidth = Math.round(((currentSession.index + 1) / unit.steps.length) * 100);
    const chapter = chapterFor(unit, currentSession.index);
    const chapterIndex = chapter ? currentSession.index - chapter.start + 1 : 0;
    const chapterBar = chapter
      ? '<div class="chapter-progress"><span>第 ' + chapter.number + ' 章 · ' + esc(chapter.title) + '</span><span>本章 ' + chapterIndex + ' / ' + chapter.count + ' · 总进度 ' + (currentSession.index + 1) + ' / ' + unit.steps.length + '</span></div>'
      : '';
    const chapterOpening = chapter && currentSession.index === chapter.start
      ? '<div class="chapter-intro"><span>CHAPTER ' + String(chapter.number).padStart(2, "0") + '</span><h2>' + esc(chapter.title) + '</h2><p>' + esc(chapter.intro) + '</p></div>'
      : '';
    const choices = step.options.map(function (word, optionIndex) {
      const selectedClass = selected === word ? " is-selected" : "";
      return '<button class="choice' + selectedClass + '" data-choice="' + esc(word) +
        '" aria-label="选择 ' + esc(word) + '" aria-pressed="' + (selected === word ? "true" : "false") + '">' +
        '<span class="choice-letter">' + String.fromCharCode(65 + optionIndex) + ".</span>" +
        '<span class="choice-word">' + esc(word) + "</span></button>";
    }).join("");
    const backButton = currentSession.index > 0
      ? '<button class="back-button" data-action="back">← 上一步</button>'
      : "";

    return '<section class="story-panel reading-panel">' + chapterBar + '<div class="progress-row"><span>' +
      (chapter ? "整体剧情进度" : (currentSession.index + 1) + " / " + unit.steps.length) +
      '</span></div><div class="progress-track"><div class="progress-fill" style="width:' +
      progressWidth + '%"></div>' + chapterOpening + '<div class="scene">' + esc(step.scene) +
      '</div><div class="choice-grid" aria-label="剧情选择">' + choices + '</div><div class="play-footer">' +
      backButton + "</div></section>";
  }

  function renderResult(unit, result, category) {
    const wrong = result.wrong || [];
    const wrongMarkup = wrong.map(function (word) {
      return '<li><strong>' + esc(word.word) + "</strong><span>" +
        esc(word.meaning || "请回看单词表释义") + "</span></li>";
    }).join("");
    return '<section class="story-intro"><div class="story-label">' +
      esc(unit.genre) + " / " + (isLetterGroup(category) ? "LETTER COMPLETE" : "UNIT COMPLETE") + "</div><p>" + esc(unit.ending || "你完成了这一段故事。") +
      '</p></section><section class="story-panel"><div class="result-panel"><div class="result-mark">' +
      (wrong.length ? "复" : "✓") + "</div><h2>" + esc(segmentLabel(category, unit.id)) +
      " 完成</h2><div class=\"score\">" + result.score + " / " + result.total +
      ' <small>正确</small></div>' + (wrong.length
        ? '<div class="wrong-box"><h3>本轮需要复习的词</h3><ul class="wrong-list">' + wrongMarkup + "</ul></div>"
        : '<p class="perfect">这一轮没有错词，做得很好。</p>') +
      '<div class="story-actions" style="justify-content:center;margin-top:30px">' +
      (wrong.length ? '<button class="button primary" data-action="review">复习错词</button>' : "") +
      '<button class="button" data-action="restart">再读一次</button>' +
      '<a class="button subtle" href="#category/' + category + '">回到目录</a></div></div></section>';
  }

  function bindUnitEvents(unit, category) {
    document.querySelectorAll("[data-action='intro']").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        persistSession();
        session = null;
        const introHash = category === "required" ? "#unit/" + unit.id + "/intro" : "#unit/" + category + "/" + unit.id + "/intro";
        if (location.hash === introHash) render();
        else location.hash = introHash;
      });
    });

    document.querySelectorAll("[data-action='chapter']").forEach(function (button) {
      button.addEventListener("click", function () {
        const chapterNumber = Number(button.dataset.chapter);
        const chapter = (unit.chapterPlan || []).find(function (item) {
          return item.number === chapterNumber;
        });
        if (!chapter) return;
        const stored = readActiveSession(category, unit.id);
        const answers = stored && Array.isArray(stored.answers) ? stored.answers.slice() : [];
        session = { category: category, unitId: unit.id, index: chapter.start, answers: answers };
        persistSession();
        render();
      });
    });

    document.querySelectorAll("[data-action='start']").forEach(function (button) {
      button.addEventListener("click", function () {
        session = readActiveSession(category, unit.id) || { category: category, unitId: unit.id, index: 0, answers: [] };
        persistSession();
        render();
      });
    });

    document.querySelectorAll("[data-choice]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!session) return;
        session.answers[session.index] = button.dataset.choice;
        if (session.index >= unit.steps.length - 1) {
          finish(unit, category);
          return;
        }
        session.index += 1;
        persistSession();
        render();
      });
    });

    document.querySelectorAll("[data-action='back']").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!session || session.index <= 0) return;
        session.index -= 1;
        persistSession();
        render();
      });
    });

    document.querySelectorAll("[data-action='restart']").forEach(function (button) {
      button.addEventListener("click", function () {
        clearActiveSession(category, unit.id);
        session = { category: category, unitId: unit.id, index: 0, answers: [] };
        persistSession();
        render();
      });
    });

    document.querySelectorAll("[data-action='review']").forEach(function (button) {
      button.addEventListener("click", function () {
        const saved = progress()[progressKey(category, unit.id)];
        if (saved && saved.wrong && saved.wrong.length) renderReview(unit, saved.wrong, category);
      });
    });
  }

  function finish(unit, category) {
    const answers = session.answers;
    const wrong = unit.steps.map(function (step, index) {
      if (answers[index] === step.answer) return null;
      const word = unit.words.find(function (item) {
        return item.word === step.answer;
      });
      return { word: step.answer, meaning: word ? word.meaning : "" };
    }).filter(Boolean);
    const result = {
      score: unit.steps.length - wrong.length,
      total: unit.steps.length,
      wrong: wrong,
      showResult: true,
      finishedAt: Date.now()
    };
    const all = progress();
    all[progressKey(category, unit.id)] = result;
    delete all[activeProgressKey(category, unit.id)];
    saveProgress(all);
    session = null;
    render();
  }

  function renderReview(unit, wrong, category) {
    const unitBase = category === "required" ? "#unit/" + unit.id : "#unit/" + category + "/" + unit.id;
    app.innerHTML =
      '<section class="reader-head"><div><div class="breadcrumbs"><a href="#category/' + category + '">' +
      esc(categoryMeta[category] ? categoryMeta[category].label : category) + '目录</a> / ' +
      esc(segmentLabel(category, unit.id)) + '</div><h1>错词复习</h1></div><div class="reader-side"><strong>' +
      wrong.length + '</strong><span>个词需要回看</span></div></section><div class="story-wrap">' +
      '<section class="story-intro"><div class="story-label">REVIEW / ' + esc(unit.title) +
      '</div><h2>把遗漏的线索，再看一遍。</h2><p>以下是本轮没有选对的目标词。</p></section>' +
      '<section class="story-panel"><ul class="wrong-list">' +
      wrong.map(function (word) {
        return '<li><strong>' + esc(word.word) + "</strong><span>" +
          esc(word.meaning || "请回看单词表释义") + "</span></li>";
      }).join("") +
      '</ul><div class="story-actions"><a class="button primary" href="' +
      unitBase + '">返回' + esc(segmentNoun(category)) + ' ↗</a><a class="button subtle" href="#category/' + category + '">回到目录</a></div></section></div>';
  }

  window.addEventListener("hashchange", function () {
    persistSession();
    session = null;
    render();
  });
  bindThemeControls();
  render();
})();
