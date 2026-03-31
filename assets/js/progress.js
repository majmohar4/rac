/* ═══════════════════════════════════════════════════════════════
   Progress & Quiz Module
   localStorage: key "matura_progress" → { taskId: status }
   status: 'correct' | 'wrong' | 'skipped'
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'matura_progress';

/* ─── STORAGE ────────────────────────────────────────────────── */
const Progress = {
  _cache: null,

  load(){
    if(!this._cache){
      try { this._cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
      catch(e){ this._cache = {}; }
    }
    return this._cache;
  },

  save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cache)); },

  set(taskId, status){
    this.load()[taskId] = status;
    this.save();
    this._updateUI(taskId);
  },

  get(taskId){ return this.load()[taskId] || null; },

  clear(){
    this._cache = {};
    localStorage.removeItem(STORAGE_KEY);
  },

  stats(){
    const p = this.load();
    const all = Object.values(p);
    return {
      total:   all.length,
      correct: all.filter(v=>v==='correct').length,
      wrong:   all.filter(v=>v==='wrong').length,
      skipped: all.filter(v=>v==='skipped').length,
    };
  },

  // Update card badge if visible
  _updateUI(taskId){
    document.querySelectorAll(`[data-task-id="${taskId}"]`).forEach(el=>{
      el.dataset.progress = this.get(taskId) || '';
      const badge = el.querySelector('.progress-dot');
      if(badge) badge.className = 'progress-dot pd-'+( this.get(taskId)||'none' );
    });
    updateProgressBar();
  }
};

/* ─── PROGRESS BAR (global) ──────────────────────────────────── */
function updateProgressBar(){
  const s = Progress.stats();
  const total = state.tasks.length;
  const pct = total ? Math.round(s.total / total * 100) : 0;
  const el = document.getElementById('progress-bar-fill');
  const txt = document.getElementById('progress-bar-text');
  if(el) el.style.width = pct+'%';
  if(txt) txt.textContent = `${s.correct} ✓  ${s.wrong} ✗  ${s.skipped} preskočeno  —  ${pct}% rešeno`;
}

/* ═══════════════════════════════════════════════════════════════
   QUIZ MODE
   ═══════════════════════════════════════════════════════════════ */
