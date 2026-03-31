/* ═══════════════════════════════════════════════════════════════
   Matura Računalništvo · App JS v2
   ═══════════════════════════════════════════════════════════════ */
const PAGE_SIZE = 30;

const state = {
  tasks: [], topics: [], years: [],
  topicFilter: null, topicYear: '', topicPola: '', topicPage: 0, topicFiltered: [],
  yearFilter: null,  yearPola: '',  yearTopic: '', yearPage: 0, yearFiltered: [],
  searchQuery: '', searchPage: 0, searchFiltered: [],
  examYear: null, examPola: 'all', examTasks: [],
};

/* ─── TOPIC CONFIG ─────────────────────────────────────────────── */
const TOPIC_META = {
  'Programiranje':            { icon: '⌨', color: '#4f8ef7' },
  'Podatkovne strukture':     { icon: '🌲', color: '#a78bfa' },
  'Podatkovne baze':          { icon: '🗄', color: '#3ecf8e' },
  'Računalniška omrežja':     { icon: '🌐', color: '#f59e0b' },
  'Operacijski sistemi':      { icon: '🖥', color: '#fb7185' },
  'Računalniška arhitektura': { icon: '💾', color: '#ef4444' },
  'Logika in digitalni sistemi':{ icon:'🔀', color: '#34d399' },
  'Informacijski sistemi':    { icon: '🏢', color: '#38bdf8' },
  'Splošno računalništvo':    { icon: '💡', color: '#94a3b8' },
};
function topicColor(t){ return (TOPIC_META[t]||{color:'#4f8ef7'}).color; }
function topicIcon(t){  return (TOPIC_META[t]||{icon:'📌'}).icon; }
function topicClass(t){ return 'topic-'+t.replace(/[\s/]+/g,'-'); }

/* ─── INIT ──────────────────────────────────────────────────────── */
async function init(){
  const res  = await fetch('data/tasks.json');
  const data = await res.json();
  state.tasks  = data.tasks;
  state.topics = data.topics;
  state.years  = data.years;
  buildHome();
  buildTopicsView();
  buildYearsView();
  buildExamsView();
  setupSearch();
}

/* ─── HOME ──────────────────────────────────────────────────────── */
function buildHome(){
  document.getElementById('stat-tasks').textContent   = state.tasks.length;
  document.getElementById('stat-solved').textContent  = state.tasks.filter(t=>t.solution).length;
  document.getElementById('stat-years').textContent   = state.years.length;
  document.getElementById('stat-topics').textContent  = state.topics.length;

  const grid = document.getElementById('home-topic-grid');
  grid.innerHTML = '';
  for(const topic of state.topics){
    const count = state.tasks.filter(t=>t.topic===topic).length;
    const card  = document.createElement('div');
    card.className = 'topic-card';
    card.style.setProperty('--tc', topicColor(topic));
    card.innerHTML = `<div class="topic-card-icon">${topicIcon(topic)}</div>
      <div class="topic-card-name">${topic}</div>
      <div class="topic-card-count">${count} nalog</div>`;
    card.addEventListener('click', ()=>showTopics(topic));
    grid.appendChild(card);
  }

  const chips = document.getElementById('home-year-chips');
  chips.innerHTML = '';
  [...state.years].sort((a,b)=>b-a).slice(0,12).forEach(year=>{
    const c = document.createElement('div');
    c.className = 'year-chip';
    c.textContent = year;
    c.addEventListener('click', ()=>showExamSingle(year));
    chips.appendChild(c);
  });
}

