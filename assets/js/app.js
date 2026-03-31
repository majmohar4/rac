/* ═══════════════════════════════════════════════════════════════
   Matura Računalništvo · App JS v4
   ═══════════════════════════════════════════════════════════════ */
const PAGE_SIZE = 30;

const state = {
  tasks: [], topics: [], years: [],
  topicFilter: null, topicYear: '', topicPola: '', topicPage: 0, topicFiltered: [],
  yearFilter: null, yearPola: '', yearTopic: '', yearPage: 0, yearFiltered: [],
  searchQuery: '', searchPage: 0, searchFiltered: [],
  examYear: null, examPola: 'all', examTasks: [],
  modalTaskList: [], modalIndex: -1,
  quizCount: 10, quizTopics: [], // all = empty array
};

/* ─── TOPIC CONFIG ──────────────────────────────────────────── */
const TOPIC_META = {
  'Programiranje':              { icon: '⌨', color: '#4f8ef7' },
  'Podatkovne strukture':       { icon: '🌲', color: '#a78bfa' },
  'Podatkovne baze':            { icon: '🗄', color: '#3ecf8e' },
  'Računalniška omrežja':       { icon: '🌐', color: '#f59e0b' },
  'Operacijski sistemi':        { icon: '🖥', color: '#fb7185' },
  'Računalniška arhitektura':   { icon: '💾', color: '#ef4444' },
  'Logika in digitalni sistemi':{ icon: '🔀', color: '#34d399' },
  'Informacijski sistemi':      { icon: '🏢', color: '#38bdf8' },
  'Splošno računalništvo':      { icon: '💡', color: '#94a3b8' },
};
const topicColor = t => (TOPIC_META[t]||{color:'#4f8ef7'}).color;
const topicIcon  = t => (TOPIC_META[t]||{icon:'📌'}).icon;
const topicClass = t => 'topic-'+t.replace(/[\s/]+/g,'-');

/* ─── INIT ──────────────────────────────────────────────────── */
async function init(){
  const res  = await fetch('data/tasks.json?v=4');
  const data = await res.json();
  state.tasks  = data.tasks;
  state.topics = data.topics;
  state.years  = data.years;
  buildHome();
  buildTopicsView();
  buildYearsView();
  buildExamsView();
  buildQuizSetup();
  setupSearch();
  updateProgressBar();
}

/* ─── HOME ──────────────────────────────────────────────────── */
function buildHome(){
  document.getElementById('stat-tasks').textContent   = state.tasks.length;
  document.getElementById('stat-solved').textContent  = state.tasks.filter(t=>t.solution).length;
  document.getElementById('stat-years').textContent   = state.years.length;
  document.getElementById('stat-topics').textContent  = state.topics.length;

  const grid = document.getElementById('home-topic-grid');
  grid.innerHTML = '';
  for(const topic of state.topics){
    const count = state.tasks.filter(t=>t.topic===topic).length;
    const done  = state.tasks.filter(t=>t.topic===topic && Progress.get(t.id)==='correct').length;
    const card = document.createElement('div');
    card.className = 'topic-card';
    card.style.setProperty('--tc', topicColor(topic));
    card.innerHTML = `
      <div class="topic-card-icon">${topicIcon(topic)}</div>
      <div class="topic-card-name">${topic}</div>
      <div class="topic-card-count">${count} nalog</div>
      ${done>0?`<div class="topic-card-done">${done} ✓</div>`:''}`;
    card.addEventListener('click', ()=>showTopics(topic));
    grid.appendChild(card);
  }

  const chips = document.getElementById('home-year-chips');
  chips.innerHTML = '';
  [...state.years].sort((a,b)=>b-a).slice(0,12).forEach(year=>{
    const c = document.createElement('div');
    c.className = 'year-chip'; c.textContent = year;
    c.addEventListener('click', ()=>showExamSingle(year));
    chips.appendChild(c);
  });
}

