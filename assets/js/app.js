/* ═══════════════════════════════════════════════════════════════
   Matura Računalništvo · App JS
   ═══════════════════════════════════════════════════════════════ */

const PAGE_SIZE = 30;

// ─── STATE ────────────────────────────────────────────────────────
const state = {
  tasks: [],
  topics: [],
  years: [],
  // Topic view
  topicFilter: null,
  topicYear: "",
  topicPola: "",
  topicPage: 0,
  topicFiltered: [],
  // Year view
  yearFilter: null,
  yearPola: "",
  yearTopic: "",
  yearPage: 0,
  yearFiltered: [],
  // Search
  searchQuery: "",
  searchPage: 0,
  searchFiltered: [],
};

// ─── TOPIC CONFIG ─────────────────────────────────────────────────
const TOPIC_ICONS = {
  "Programiranje": "⌨",
  "Podatkovne baze": "🗄",
  "Omrežja": "🌐",
  "Strojna oprema": "💾",
  "Operacijski sistemi": "🖥",
  "Logika in sistemi": "🔀",
  "Informacijski sistemi": "🏢",
  "Splošno računalništvo": "💡",
};

function topicClass(topic) {
  return "topic-" + topic.replace(/\s+/g, "-");
}

// ─── INIT ─────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch("data/tasks.json");
    const data = await res.json();
    state.tasks = data.tasks;
    state.topics = data.topics;
    state.years = data.years;
    buildHome();
    buildTopicsView();
    buildYearsView();
    setupSearch();
  } catch (e) {
    console.error("Failed to load data:", e);
  }
}

// ─── HOME ─────────────────────────────────────────────────────────
function buildHome() {
  // Stats
  document.getElementById("stat-tasks").textContent = state.tasks.length;
  document.getElementById("stat-solved").textContent =
    state.tasks.filter(t => t.solution).length;
  document.getElementById("stat-years").textContent = state.years.length;
  document.getElementById("stat-topics").textContent = state.topics.length;

  // Topic cards
  const grid = document.getElementById("home-topic-grid");
  grid.innerHTML = "";
  for (const topic of state.topics) {
    const count = state.tasks.filter(t => t.topic === topic).length;
    const card = document.createElement("div");
    card.className = "topic-card";
    card.style.setProperty("--tc", getTopicColor(topic));
    card.innerHTML = `
      <div class="topic-card-icon">${TOPIC_ICONS[topic] || "📌"}</div>
      <div class="topic-card-name">${topic}</div>
      <div class="topic-card-count">${count} nalog</div>
    `;
    card.addEventListener("click", () => {
      showTopics(topic);
    });
    grid.appendChild(card);
  }

  // Year chips (recent first)
  const chips = document.getElementById("home-year-chips");
  chips.innerHTML = "";
  const recentYears = [...state.years].sort((a, b) => b - a).slice(0, 12);
  for (const year of recentYears) {
    const chip = document.createElement("div");
    chip.className = "year-chip";
    chip.textContent = year;
    chip.addEventListener("click", () => showYears(year));
    chips.appendChild(chip);
  }
}

function getTopicColor(topic) {
  const map = {
    "Programiranje": "#4f8ef7",
    "Podatkovne baze": "#3ecf8e",
    "Omrežja": "#f59e0b",
    "Strojna oprema": "#ef4444",
    "Operacijski sistemi": "#a78bfa",
    "Logika in sistemi": "#fb7185",
    "Informacijski sistemi": "#34d399",
    "Splošno računalništvo": "#94a3b8",
  };
  return map[topic] || "#4f8ef7";
}