const Quiz = {
  tasks: [],
  index: 0,
  correct: 0,
  wrong: 0,
  skipped: 0,
  answered: false,
  settings: { topics: [], onlyUnsolved: false, count: 20 },

  start(settings){
    this.settings = settings;
    let pool = state.tasks;
    if(settings.topics.length)
      pool = pool.filter(t=>settings.topics.includes(t.topic));
    if(settings.onlyUnsolved)
      pool = pool.filter(t=>!Progress.get(t.id));
    // Shuffle
    pool = [...pool].sort(()=>Math.random()-.5);
    this.tasks = pool.slice(0, settings.count);
    this.index = 0;
    this.correct = 0; this.wrong = 0; this.skipped = 0;
    this.answered = false;
    if(!this.tasks.length){
      alert('Ni nalog za izbrane filtre!'); return;
    }
    showView('quiz');
    setNavActive('none');
    this.render();
  },

  current(){ return this.tasks[this.index]; },

  render(){
    const task = this.current();
    if(!task){ this.showResults(); return; }
    this.answered = false;

    const mc = parseMC(task);
    const qEl = document.getElementById('quiz-question');
    const progEl = document.getElementById('quiz-progress');
    const hintEl = document.getElementById('quiz-hint');
    const actionsEl = document.getElementById('quiz-actions');

    // Progress
    progEl.innerHTML = `
      <div class="quiz-prog-bar">
        <div class="quiz-prog-fill" style="width:${this.index/this.tasks.length*100}%"></div>
      </div>
      <div class="quiz-prog-text">
        <span>${this.index+1} / ${this.tasks.length}</span>
        <span class="qp-correct">✓ ${this.correct}</span>
        <span class="qp-wrong">✗ ${this.wrong}</span>
        <button class="btn-ghost btn-sm" onclick="Quiz.exit()">Zapri</button>
      </div>`;

    // Question
    let questionText = task.text;
    if(mc) questionText = questionText.replace(/\n[A-E]\n[\s\S]*/,'').trim();

    qEl.innerHTML = `
      <div class="quiz-meta">
        <span class="task-badge ${topicClass(task.topic)}" style="--tc:${topicColor(task.topic)}">${task.topic}</span>
        <span class="quiz-year">${task.year} · ${task.pola} · N${task.num}</span>
      </div>
      <div class="quiz-text">${formatModalText(questionText)}</div>
      ${task.image ? `<img src="${task.image}" class="modal-task-img" alt="Naloga">` : ''}
      ${mc ? this.buildMC(mc, task) : this.buildOpenQ(task)}`;

    hintEl.innerHTML = '';
    actionsEl.innerHTML = mc ? '' : `
      <button class="btn-primary" onclick="Quiz.submitOpen()">Prikaži rešitev</button>
      <button class="btn-ghost" onclick="Quiz.skip()">Preskoči</button>`;
  },

  buildMC(mc, task){
    const inputType = mc.isMulti ? 'checkbox' : 'radio';
    const opts = mc.opts.map(o=>`
      <label class="mc-option quiz-mc-option" data-letter="${o.letter}">
        <input type="${inputType}" name="quiz_mc" value="${o.letter}" class="mc-input">
        <span class="mc-letter">${o.letter}</span>
        <span class="mc-text">${escHtml(o.text)}</span>
      </label>`).join('');
    return `<div class="mc-widget quiz-mc" id="quiz-mc">
      <div class="mc-hint">${mc.isMulti?'Izberi vse pravilne odgovore':'Izberi en odgovor'}</div>
      <div class="mc-options">${opts}</div>
      <div class="quiz-mc-actions">
        <button class="btn-primary" onclick="Quiz.submitMC()">Potrdi</button>
        <button class="btn-ghost" onclick="Quiz.skip()">Preskoči</button>
      </div>
      <div class="mc-feedback hidden" id="quiz-mc-feedback"></div>
    </div>`;
  },

  buildOpenQ(task){
    return `<div class="quiz-open">
      <div class="quiz-open-hint">Odgovor je odprtega tipa</div>
    </div>`;
  },

  submitMC(){
    const task = this.current();
    const mc = parseMC(task);
    if(!mc || this.answered) return;
    const widget = document.getElementById('quiz-mc');
    if(!widget) return;
    const selected = [...widget.querySelectorAll('.mc-input:checked')].map(i=>i.value);
    if(!selected.length){ return; }
    this.answered = true;

    widget.querySelectorAll('.mc-input').forEach(i=>i.disabled=true);
    widget.querySelector('button.btn-primary').disabled = true;

    widget.querySelectorAll('.quiz-mc-option').forEach(label=>{
      const letter = label.dataset.letter;
      const isCorrect  = mc.correct.includes(letter);
      const isSelected = selected.includes(letter);
      if(isCorrect && isSelected)  label.classList.add('mc-correct');
      else if(!isCorrect && isSelected) label.classList.add('mc-wrong');
      else if(isCorrect && !isSelected) label.classList.add('mc-missed');
    });

    const allRight = mc.correct.length > 0 && selected.length===mc.correct.length && selected.every(s=>mc.correct.includes(s));
    const fb = document.getElementById('quiz-mc-feedback');
    fb.className = 'mc-feedback '+(allRight?'mc-feedback-ok':'mc-feedback-err');
    fb.innerHTML = allRight
      ? '✓ Pravilno!'
      : `✗ Napačno. Pravilni odgovori: <strong>${mc.correct.join(', ')}</strong>`;

    const status = allRight ? 'correct' : 'wrong';
    if(allRight) this.correct++; else this.wrong++;
    Progress.set(task.id, status);

    document.getElementById('quiz-actions').innerHTML = `
      <button class="btn-primary" onclick="Quiz.next()">Naslednja →</button>`;
  },

  submitOpen(){
    const task = this.current();
    if(this.answered) return;
    this.answered = true;
    const isCode = task.solution && /[{};]/.test(task.solution) && task.solution.includes('\n');
    document.getElementById('quiz-hint').innerHTML = `
      <div class="quiz-solution-reveal">
        <div class="modal-solution-label">✓ Rešitev</div>
        <div class="modal-solution-text ${isCode?'':'plain'}">${escHtml(task.solution||'—')}</div>
      </div>`;
    document.getElementById('quiz-actions').innerHTML = `
      <div class="quiz-self-eval">
        <span class="quiz-eval-label">Ali si odgovoril pravilno?</span>
        <button class="btn-quiz-correct" onclick="Quiz.markSelf('correct')">✓ Da</button>
        <button class="btn-quiz-wrong"   onclick="Quiz.markSelf('wrong')">✗ Ne</button>
        <button class="btn-ghost"        onclick="Quiz.markSelf('skipped')">Preskočeno</button>
      </div>`;
  },

  markSelf(status){
    const task = this.current();
    Progress.set(task.id, status);
    if(status==='correct') this.correct++;
    else if(status==='wrong') this.wrong++;
    else this.skipped++;
    document.getElementById('quiz-actions').innerHTML = `
      <button class="btn-primary" onclick="Quiz.next()">Naslednja →</button>`;
  },

  skip(){
    const task = this.current();
    Progress.set(task.id, 'skipped');
    this.skipped++;
    this.next();
  },

  next(){
    this.index++;
    if(this.index >= this.tasks.length){ this.showResults(); return; }
    this.answered = false;
    this.render();
  },

  showResults(){
    const total = this.tasks.length;
    const pct = total ? Math.round(this.correct/total*100) : 0;
    const qEl = document.getElementById('quiz-question');
    const progEl = document.getElementById('quiz-progress');
    document.getElementById('quiz-hint').innerHTML = '';
    document.getElementById('quiz-actions').innerHTML = '';

    progEl.innerHTML = `<div class="quiz-prog-text"><span>Zaključeno</span></div>`;
    qEl.innerHTML = `
      <div class="quiz-results">
        <div class="quiz-results-icon">${pct>=70?'🎉':pct>=40?'📚':'💪'}</div>
        <div class="quiz-results-score">${pct}%</div>
        <div class="quiz-results-sub">${this.correct} pravilno · ${this.wrong} napačno · ${this.skipped} preskočeno od ${total}</div>
        <div class="quiz-results-actions">
          <button class="btn-primary" onclick="showView('quiz-setup');setNavActive('none')">Novo vadenje →</button>
          <button class="btn-secondary" onclick="Quiz.exit()">Domov</button>
        </div>
      </div>`;
  },

  exit(){
    showHome();
  }
};