/* ─── PROGRESS UI ────────────────────────────────────────────── */
function updateProgressBar(){
  const s = Progress.stats();
  const total = state.tasks ? state.tasks.length : 894;
  const pct = total ? Math.round((s.correct+s.wrong+s.skipped)/total*100) : 0;
  const fill = document.getElementById('progress-bar-fill');
  const txt  = document.getElementById('progress-bar-text');
  const stats = document.getElementById('progress-stats');
  if(fill) fill.style.width = pct+'%';
  if(txt){
    if(s.total===0) txt.textContent = 'Še nisi rešil nobene naloge. Začni z vadenjem!';
    else txt.textContent = `${pct}% nalog rešenih`;
  }
  if(stats && s.total>0){
    stats.innerHTML = `
      <span class="ps-correct">✓ ${s.correct} pravilno</span>
      <span class="ps-wrong">✗ ${s.wrong} napačno</span>
      <span class="ps-skipped">↷ ${s.skipped} preskočeno</span>`;
  }
}

function showResetConfirm(){
  document.getElementById('reset-overlay').style.display='block';
  document.getElementById('reset-dialog').style.display='block';
}
function hideResetConfirm(){
  document.getElementById('reset-overlay').style.display='none';
  document.getElementById('reset-dialog').style.display='none';
}
function doReset(){
  Progress.clear();
  updateProgressBar();
  buildHome();
  hideResetConfirm();
}

/* ─── QUIZ SETUP ─────────────────────────────────────────────── */
function buildQuizSetup(){
  const grid = document.getElementById('quiz-topic-grid');
  grid.innerHTML = '';
  state.topics.forEach(topic=>{
    const count = state.tasks.filter(t=>t.topic===topic).length;
    const btn = document.createElement('button');
    btn.className = 'quiz-topic-btn active'; // default all selected
    btn.dataset.topic = topic;
    btn.style.setProperty('--tc', topicColor(topic));
    btn.innerHTML = `<span class="qtb-icon">${topicIcon(topic)}</span><span class="qtb-name">${topic}</span><span class="qtb-count">${count}</span>`;
    btn.addEventListener('click', ()=>{
      btn.classList.toggle('active');
      updateSelectedTopics();
    });
    grid.appendChild(btn);
  });
  updateSelectedTopics();
}

function updateSelectedTopics(){
  state.quizTopics = [...document.querySelectorAll('.quiz-topic-btn.active')].map(b=>b.dataset.topic);
}

function toggleAllTopics(){
  const btns = document.querySelectorAll('.quiz-topic-btn');
  const allActive = [...btns].every(b=>b.classList.contains('active'));
  btns.forEach(b=>b.classList.toggle('active', !allActive));
  updateSelectedTopics();
}