// ─── TOPICS VIEW ──────────────────────────────────────────────────
function buildTopicsView() {
  // Topic filter chips
  const chips = document.getElementById("topic-filter-chips");
  chips.innerHTML = "";
  for (const topic of state.topics) {
    const chip = document.createElement("div");
    chip.className = "filter-chip";
    chip.dataset.topic = topic;
    chip.textContent = topic;
    chip.addEventListener("click", () => {
      if (state.topicFilter === topic) {
        state.topicFilter = null;
        chip.classList.remove("active");
      } else {
        state.topicFilter = topic;
        chips.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      }
      renderTopics();
    });
    chips.appendChild(chip);
  }

  // Year select
  const yearSel = document.getElementById("topic-year-filter");
  yearSel.innerHTML = '<option value="">Vsa leta</option>';
  for (const year of [...state.years].sort((a, b) => b - a)) {
    yearSel.innerHTML += `<option value="${year}">${year}</option>`;
  }
  yearSel.addEventListener("change", () => {
    state.topicYear = yearSel.value;
    renderTopics();
  });

  // Pola filter
  document.getElementById("topic-pola-filter").addEventListener("change", e => {
    state.topicPola = e.target.value;
    renderTopics();
  });
}

function clearTopicFilters() {
  state.topicFilter = null;
  state.topicYear = "";
  state.topicPola = "";
  document.querySelectorAll("#topic-filter-chips .filter-chip").forEach(c => c.classList.remove("active"));
  document.getElementById("topic-year-filter").value = "";
  document.getElementById("topic-pola-filter").value = "";
  renderTopics();
}

function renderTopics() {
  let tasks = state.tasks;
  if (state.topicFilter) tasks = tasks.filter(t => t.topic === state.topicFilter);
  if (state.topicYear) tasks = tasks.filter(t => t.year == state.topicYear);
  if (state.topicPola) tasks = tasks.filter(t => t.pola === state.topicPola);
  state.topicFiltered = tasks;
  state.topicPage = 0;

  document.getElementById("topic-results-meta").textContent =
    `${tasks.length} nalog${tasks.length !== 1 ? "" : "a"}`;

  const grid = document.getElementById("topic-task-grid");
  if (tasks.length === 0) {
    grid.innerHTML = emptyState("Ni nalog za izbrane filtre.");
  } else {
    grid.innerHTML = "";
    renderTaskSlice(tasks, 0, grid, "topic-load-more");
  }
}

// ─── YEARS VIEW ───────────────────────────────────────────────────
function buildYearsView() {
  const chips = document.getElementById("year-filter-chips");
  chips.innerHTML = "";
  const sortedYears = [...state.years].sort((a, b) => b - a);
  for (const year of sortedYears) {
    const chip = document.createElement("div");
    chip.className = "year-chip";
    chip.dataset.year = year;
    chip.textContent = year;
    chip.addEventListener("click", () => {
      if (state.yearFilter === year) {
        state.yearFilter = null;
        chip.classList.remove("active");
      } else {
        state.yearFilter = year;
        chips.querySelectorAll(".year-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      }
      renderYears();
    });
    chips.appendChild(chip);
  }

  // Topic select
  const topicSel = document.getElementById("year-topic-filter");
  topicSel.innerHTML = '<option value="">Vse teme</option>';
  for (const t of state.topics) {
    topicSel.innerHTML += `<option value="${t}">${t}</option>`;
  }
  topicSel.addEventListener("change", e => {
    state.yearTopic = e.target.value;
    renderYears();
  });

  document.getElementById("year-pola-filter").addEventListener("change", e => {
    state.yearPola = e.target.value;
    renderYears();
  });
}

function clearYearFilters() {
  state.yearFilter = null;
  state.yearPola = "";
  state.yearTopic = "";
  document.querySelectorAll("#year-filter-chips .year-chip").forEach(c => c.classList.remove("active"));
  document.getElementById("year-pola-filter").value = "";
  document.getElementById("year-topic-filter").value = "";
  renderYears();
}

function renderYears() {
  let tasks = state.tasks;
  if (state.yearFilter) tasks = tasks.filter(t => t.year === state.yearFilter);
  if (state.yearPola) tasks = tasks.filter(t => t.pola === state.yearPola);
  if (state.yearTopic) tasks = tasks.filter(t => t.topic === state.yearTopic);
  // Sort by year desc, then task num
  tasks = [...tasks].sort((a, b) => b.year - a.year || a.num - b.num);
  state.yearFiltered = tasks;
  state.yearPage = 0;

  document.getElementById("year-results-meta").textContent =
    `${tasks.length} nalog`;

  const grid = document.getElementById("year-task-grid");
  if (tasks.length === 0) {
    grid.innerHTML = emptyState("Ni nalog za izbrane filtre.");
  } else {
    grid.innerHTML = "";
    renderTaskSlice(tasks, 0, grid, "year-load-more");
  }
}

// ─── SEARCH ───────────────────────────────────────────────────────
function setupSearch() {
  const desktopInput = document.getElementById("global-search");
  const mobileInput = document.getElementById("mobile-search");

  const doSearch = (q) => {
    state.searchQuery = q;
    if (!q.trim()) return;
    runSearch(q);
    showView("search");
    setNavActive("none");
  };

  let debounce;
  const handler = (e) => {
    clearTimeout(debounce);
    const q = e.target.value;
    if (q.length < 2) return;
    debounce = setTimeout(() => doSearch(q), 280);
  };

  desktopInput.addEventListener("input", handler);
  mobileInput.addEventListener("input", handler);

  desktopInput.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      desktopInput.value = "";
      showHome();
    }
  });
}