/* ─── EXAMS LIST ─────────────────────────────────────────────────── */
function buildExamsView(){
  const grid = document.getElementById('exam-grid');
  grid.innerHTML = '';
  const sortedYears = [...state.years].sort((a,b)=>b-a);
  for(const year of sortedYears){
    const tasks = state.tasks.filter(t=>t.year===year);
    const hasSol = tasks.filter(t=>t.solution).length;
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-card-year">${year}</div>
      <div class="exam-card-meta">
        <span>${tasks.length} nalog</span>
        <span class="${hasSol>0?'has-solution':'no-solution'}">${hasSol} rešitev</span>
      </div>
      <div class="exam-card-pola">
        <span>IP1: ${tasks.filter(t=>t.pola==='IP1').length}</span>
        <span>IP2: ${tasks.filter(t=>t.pola==='IP2').length}</span>
      </div>
      <button class="btn-primary btn-sm exam-open-btn">Odpri izpit →</button>`;
    card.addEventListener('click', ()=>showExamSingle(year));
    grid.appendChild(card);
  }
}

/* ─── SINGLE EXAM ────────────────────────────────────────────────── */
function showExamSingle(year){
  state.examYear = year;
  state.examPola = 'all';
  state.examTasks = state.tasks.filter(t=>t.year===year).sort((a,b)=>{
    if(a.pola!==b.pola) return a.pola<b.pola?-1:1;
    return a.num-b.num;
  });
  document.getElementById('exam-single-title').textContent = `Izpit ${year}`;
  document.querySelectorAll('.pola-tab').forEach(b=>b.classList.toggle('active', b.dataset.pola==='all'));
  renderExamSingle();
  showView('exam-single');
  setNavActive('exams');
}

function filterExamPola(pola, btn){
  state.examPola = pola;
  document.querySelectorAll('.pola-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderExamSingle();
}

function renderExamSingle(){
  const tasks = state.examPola==='all'
    ? state.examTasks
    : state.examTasks.filter(t=>t.pola===state.examPola);
  const grid = document.getElementById('exam-single-grid');
  grid.innerHTML = '';
  tasks.forEach((task,i)=>{
    const card = buildTaskCard(task);
    card.style.animationDelay = `${i*15}ms`;
    grid.appendChild(card);
  });
}

/* ─── TOPICS VIEW ────────────────────────────────────────────────── */
function buildTopicsView(){
  const chips = document.getElementById('topic-filter-chips');
  chips.innerHTML = '';
  for(const topic of state.topics){
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    chip.dataset.topic = topic;
    chip.textContent = topic;
    chip.addEventListener('click', ()=>{
      const active = state.topicFilter===topic;
      state.topicFilter = active ? null : topic;
      chips.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
      if(!active) chip.classList.add('active');
      renderTopics();
    });
    chips.appendChild(chip);
  }
  const yearSel = document.getElementById('topic-year-filter');
  yearSel.innerHTML = '<option value="">Vsa leta</option>';
  [...state.years].sort((a,b)=>b-a).forEach(y=>{
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  });
  yearSel.addEventListener('change', ()=>{ state.topicYear=yearSel.value; renderTopics(); });
  document.getElementById('topic-pola-filter').addEventListener('change', e=>{ state.topicPola=e.target.value; renderTopics(); });
}

function clearTopicFilters(){
  state.topicFilter=null; state.topicYear=''; state.topicPola='';
  document.querySelectorAll('#topic-filter-chips .filter-chip').forEach(c=>c.classList.remove('active'));
  document.getElementById('topic-year-filter').value='';
  document.getElementById('topic-pola-filter').value='';
  renderTopics();
}

function renderTopics(){
  let tasks = state.tasks;
  if(state.topicFilter) tasks = tasks.filter(t=>t.topic===state.topicFilter);
  if(state.topicYear)   tasks = tasks.filter(t=>t.year==state.topicYear);
  if(state.topicPola)   tasks = tasks.filter(t=>t.pola===state.topicPola);
  state.topicFiltered = tasks;
  state.topicPage = 0;
  document.getElementById('topic-results-meta').textContent = `${tasks.length} nalog`;
  const grid = document.getElementById('topic-task-grid');
  grid.innerHTML = '';
  if(tasks.length===0){ grid.innerHTML = emptyState('Ni nalog za izbrane filtre.'); return; }
  renderTaskSlice(tasks, 0, grid, 'topic-load-more');
}

/* ─── YEARS VIEW ─────────────────────────────────────────────────── */
function buildYearsView(){
  const chips = document.getElementById('year-filter-chips');
  chips.innerHTML = '';
  [...state.years].sort((a,b)=>b-a).forEach(year=>{
    const chip = document.createElement('div');
    chip.className = 'year-chip'; chip.dataset.year=year; chip.textContent=year;
    chip.addEventListener('click', ()=>{
      const active = state.yearFilter===year;
      state.yearFilter = active ? null : year;
      chips.querySelectorAll('.year-chip').forEach(c=>c.classList.remove('active'));
      if(!active) chip.classList.add('active');
      renderYears();
    });
    chips.appendChild(chip);
  });
  const topicSel = document.getElementById('year-topic-filter');
  topicSel.innerHTML = '<option value="">Vse kategorije</option>';
  state.topics.forEach(t=>{ topicSel.innerHTML += `<option value="${t}">${t}</option>`; });
  topicSel.addEventListener('change', e=>{ state.yearTopic=e.target.value; renderYears(); });
  document.getElementById('year-pola-filter').addEventListener('change', e=>{ state.yearPola=e.target.value; renderYears(); });
}

function clearYearFilters(){
  state.yearFilter=null; state.yearPola=''; state.yearTopic='';
  document.querySelectorAll('#year-filter-chips .year-chip').forEach(c=>c.classList.remove('active'));
  document.getElementById('year-pola-filter').value='';
  document.getElementById('year-topic-filter').value='';
  renderYears();
}

function renderYears(){
  let tasks = state.tasks;
  if(state.yearFilter) tasks = tasks.filter(t=>t.year===state.yearFilter);
  if(state.yearPola)   tasks = tasks.filter(t=>t.pola===state.yearPola);
  if(state.yearTopic)  tasks = tasks.filter(t=>t.topic===state.yearTopic);
  tasks = [...tasks].sort((a,b)=>b.year-a.year||a.num-b.num);
  state.yearFiltered = tasks; state.yearPage = 0;
  document.getElementById('year-results-meta').textContent = `${tasks.length} nalog`;
  const grid = document.getElementById('year-task-grid');
  grid.innerHTML = '';
  if(tasks.length===0){ grid.innerHTML = emptyState('Ni nalog.'); return; }
  renderTaskSlice(tasks, 0, grid, 'year-load-more');
}

/* ─── SEARCH ─────────────────────────────────────────────────────── */
function setupSearch(){
  let debounce;
  const doSearch = q => {
    state.searchQuery = q;
    if(!q.trim()){ showHome(); return; }
    runSearch(q); showView('search'); setNavActive('none');
  };
  const handler = e => {
    clearTimeout(debounce);
    const q = e.target.value;
    if(q.length < 2) return;
    debounce = setTimeout(()=>doSearch(q), 280);
  };
  document.getElementById('global-search').addEventListener('input', handler);
  document.getElementById('mobile-search').addEventListener('input', handler);
  document.getElementById('global-search').addEventListener('keydown', e=>{
    if(e.key==='Escape'){ e.target.value=''; showHome(); }
  });
}

function runSearch(q){
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = state.tasks.filter(t=>{
    const h = (t.text+' '+(t.solution||'')+' '+t.topic+' '+t.year).toLowerCase();
    return tokens.every(tok=>h.includes(tok));
  });
  state.searchFiltered = results; state.searchPage = 0;
  document.getElementById('search-results-meta').textContent = `${results.length} zadetkov za "${q}"`;
  const grid = document.getElementById('search-task-grid');
  grid.innerHTML = '';
  if(results.length===0){ grid.innerHTML = emptyState(`Ni zadetkov za "${q}".`); return; }
  renderTaskSlice(results, 0, grid, 'search-load-more', q);
}

/* ─── TASK CARDS ─────────────────────────────────────────────────── */
function renderTaskSlice(tasks, page, grid, loadMoreId, searchQuery){
  const slice = tasks.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE);
  slice.forEach((task,i)=>{
    const card = buildTaskCard(task, searchQuery);
    card.style.animationDelay = `${(i%PAGE_SIZE)*15}ms`;
    grid.appendChild(card);
  });
  const btn = document.getElementById(loadMoreId);
  if(tasks.length <= (page+1)*PAGE_SIZE) btn.classList.add('hidden');
  else btn.classList.remove('hidden');
}

function buildTaskCard(task, searchQuery){
  const card = document.createElement('div');
  card.className = 'task-card';
  const hasSol = !!task.solution;
  const hasImg = !!task.image;
  const mc = parseMC(task);

  let preview = task.text;
  if(searchQuery){
    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    for(const tok of tokens)
      preview = preview.replace(new RegExp(`(${escRe(tok)})`, 'gi'), '<mark class="highlight">$1</mark>');
  }

  card.innerHTML = `
    <div class="task-card-header">
      <span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span>
      <span class="task-num">N${task.num} · ${task.pola}</span>
      <span class="task-points">${task.points}pt</span>
    </div>
    <div class="task-card-body">
      <div class="task-text">${formatText(preview, true)}</div>
    </div>
    <div class="task-card-footer">
      <span class="task-footer-year">${task.year}</span>
      <span class="task-footer-has-sol ${hasSol?'has-solution':'no-solution'}">${hasSol?'✓ Rešitev':'—'}</span>
      ${hasImg?'<span class="task-footer-img">📷</span>':''}
      <button class="expand-btn">Odpri →</button>
    </div>`;
  card.addEventListener('click', ()=>openModal(task));
  return card;
}

/* ─── MULTIPLE CHOICE PARSER ─────────────────────────────────────── */
function parseMC(task){
  // Detect options like "\nA\ntext" or "\nA text"
  const optPattern = /\n([A-E])\n([^\n]+)/g;
  const opts = [];
  let m;
  while((m=optPattern.exec(task.text))!==null)
    opts.push({letter: m[1], text: m[2].trim()});
  if(opts.length < 2) return null;

  // Parse correct answers from solution
  let correct = [];
  if(task.solution){
    const solLine = task.solution.split('\n')[0];
    correct = solLine.match(/[A-E]/g) || [];
  }
  const isMulti = correct.length > 1;
  return { opts, correct, isMulti };
}

/* ─── MODAL ──────────────────────────────────────────────────────── */
function openModal(task){
  const mc = parseMC(task);
  const hasSol = !!task.solution;
  const solId  = 'sol-'+task.id;
  const btnId  = 'sbtn-'+task.id;
  const mcId   = 'mc-'+task.id;

  // Strip MC options from question text for clean display
  let questionText = task.text;
  if(mc) questionText = questionText.replace(/\n[A-E]\n.*/gs, '').trim();

  const isCode = task.solution && /[{};]/.test(task.solution);

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-task-header">
      <span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span>
      <span style="font-size:13px;color:var(--text-3);font-family:var(--font-mono)">${task.year} · ${task.pola} · N${task.num}</span>
      <span style="font-size:13px;color:var(--text-3);margin-left:auto">${task.points} točk</span>
    </div>

    <div class="modal-task-body">${formatModalText(questionText)}</div>

    ${task.image ? `<img src="${task.image}" class="modal-task-img" alt="Naloga ${task.num}" loading="lazy">` : ''}

    ${mc ? buildMCWidget(mc, mcId, task) : ''}

    ${!mc && hasSol ? `
      <button class="modal-solution-toggle" id="${btnId}" onclick="toggleSolution('${solId}','${btnId}')">
        🔒 Prikaži rešitev
      </button>
      <div class="modal-solution-box" id="${solId}">
        <div class="modal-solution-label">✓ Rešitev</div>
        <div class="modal-solution-text ${isCode?'':'plain'}">${escHtml(task.solution)}</div>
      </div>` : ''}

    ${!mc && !hasSol ? `
      <div class="modal-solution-box" style="display:block;background:var(--bg-3);border:1px solid var(--border)">
        <div class="modal-solution-label" style="color:var(--text-3)">Rešitev ni na voljo</div>
        <div style="font-size:13px;color:var(--text-3)">Za leta 2004–2011 rešitve niso bile v tabelarni obliki.</div>
      </div>` : ''}
  `;

  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ─── MC WIDGET ──────────────────────────────────────────────────── */
function buildMCWidget(mc, mcId, task){
  const hasSol = mc.correct.length > 0;
  const inputType = mc.isMulti ? 'checkbox' : 'radio';
  const opts = mc.opts.map(o=>`
    <label class="mc-option" data-letter="${o.letter}">
      <input type="${inputType}" name="${mcId}" value="${o.letter}" class="mc-input">
      <span class="mc-letter">${o.letter}</span>
      <span class="mc-text">${escHtml(o.text)}</span>
    </label>`).join('');

  return `
    <div class="mc-widget" id="${mcId}">
      <div class="mc-hint">${mc.isMulti?'Izberi vse pravilne odgovore':'Izberi en odgovor'}</div>
      <div class="mc-options">${opts}</div>
      ${hasSol ? `<button class="mc-submit" onclick="submitMC('${mcId}','${task.id}')">Potrdi odgovor</button>` : ''}
      ${!hasSol ? `<div class="mc-no-sol">Rešitev za to nalogo ni na voljo (izpit pred 2012).</div>` : ''}
      <div class="mc-feedback hidden" id="fb-${mcId}"></div>
    </div>`;
}

function submitMC(mcId, taskId){
  const task = state.tasks.find(t=>t.id===taskId);
  if(!task) return;
  const mc = parseMC(task);
  if(!mc) return;

  const widget = document.getElementById(mcId);
  const selected = [...widget.querySelectorAll('.mc-input:checked')].map(i=>i.value);

  if(selected.length===0){
    const fb = document.getElementById('fb-'+mcId);
    fb.className = 'mc-feedback mc-feedback-warn';
    fb.textContent = 'Izberi vsaj en odgovor.';
    return;
  }

  // Disable inputs
  widget.querySelectorAll('.mc-input').forEach(i=>i.disabled=true);
  widget.querySelector('.mc-submit').disabled = true;

  // Mark each option
  widget.querySelectorAll('.mc-option').forEach(label=>{
    const letter = label.dataset.letter;
    const isCorrect  = mc.correct.includes(letter);
    const isSelected = selected.includes(letter);
    if(isCorrect && isSelected)  label.classList.add('mc-correct');
    else if(!isCorrect && isSelected) label.classList.add('mc-wrong');
    else if(isCorrect && !isSelected) label.classList.add('mc-missed');
  });

  // Feedback
  const allRight = selected.length===mc.correct.length && selected.every(s=>mc.correct.includes(s));
  const fb = document.getElementById('fb-'+mcId);
  fb.className = 'mc-feedback '+(allRight?'mc-feedback-ok':'mc-feedback-err');
  fb.innerHTML = allRight
    ? '✓ Pravilno!'
    : `✗ Napačno. Pravilni odgovori: <strong>${mc.correct.join(', ')}</strong>`;
}

function toggleSolution(solId, btnId){
  const box = document.getElementById(solId);
  const btn = document.getElementById(btnId);
  const open = box.classList.toggle('open');
  btn.classList.toggle('revealed', open);
  btn.textContent = open ? '🔓 Skrij rešitev' : '🔒 Prikaži rešitev';
}

function closeModal(){
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── TEXT FORMATTING ────────────────────────────────────────────── */
function formatText(text, preview){
  const lines = text.split('\n');
  const out = []; let code=[], inCode=false;
  for(const line of lines){
    const t = line.trim();
    const isC = /^\s{2,}/.test(line) && /[{};=()]/.test(t) ||
                /^(public|private|static|void|int|double|class|if|for|while|return|String|char)\b/.test(t);
    if(isC){ inCode=true; code.push(escHtml(line)); }
    else{
      if(inCode){ out.push(`<pre class="task-code"><code>${code.join('\n')}</code></pre>`); inCode=false; code=[]; }
      out.push(escHtml(line));
    }
  }
  if(inCode) out.push(`<pre class="task-code"><code>${code.join('\n')}</code></pre>`);
  return out.join('<br>');
}

function formatModalText(text){
  const lines = text.split('\n');
  const out = []; let code=[], inCode=false;
  for(const line of lines){
    const t = line.trim();
    const isC = /^\s{2,}/.test(line) && /[{};=()]/.test(t) ||
                /^(public|private|static|void|int|double|class|if|for|while|return|String|char)\b/.test(t);
    if(isC){ inCode=true; code.push(escHtml(line)); }
    else{
      if(inCode){ out.push(`<pre class="modal-code"><code>${code.join('\n')}</code></pre>`); inCode=false; code=[]; }
      out.push(t==='' ? '<br>' : `<p>${escHtml(line)}</p>`);
    }
  }
  if(inCode) out.push(`<pre class="modal-code"><code>${code.join('\n')}</code></pre>`);
  return out.join('');
}

/* ─── LOAD MORE ──────────────────────────────────────────────────── */
function loadMoreTopic(){ state.topicPage++; renderTaskSlice(state.topicFiltered, state.topicPage, document.getElementById('topic-task-grid'), 'topic-load-more'); }
function loadMoreYear(){  state.yearPage++;  renderTaskSlice(state.yearFiltered,  state.yearPage,  document.getElementById('year-task-grid'),  'year-load-more'); }
function loadMoreSearch(){ state.searchPage++; renderTaskSlice(state.searchFiltered, state.searchPage, document.getElementById('search-task-grid'), 'search-load-more', state.searchQuery); }

/* ─── NAV ────────────────────────────────────────────────────────── */
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  window.scrollTo(0,0);
}
function setNavActive(which){
  ['home','topics','exams','years'].forEach(n=>document.getElementById('nav-'+n)?.classList.remove('active'));
  if(which!=='none') document.getElementById('nav-'+which)?.classList.add('active');
}
function showHome(){ showView('home'); setNavActive('home'); document.getElementById('global-search').value=''; }
function showTopics(preselect){
  showView('topics'); setNavActive('topics');
  if(preselect){
    state.topicFilter=preselect;
    document.querySelectorAll('#topic-filter-chips .filter-chip').forEach(c=>c.classList.toggle('active',c.dataset.topic===preselect));
  }
  renderTopics();
}
function showExams(){ showView('exams'); setNavActive('exams'); }
function showYears(preselect){
  showView('years'); setNavActive('years');
  if(preselect){
    state.yearFilter=preselect;
    document.querySelectorAll('#year-filter-chips .year-chip').forEach(c=>c.classList.toggle('active',c.dataset.year==preselect));
  }
  renderYears();
}

/* ─── MOBILE NAV ─────────────────────────────────────────────────── */
document.getElementById('nav-burger').addEventListener('click', ()=>{ document.getElementById('mobile-nav').classList.add('open'); document.body.style.overflow='hidden'; });
document.getElementById('mobile-nav-close').addEventListener('click', closeMobileNav);
function closeMobileNav(){ document.getElementById('mobile-nav').classList.remove('open'); document.body.style.overflow=''; }

/* ─── KEYBOARD ───────────────────────────────────────────────────── */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeModal(); closeMobileNav(); }
  if(e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
    e.preventDefault(); document.getElementById('global-search').focus();
  }
});

/* ─── HELPERS ────────────────────────────────────────────────────── */
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function emptyState(msg){ return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Nič ni bilo najdeno</div><div class="empty-state-desc">${msg}</div></div>`; }

init();