function setQuizCount(n, btn){
  state.quizCount = n;
  document.querySelectorAll('.quiz-count-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

function startQuiz(){
  updateSelectedTopics();
  const onlyUnsolved = document.getElementById('quiz-only-unsolved').checked;
  const onlyMC = document.getElementById('quiz-only-mc').checked;
  Quiz.start({
    topics: state.quizTopics,
    onlyUnsolved,
    onlyMC,
    count: state.quizCount,
  });
}

function showQuizSetup(){
  showView('quiz-setup');
  setNavActive('quiz');
}

/* ─── EXAMS LIST ─────────────────────────────────────────────── */
function buildExamsView(){
  const grid = document.getElementById('exam-grid');
  grid.innerHTML = '';
  [...state.years].sort((a,b)=>b-a).forEach(year=>{
    const tasks = state.tasks.filter(t=>t.year===year);
    const hasSol = tasks.filter(t=>t.solution).length;
    const ip1 = tasks.filter(t=>t.pola==='IP1').length;
    const ip2 = tasks.filter(t=>t.pola==='IP2').length;
    const done = tasks.filter(t=>Progress.get(t.id)==='correct').length;
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-card-year">${year}</div>
      <div class="exam-card-meta">
        <span>${tasks.length} nalog</span>
        <span class="${hasSol>0?'has-solution':'no-solution'}">${hasSol} rešitev</span>
      </div>
      <div class="exam-card-pola"><span>IP1: ${ip1}</span><span>IP2: ${ip2}</span></div>
      ${done>0?`<div class="exam-card-done">${done}/${tasks.length} rešenih</div>`:''}
      <button class="btn-primary btn-sm exam-open-btn">Odpri izpit →</button>`;
    card.addEventListener('click', ()=>showExamSingle(year));
    grid.appendChild(card);
  });
}

/* ─── SINGLE EXAM ────────────────────────────────────────────── */
function showExamSingle(year){
  state.examYear = year;
  state.examPola = 'all';
  state.examTasks = state.tasks.filter(t=>t.year===year).sort((a,b)=>{
    if(a.pola!==b.pola) return a.pola<b.pola?-1:1;
    return a.num-b.num;
  });
  document.getElementById('exam-single-title').textContent = `Izpit ${year}`;
  document.querySelectorAll('.pola-tab').forEach(b=>b.classList.toggle('active',b.dataset.pola==='all'));
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
  const tasks = state.examPola==='all' ? state.examTasks : state.examTasks.filter(t=>t.pola===state.examPola);
  const grid = document.getElementById('exam-single-grid');
  grid.innerHTML = '';
  grid.className = 'exam-full-view';
  const byPola = {};
  tasks.forEach(t=>(byPola[t.pola]||(byPola[t.pola]=[])).push(t));
  Object.entries(byPola).sort().forEach(([pola, polaTasks])=>{
    const section = document.createElement('div');
    section.className = 'exam-section';
    const doneCount = polaTasks.filter(t=>Progress.get(t.id)==='correct').length;
    section.innerHTML = `<div class="exam-section-header">
      <span class="exam-section-title">Izpitna ${pola==='IP1'?'pola 1':'pola 2'}</span>
      <span class="exam-section-count">${polaTasks.length} nalog</span>
      ${doneCount>0?`<span class="exam-section-done">${doneCount} ✓</span>`:''}
    </div>`;
    const taskList = document.createElement('div');
    taskList.className = 'exam-task-list';
    polaTasks.forEach((task,i)=>taskList.appendChild(buildExamTaskItem(task,i,polaTasks)));
    section.appendChild(taskList);
    grid.appendChild(section);
  });
  state.modalTaskList = tasks;
}

function buildExamTaskItem(task, idx, list){
  const item = document.createElement('div');
  item.className = 'exam-task-item';
  item.dataset.taskId = task.id;
  const prog = Progress.get(task.id);
  item.dataset.progress = prog || '';
  const hasSol = !!task.solution;
  const mc = parseMC(task);
  const preview = task.text.split('\n').filter(l=>l.trim()&&!l.match(/^[A-E]$/))[0]||'';
  item.innerHTML = `
    <div class="exam-task-num">
      <span class="exam-num-badge">${task.num}</span>
      <span class="exam-points-badge">${task.points}pt</span>
    </div>
    <div class="exam-task-content">
      <div class="exam-task-topic"><span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span></div>
      <div class="exam-task-preview">${escHtml(preview)}</div>
      ${mc?`<div class="exam-task-options">${mc.opts.slice(0,4).map(o=>`<span class="exam-opt">${o.letter}</span>`).join('')}${mc.opts.length>4?`<span class="exam-opt-more">+${mc.opts.length-4}</span>`:''}</div>`:''}
    </div>
    <div class="exam-task-actions">
      <span class="progress-dot pd-${prog||'none'}"></span>
      <span class="exam-sol-dot ${hasSol?'sol-yes':'sol-no'}"></span>
      <button class="exam-open-task">Odpri</button>
    </div>`;
  item.addEventListener('click', ()=>{ state.modalTaskList=list; state.modalIndex=idx; openModal(task); });
  return item;
}

/* ─── TOPICS VIEW ────────────────────────────────────────────── */
function buildTopicsView(){
  const chips = document.getElementById('topic-filter-chips');
  chips.innerHTML = '';
  for(const topic of state.topics){
    const chip = document.createElement('div');
    chip.className='filter-chip'; chip.dataset.topic=topic; chip.textContent=topic;
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
  [...state.years].sort((a,b)=>b-a).forEach(y=>yearSel.innerHTML+=`<option value="${y}">${y}</option>`);
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
  if(state.topicFilter) tasks=tasks.filter(t=>t.topic===state.topicFilter);
  if(state.topicYear)   tasks=tasks.filter(t=>t.year==state.topicYear);
  if(state.topicPola)   tasks=tasks.filter(t=>t.pola===state.topicPola);
  state.topicFiltered=tasks; state.topicPage=0;
  document.getElementById('topic-results-meta').textContent=`${tasks.length} nalog`;
  const grid=document.getElementById('topic-task-grid');
  grid.innerHTML='';
  if(!tasks.length){ grid.innerHTML=emptyState('Ni nalog za izbrane filtre.'); return; }
  state.modalTaskList=tasks;
  renderTaskSlice(tasks,0,grid,'topic-load-more');
}

/* ─── YEARS VIEW ─────────────────────────────────────────────── */
function buildYearsView(){
  const chips=document.getElementById('year-filter-chips');
  chips.innerHTML='';
  [...state.years].sort((a,b)=>b-a).forEach(year=>{
    const chip=document.createElement('div');
    chip.className='year-chip'; chip.dataset.year=year; chip.textContent=year;
    chip.addEventListener('click', ()=>{
      const active=state.yearFilter===year;
      state.yearFilter=active?null:year;
      chips.querySelectorAll('.year-chip').forEach(c=>c.classList.remove('active'));
      if(!active) chip.classList.add('active');
      renderYears();
    });
    chips.appendChild(chip);
  });
  const topicSel=document.getElementById('year-topic-filter');
  topicSel.innerHTML='<option value="">Vse kategorije</option>';
  state.topics.forEach(t=>topicSel.innerHTML+=`<option value="${t}">${t}</option>`);
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
  let tasks=state.tasks;
  if(state.yearFilter) tasks=tasks.filter(t=>t.year===state.yearFilter);
  if(state.yearPola)   tasks=tasks.filter(t=>t.pola===state.yearPola);
  if(state.yearTopic)  tasks=tasks.filter(t=>t.topic===state.yearTopic);
  tasks=[...tasks].sort((a,b)=>b.year-a.year||a.num-b.num);
  state.yearFiltered=tasks; state.yearPage=0;
  document.getElementById('year-results-meta').textContent=`${tasks.length} nalog`;
  const grid=document.getElementById('year-task-grid');
  grid.innerHTML='';
  if(!tasks.length){ grid.innerHTML=emptyState('Ni nalog.'); return; }
  state.modalTaskList=tasks;
  renderTaskSlice(tasks,0,grid,'year-load-more');
}

/* ─── SEARCH ─────────────────────────────────────────────────── */
function setupSearch(){
  let debounce;
  const doSearch=q=>{ state.searchQuery=q; if(!q.trim()){ showHome(); return; } runSearch(q); showView('search'); setNavActive('none'); };
  const handler=e=>{ clearTimeout(debounce); const q=e.target.value; if(q.length<2) return; debounce=setTimeout(()=>doSearch(q),280); };
  document.getElementById('global-search').addEventListener('input',handler);
  document.getElementById('mobile-search').addEventListener('input',handler);
  document.getElementById('global-search').addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.target.value=''; showHome(); } });
}

function runSearch(q){
  const tokens=q.toLowerCase().split(/\s+/).filter(Boolean);
  const results=state.tasks.filter(t=>{ const h=(t.text+' '+(t.solution||'')+' '+t.topic+' '+t.year).toLowerCase(); return tokens.every(tok=>h.includes(tok)); });
  state.searchFiltered=results; state.searchPage=0;
  document.getElementById('search-results-meta').textContent=`${results.length} zadetkov za "${q}"`;
  const grid=document.getElementById('search-task-grid');
  grid.innerHTML='';
  if(!results.length){ grid.innerHTML=emptyState(`Ni zadetkov za "${q}".`); return; }
  state.modalTaskList=results;
  renderTaskSlice(results,0,grid,'search-load-more',q);
}

/* ─── TASK CARDS ─────────────────────────────────────────────── */
function renderTaskSlice(tasks, page, grid, loadMoreId, searchQuery){
  const slice=tasks.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  slice.forEach((task,i)=>{
    const card=buildTaskCard(task,searchQuery,tasks,page*PAGE_SIZE+i);
    card.style.animationDelay=`${(i%PAGE_SIZE)*15}ms`;
    grid.appendChild(card);
  });
  const btn=document.getElementById(loadMoreId);
  tasks.length<=(page+1)*PAGE_SIZE ? btn.classList.add('hidden') : btn.classList.remove('hidden');
}

function buildTaskCard(task, searchQuery, taskList, taskIndex){
  const card=document.createElement('div');
  card.className='task-card';
  card.dataset.taskId=task.id;
  const prog=Progress.get(task.id);
  card.dataset.progress=prog||'';
  const hasSol=!!task.solution;
  const hasImg=!!task.image;

  let previewEscaped=escHtml(task.text);
  if(searchQuery){
    const tokens=searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    for(const tok of tokens)
      previewEscaped=previewEscaped.replace(new RegExp(`(${escRe(escHtml(tok))})`, 'gi'), '<mark class="highlight">$1</mark>');
  }

  card.innerHTML=`
    <div class="task-card-header">
      <span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span>
      <span class="task-num">N${task.num} · ${task.pola}</span>
      <span class="task-points">${task.points}pt</span>
    </div>
    <div class="task-card-body">
      <div class="task-text">${formatCardText(previewEscaped)}</div>
    </div>
    <div class="task-card-footer">
      <span class="task-footer-year">${task.year}</span>
      <span class="task-footer-has-sol ${hasSol?'has-solution':'no-solution'}">${hasSol?'✓ Rešitev':'—'}</span>
      ${hasImg?'<span class="task-footer-img">📷</span>':''}
      <span class="progress-dot pd-${prog||'none'}" title="${prog||''}"></span>
      <button class="expand-btn">Odpri →</button>
    </div>`;
  card.addEventListener('click', ()=>{ if(taskList){ state.modalTaskList=taskList; state.modalIndex=taskIndex; } openModal(task); });
  return card;
}

/* ─── MODAL ──────────────────────────────────────────────────── */
function openModal(task){
  const idx=state.modalTaskList.findIndex(t=>t.id===task.id);
  state.modalIndex=idx>=0?idx:state.modalIndex;
  const mc=parseMC(task);
  const hasSol=!!task.solution;
  const solId='sol-'+task.id;
  const btnId='sbtn-'+task.id;
  const mcId='mc-'+task.id;
  let questionText=task.text;
  if(mc) questionText=questionText.replace(/\n[A-E]\n[\s\S]*/,'').trim();
  const isCode=task.solution&&/[{};]/.test(task.solution)&&task.solution.includes('\n');
  const hasPrev=state.modalIndex>0;
  const hasNext=state.modalIndex<state.modalTaskList.length-1;
  const navInfo=state.modalTaskList.length>1
    ?`<span class="modal-nav-info">${state.modalIndex+1} / ${state.modalTaskList.length}</span>`:'';
  const prog=Progress.get(task.id);

  document.getElementById('modal-body').innerHTML=`
    <div class="modal-nav-bar">
      <button class="modal-nav-btn ${hasPrev?'':'disabled'}" onclick="navigateModal(-1)" ${hasPrev?'':'disabled'}>← Prejšnja</button>
      ${navInfo}
      <button class="modal-nav-btn ${hasNext?'':'disabled'}" onclick="navigateModal(1)" ${hasNext?'':'disabled'}>Naslednja →</button>
    </div>
    <div class="modal-task-header">
      <span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span>
      <span style="font-size:13px;color:var(--text-3);font-family:var(--font-mono)">${task.year} · ${task.pola} · N${task.num}</span>
      <span style="font-size:13px;color:var(--text-3);margin-left:auto">${task.points} točk</span>
    </div>
    <div class="modal-task-body">${formatModalText(questionText)}</div>
    ${task.image?`<img src="${task.image}" class="modal-task-img" alt="Naloga ${task.num}" loading="lazy">`:''}
    ${mc?buildMCWidget(mc,mcId,task):''}
    ${!mc&&hasSol?`
      <button class="modal-solution-toggle" id="${btnId}" onclick="toggleSolution('${solId}','${btnId}')">🔒 Prikaži rešitev</button>
      <div class="modal-solution-box" id="${solId}">
        <div class="modal-solution-label">✓ Rešitev</div>
        <div class="modal-solution-text ${isCode?'':'plain'}">${escHtml(task.solution)}</div>
      </div>`:''}
    ${!mc&&!hasSol?`<div class="modal-solution-box" style="display:block;background:var(--bg-3);border:1px solid var(--border)"><div class="modal-solution-label" style="color:var(--text-3)">Rešitev ni na voljo</div></div>`:''}
    <div class="modal-progress-row">
      <span class="modal-prog-label">Tvoj status:</span>
      <button class="mpb mpb-correct ${prog==='correct'?'active':''}" onclick="setTaskProgress('${task.id}','correct')">✓ Znam</button>
      <button class="mpb mpb-wrong   ${prog==='wrong'?'active':''}"   onclick="setTaskProgress('${task.id}','wrong')">✗ Ne znam</button>
      <button class="mpb mpb-skip    ${prog==='skipped'?'active':''}" onclick="setTaskProgress('${task.id}','skipped')">↷ Preskočeno</button>
    </div>`;

  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}

function setTaskProgress(taskId, status){
  Progress.set(taskId, status);
  // update button states
  document.querySelectorAll('.mpb').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.mpb-${status==='correct'?'correct':status==='wrong'?'wrong':'skip'}`)?.classList.add('active');
  updateProgressBar();
}

function navigateModal(dir){
  const newIdx=state.modalIndex+dir;
  if(newIdx<0||newIdx>=state.modalTaskList.length) return;
  state.modalIndex=newIdx;
  openModal(state.modalTaskList[newIdx]);
}

/* ─── MC WIDGET ──────────────────────────────────────────────── */
function parseMC(task){
  const optPattern=/\n([A-E])\n([^\n]+)/g;
  const opts=[]; let m;
  while((m=optPattern.exec(task.text))!==null) opts.push({letter:m[1],text:m[2].trim()});
  if(opts.length<2) return null;
  let correct=[];
  if(task.solution){ const solLine=task.solution.split('\n')[0]; correct=solLine.match(/[A-E]/g)||[]; }
  return {opts,correct,isMulti:correct.length>1};
}

function buildMCWidget(mc, mcId, task){
  const hasSol=mc.correct.length>0;
  const inputType=mc.isMulti?'checkbox':'radio';
  const opts=mc.opts.map(o=>`
    <label class="mc-option" data-letter="${o.letter}">
      <input type="${inputType}" name="${mcId}" value="${o.letter}" class="mc-input">
      <span class="mc-letter">${o.letter}</span>
      <span class="mc-text">${escHtml(o.text)}</span>
    </label>`).join('');
  return `<div class="mc-widget" id="${mcId}">
    <div class="mc-hint">${mc.isMulti?'Izberi vse pravilne odgovore':'Izberi en odgovor'}</div>
    <div class="mc-options">${opts}</div>
    ${hasSol?`<button class="mc-submit" onclick="submitMC('${mcId}','${task.id}')">Potrdi odgovor</button>`:''}
    ${!hasSol?`<div class="mc-no-sol">Rešitev za to nalogo ni na voljo.</div>`:''}
    <div class="mc-feedback hidden" id="fb-${mcId}"></div>
  </div>`;
}

function submitMC(mcId, taskId){
  const task=state.tasks.find(t=>t.id===taskId);
  if(!task) return;
  const mc=parseMC(task);
  if(!mc) return;
  const widget=document.getElementById(mcId);
  const selected=[...widget.querySelectorAll('.mc-input:checked')].map(i=>i.value);
  if(!selected.length){ const fb=document.getElementById('fb-'+mcId); fb.className='mc-feedback mc-feedback-warn'; fb.textContent='Izberi vsaj en odgovor.'; return; }
  widget.querySelectorAll('.mc-input').forEach(i=>i.disabled=true);
  widget.querySelector('.mc-submit').disabled=true;
  widget.querySelectorAll('.mc-option').forEach(label=>{
    const letter=label.dataset.letter;
    const isCorrect=mc.correct.includes(letter);
    const isSelected=selected.includes(letter);
    if(isCorrect&&isSelected) label.classList.add('mc-correct');
    else if(!isCorrect&&isSelected) label.classList.add('mc-wrong');
    else if(isCorrect&&!isSelected) label.classList.add('mc-missed');
  });
  const allRight=mc.correct.length>0&&selected.length===mc.correct.length&&selected.every(s=>mc.correct.includes(s));
  const fb=document.getElementById('fb-'+mcId);
  fb.className='mc-feedback '+(allRight?'mc-feedback-ok':'mc-feedback-err');
  fb.innerHTML=allRight?'✓ Pravilno!':`✗ Napačno. Pravilni odgovori: <strong>${mc.correct.join(', ')}</strong>`;
  const status=allRight?'correct':'wrong';
  Progress.set(taskId,status);
  updateProgressBar();
}

function toggleSolution(solId, btnId){
  const box=document.getElementById(solId);
  const btn=document.getElementById(btnId);
  const open=box.classList.toggle('open');
  btn.classList.toggle('revealed',open);
  btn.textContent=open?'🔓 Skrij rešitev':'🔒 Prikaži rešitev';
}

function closeModal(){
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow='';
}

/* ─── TEXT FORMATTING ────────────────────────────────────────── */
function formatCardText(escapedHtml){ return escapedHtml.split('\n').slice(0,6).join('<br>'); }

function formatModalText(text){
  const lines=text.split('\n'); const out=[]; let code=[],inCode=false;
  for(const line of lines){
    const t=line.trim();
    const isC=/^\s{2,}/.test(line)&&/[{};=()]/.test(t)||/^(public|private|static|void|int|double|class|if|for|while|return|String|char|boolean|float|long)\b/.test(t);
    if(isC){ inCode=true; code.push(escHtml(line)); }
    else{ if(inCode){ out.push(`<pre class="modal-code"><code>${code.join('\n')}</code></pre>`); inCode=false; code=[]; } out.push(t===''?'<br>':`<p>${escHtml(line)}</p>`); }
  }
  if(inCode) out.push(`<pre class="modal-code"><code>${code.join('\n')}</code></pre>`);
  return out.join('');
}

/* ─── LOAD MORE ──────────────────────────────────────────────── */
function loadMoreTopic(){ state.topicPage++; renderTaskSlice(state.topicFiltered,state.topicPage,document.getElementById('topic-task-grid'),'topic-load-more'); }
function loadMoreYear(){  state.yearPage++;  renderTaskSlice(state.yearFiltered, state.yearPage, document.getElementById('year-task-grid'), 'year-load-more'); }
function loadMoreSearch(){ state.searchPage++; renderTaskSlice(state.searchFiltered,state.searchPage,document.getElementById('search-task-grid'),'search-load-more',state.searchQuery); }

/* ─── NAV ────────────────────────────────────────────────────── */
function showView(name){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById('view-'+name).classList.add('active'); window.scrollTo(0,0); }
function setNavActive(which){ ['home','topics','exams','years','quiz'].forEach(n=>document.getElementById('nav-'+n)?.classList.remove('active')); if(which!=='none') document.getElementById('nav-'+which)?.classList.add('active'); }
function showHome(){ showView('home'); setNavActive('home'); document.getElementById('global-search').value=''; updateProgressBar(); buildHome(); }
function showTopics(preselect){ showView('topics'); setNavActive('topics'); if(preselect){ state.topicFilter=preselect; document.querySelectorAll('#topic-filter-chips .filter-chip').forEach(c=>c.classList.toggle('active',c.dataset.topic===preselect)); } renderTopics(); }
function showExams(){ buildExamsView(); showView('exams'); setNavActive('exams'); }
function showYears(preselect){ showView('years'); setNavActive('years'); if(preselect){ state.yearFilter=preselect; document.querySelectorAll('#year-filter-chips .year-chip').forEach(c=>c.classList.toggle('active',c.dataset.year==preselect)); } renderYears(); }

/* ─── MOBILE NAV ─────────────────────────────────────────────── */
document.getElementById('nav-burger').addEventListener('click',()=>{ document.getElementById('mobile-nav').classList.add('open'); document.body.style.overflow='hidden'; });
document.getElementById('mobile-nav-close').addEventListener('click',closeMobileNav);
function closeMobileNav(){ document.getElementById('mobile-nav').classList.remove('open'); document.body.style.overflow=''; }

/* ─── KEYBOARD ───────────────────────────────────────────────── */
document.addEventListener('keydown',e=>{
  if(document.getElementById('modal').classList.contains('open')){
    if(e.key==='ArrowLeft')  navigateModal(-1);
    if(e.key==='ArrowRight') navigateModal(1);
    if(e.key==='Escape')     closeModal();
    return;
  }
  if(e.key==='Escape') closeMobileNav();
  if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){ e.preventDefault(); document.getElementById('global-search').focus(); }
});

/* ─── HELPERS ────────────────────────────────────────────────── */
const escHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const emptyState=msg=>`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Nič ni bilo najdeno</div><div class="empty-state-desc">${msg}</div></div>`;

init();