function runSearch(q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = state.tasks.filter(t => {
    const haystack = (t.text + " " + (t.solution || "") + " " + t.topic + " " + t.year).toLowerCase();
    return tokens.every(tok => haystack.includes(tok));
  });
  state.searchFiltered = results;
  state.searchPage = 0;

  document.getElementById("search-results-meta").textContent =
    `${results.length} zadetkov za "${q}"`;

  const grid = document.getElementById("search-task-grid");
  if (results.length === 0) {
    grid.innerHTML = emptyState(`Ni zadetkov za "${q}".`);
  } else {
    grid.innerHTML = "";
    renderTaskSlice(results, 0, grid, "search-load-more", q);
  }
}

// ─── RENDER TASKS ─────────────────────────────────────────────────
function renderTaskSlice(tasks, startPage, grid, loadMoreId, searchQuery) {
  const start = startPage * PAGE_SIZE;
  const slice = tasks.slice(start, start + PAGE_SIZE);

  slice.forEach((task, i) => {
    const card = buildTaskCard(task, searchQuery);
    card.style.animationDelay = `${(i % PAGE_SIZE) * 20}ms`;
    grid.appendChild(card);
  });

  const btn = document.getElementById(loadMoreId);
  if (tasks.length <= start + PAGE_SIZE) {
    btn.classList.add("hidden");
  } else {
    btn.classList.remove("hidden");
  }
}

function buildTaskCard(task, searchQuery) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.addEventListener("click", () => openModal(task));

  const tc = topicClass(task.topic);
  const hasSol = !!task.solution;
  const hasImg = !!task.image;

  let textPreview = task.text;
  // Highlight search terms
  if (searchQuery) {
    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      const re = new RegExp(`(${escapeRe(tok)})`, "gi");
      textPreview = textPreview.replace(re, `<mark class="highlight">$1</mark>`);
    }
  }

  card.innerHTML = `
    <div class="task-card-header">
      <span class="task-badge ${tc}">${task.topic}</span>
      <span class="task-num">N${task.num} · ${task.pola}</span>
      <span class="task-points">${task.points} ${task.points === 1 ? "točka" : "točk"}</span>
    </div>
    <div class="task-card-body">
      <div class="task-text">${formatTaskText(textPreview)}</div>
    </div>
    <div class="task-card-footer">
      <span class="task-footer-year">${task.year}</span>
      <span class="task-footer-has-sol ${hasSol ? "has-solution" : "no-solution"}">
        ${hasSol ? "✓ Rešitev" : "Brez rešitve"}
      </span>
      ${hasImg ? '<span class="task-footer-img">📷 Slika</span>' : ""}
      <button class="expand-btn">Odpri →</button>
    </div>
  `;
  return card;
}

function formatTaskText(text) {
  // Detect code blocks (lines with indentation or Java-like syntax)
  const lines = text.split("\n");
  const out = [];
  let inCode = false;
  let codeLines = [];

  for (const line of lines) {
    const isCode = /^\s{2,}/.test(line) ||
                   /^(public|private|static|void|int|double|float|String|class|if|for|while|return|}\s*$)/.test(line.trim()) ||
                   /[{}();]/.test(line) && !/^[A-ZŠŽČ]/.test(line.trim());
    if (isCode) {
      if (!inCode) { inCode = true; codeLines = []; }
      codeLines.push(escapeHtml(line));
    } else {
      if (inCode) {
        out.push(`<pre class="task-code"><code>${codeLines.join("\n")}</code></pre>`);
        inCode = false; codeLines = [];
      }
      out.push(escapeHtml(line));
    }
  }
  if (inCode) out.push(`<pre class="task-code"><code>${codeLines.join("\n")}</code></pre>`);

  return out.join("<br>");
}

// ─── MODAL ────────────────────────────────────────────────────────
function openModal(task) {
  const body = document.getElementById("modal-body");
  const hasSol = !!task.solution;
  const solId = "sol-" + task.id;
  const btnId = "solbtn-" + task.id;

  // Determine if solution is likely code
  const isCode = task.solution && (
    task.solution.includes("{") || task.solution.includes("public ") ||
    task.solution.includes("static ") || task.solution.includes("for ") ||
    task.solution.includes("while ") || task.solution.includes("Select ")
  );

  body.innerHTML = `
    <div class="modal-task-header">
      <span class="task-badge ${topicClass(task.topic)}">${task.topic}</span>
      <span class="task-num" style="font-size:14px;color:var(--text-3);font-family:var(--font-mono)">
        ${task.year} · ${task.pola} · Naloga ${task.num}
      </span>
      <span class="task-points" style="font-size:13px;color:var(--text-3);margin-left:auto">
        ${task.points} točk
      </span>
    </div>

    <div class="modal-task-body">${formatModalText(task.text)}</div>

    ${task.image ? `<img src="${task.image}" class="modal-task-img" alt="Naloga ${task.num}" loading="lazy">` : ""}

    ${hasSol ? `
      <button class="modal-solution-toggle" id="${btnId}" onclick="toggleSolution('${solId}','${btnId}')">
        🔒 Prikaži rešitev
      </button>
      <div class="modal-solution-box" id="${solId}">
        <div class="modal-solution-label">✓ Rešitev</div>
        <div class="modal-solution-text ${isCode ? "" : "plain"}">${escapeHtml(task.solution)}</div>
        ${task.solution_points ? `<div style="margin-top:12px;font-size:12px;color:var(--text-3)">${task.solution_points} točk</div>` : ""}
      </div>
    ` : `
      <div class="modal-solution-box" style="display:block;background:var(--bg-3);border:1px solid var(--border)">
        <div class="modal-solution-label" style="color:var(--text-3)">Rešitev ni na voljo</div>
        <div style="font-size:13px;color:var(--text-3)">Za leta 2004–2011 rešitve niso bile priložene v obliki, ki bi jo bilo mogoče avtomatsko izvleči.</div>
      </div>
    `}
  `;

  document.getElementById("modal").classList.add("open");
  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function toggleSolution(solId, btnId) {
  const box = document.getElementById(solId);
  const btn = document.getElementById(btnId);
  if (box.classList.contains("open")) {
    box.classList.remove("open");
    btn.classList.remove("revealed");
    btn.textContent = "🔒 Prikaži rešitev";
  } else {
    box.classList.add("open");
    btn.classList.add("revealed");
    btn.textContent = "🔓 Skrij rešitev";
  }
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

function formatModalText(text) {
  const lines = text.split("\n");
  const out = [];
  let inCode = false;
  let codeLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isCodeLine = (line.startsWith("  ") || line.startsWith("\t")) &&
      (/{|}|;|\(|\)|=/.test(trimmed) || /^(public|private|static|void|int|double|class|if|for|while|return|String|char)/.test(trimmed));
    // Also catch single-line code indicators
    const isSingleCode = /^[a-z].*[{;(]$/.test(trimmed) && !trimmed.startsWith("http");

    if (isCodeLine) {
      if (!inCode) { inCode = true; codeLines = []; }
      codeLines.push(escapeHtml(line));
    } else {
      if (inCode) {
        out.push(`<pre style="background:var(--bg-3);border:1px solid var(--border);border-radius:6px;padding:14px 16px;overflow-x:auto;font-family:var(--font-mono);font-size:13px;line-height:1.6;margin:12px 0"><code>${codeLines.join("\n")}</code></pre>`);
        inCode = false; codeLines = [];
      }
      if (trimmed === "") {
        out.push("<br>");
      } else {
        out.push(`<p style="margin:4px 0;font-size:15px;color:var(--text-2)">${escapeHtml(line)}</p>`);
      }
    }
  }
  if (inCode) out.push(`<pre style="background:var(--bg-3);border:1px solid var(--border);border-radius:6px;padding:14px 16px;overflow-x:auto;font-family:var(--font-mono);font-size:13px;line-height:1.6;margin:12px 0"><code>${codeLines.join("\n")}</code></pre>`);
  return out.join("");
}

// ─── LOAD MORE ────────────────────────────────────────────────────
function loadMoreTopic() {
  state.topicPage++;
  renderTaskSlice(state.topicFiltered, state.topicPage,
    document.getElementById("topic-task-grid"), "topic-load-more");
}
function loadMoreYear() {
  state.yearPage++;
  renderTaskSlice(state.yearFiltered, state.yearPage,
    document.getElementById("year-task-grid"), "year-load-more");
}
function loadMoreSearch() {
  state.searchPage++;
  renderTaskSlice(state.searchFiltered, state.searchPage,
    document.getElementById("search-task-grid"), "search-load-more", state.searchQuery);
}

// ─── NAVIGATION ───────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  window.scrollTo(0, 0);
}

function setNavActive(which) {
  document.getElementById("nav-home").classList.remove("active");
  document.getElementById("nav-topics").classList.remove("active");
  document.getElementById("nav-years").classList.remove("active");
  if (which !== "none") document.getElementById(`nav-${which}`).classList.add("active");
}

function showHome() {
  showView("home");
  setNavActive("home");
  document.getElementById("global-search").value = "";
  document.getElementById("mobile-search").value = "";
}

function showTopics(preselect) {
  showView("topics");
  setNavActive("topics");
  if (preselect) {
    state.topicFilter = preselect;
    document.querySelectorAll("#topic-filter-chips .filter-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.topic === preselect);
    });
  }
  renderTopics();
}

function showYears(preselect) {
  showView("years");
  setNavActive("years");
  if (preselect) {
    state.yearFilter = preselect;
    document.querySelectorAll("#year-filter-chips .year-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.year == preselect);
    });
  }
  renderYears();
}

// ─── MOBILE NAV ───────────────────────────────────────────────────
document.getElementById("nav-burger").addEventListener("click", () => {
  document.getElementById("mobile-nav").classList.add("open");
  document.body.style.overflow = "hidden";
});
document.getElementById("mobile-nav-close").addEventListener("click", closeMobileNav);

function closeMobileNav() {
  document.getElementById("mobile-nav").classList.remove("open");
  document.body.style.overflow = "";
}

// ─── KEYBOARD ─────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeModal();
    closeMobileNav();
  }
  if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    e.preventDefault();
    document.getElementById("global-search").focus();
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyState(msg) {
  return `<div class="empty-state" style="grid-column:1/-1">
    <div class="empty-state-icon">🔍</div>
    <div class="empty-state-title">Nič ni bilo najdeno</div>
    <div class="empty-state-desc">${msg}</div>
  </div>`;
}

// ─── BOOT ─────────────────────────────────────────────────────────
init();
