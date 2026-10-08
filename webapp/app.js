/* ===========================================================
   FIA Teil 2 · Prüfungstrainer
   Gamified practice tool built from the Kann-Liste Excel data.
   =========================================================== */

const STORAGE_KEY = 'fiaT2TrainerState_v1';

const MASTERY_FACTOR = { offen: 0, geuebt: 0.5, beherrscht: 1 };
const STATUS_ORDER = ['offen', 'geuebt', 'beherrscht'];
const STATUS_LABEL = { offen: 'Offen', geuebt: 'In Übung', beherrscht: 'Beherrscht' };
const STATUS_ICON = { offen: '○', geuebt: '◐', beherrscht: '✓' };

const LEVEL_TIERS = [
  { max: 5, title: 'Azubi' },
  { max: 10, title: 'Junior Entwickler·in' },
  { max: 15, title: 'Entwickler·in' },
  { max: 20, title: 'Senior Entwickler·in' },
  { max: 25, title: 'Prüfungsmeister·in' },
];

const FOCUS_SESSION_SIZE = 10;

/* ---------- Flatten data ---------- */

const TOTAL_WEIGHT = EXAM_DATA.reduce(
  (sum, t) => sum + t.checkpoints.reduce((s, c) => s + c.weight, 0), 0
);

const CHECKPOINT_INDEX = {};
EXAM_DATA.forEach(topic => {
  topic.checkpoints.forEach(cp => {
    CHECKPOINT_INDEX[cp.nr] = { ...cp, topicId: topic.id, topicName: topic.name, topicWeight: topic.weight };
  });
});

/* ---------- State persistence ---------- */

function defaultState() {
  return {
    checkpoints: {},
    cash: 0,
    exerciseProgress: {},
    unlockedMilestones: [],
    focusRatingsTotal: 0,
    purchasedItems: ['theme-default'],
    equipped: { theme: 'theme-default', cashIcon: '💰', confetti: 'classic', toast: 'classic', badge: 'T2' },
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const merged = { ...defaultState(), ...parsed };
    merged.equipped = { ...defaultState().equipped, ...(parsed.equipped || {}) };
    if (!merged.purchasedItems.includes('theme-default')) merged.purchasedItems.push('theme-default');
    return merged;
  } catch (e) {
    console.warn('Konnte Fortschritt nicht laden, starte neu.', e);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Fortschritt konnte nicht gespeichert werden.', e);
    showToast('⚠ Fortschritt konnte nicht gespeichert werden (Speicher voll?)', 'info');
  }
}

function getStatus(nr) {
  return (state.checkpoints[nr] && state.checkpoints[nr].status) || 'offen';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function setStatus(nr, status, opts = {}) {
  const prev = getStatus(nr);
  state.checkpoints[nr] = { status, updatedAt: new Date().toISOString() };
  saveState();
  if (!opts.silent) {
    checkMilestones({ changedNr: nr, prevStatus: prev, newStatus: status });
  }
}

function formatCash(amount) {
  return Math.round(amount).toLocaleString('de-DE');
}

/* ---------- Stats & levelling ---------- */

function computeStats() {
  let mastered = 0, practiced = 0, open = 0, weightedScore = 0;
  const perTopic = {};

  EXAM_DATA.forEach(topic => {
    let topicWeightedScore = 0;
    let topicTotalWeight = 0;
    topic.checkpoints.forEach(cp => {
      const status = getStatus(cp.nr);
      const factor = MASTERY_FACTOR[status];
      weightedScore += cp.weight * factor;
      topicWeightedScore += cp.weight * factor;
      topicTotalWeight += cp.weight;
      if (status === 'beherrscht') mastered++;
      else if (status === 'geuebt') practiced++;
      else open++;
    });
    perTopic[topic.id] = {
      percent: topicTotalWeight ? (topicWeightedScore / topicTotalWeight) * 100 : 0,
      mastered: topic.checkpoints.every(cp => getStatus(cp.nr) === 'beherrscht'),
    };
  });

  const percent = TOTAL_WEIGHT ? (weightedScore / TOTAL_WEIGHT) * 100 : 0;
  return { mastered, practiced, open, percent, weightedScore, perTopic };
}

function levelFromPercent(percent) {
  const lvl = Math.min(25, Math.max(1, Math.floor(percent / 4) + 1));
  return lvl;
}

function levelTitle(level) {
  const tier = LEVEL_TIERS.find(t => level <= t.max) || LEVEL_TIERS[LEVEL_TIERS.length - 1];
  return tier.title;
}

/* ---------- Milestone definitions ---------- */

function globalMilestoneDefs() {
  return [
    { id: 'first_step', icon: '🚀', title: 'Erste Schritte', desc: 'Erstes Lernziel bearbeitet.' },
    { id: 'cash_100', icon: '💵', title: '100$ verdient', desc: 'Durch Übungsaufgaben 100$ Cash gesammelt.' },
    { id: 'cash_500', icon: '💰', title: '500$ verdient', desc: 'Durch Übungsaufgaben 500$ Cash gesammelt.' },
    { id: 'cash_1500', icon: '🏦', title: '1.500$ verdient', desc: 'Durch Übungsaufgaben 1.500$ Cash gesammelt.' },
    { id: 'cash_3000', icon: '👑', title: '3.000$ verdient', desc: 'Durch Übungsaufgaben 3.000$ Cash gesammelt.' },
    { id: 'exercise_first', icon: '📝', title: 'Erste Übungsaufgabe', desc: 'Eine Übungsaufgabe abgeschlossen und bewertet.' },
    { id: 'exercise_perfect', icon: '🎯', title: 'Perfekte Lösung', desc: '100% Score bei einer Übungsaufgabe erreicht.' },
    { id: 'exercise_all', icon: '🏅', title: 'Alle Übungsaufgaben probiert', desc: 'Jede Übungsaufgabe mindestens einmal abgeschlossen.' },
    { id: 'readiness_25', icon: '🥉', title: '25% Prüfungsreife', desc: 'Ein Viertel des Stoffs gewichtet gemeistert.' },
    { id: 'readiness_50', icon: '🥈', title: '50% Prüfungsreife', desc: 'Die Hälfte des Stoffs gewichtet gemeistert.' },
    { id: 'readiness_75', icon: '🥇', title: '75% Prüfungsreife', desc: 'Drei Viertel des Stoffs gewichtet gemeistert.' },
    { id: 'readiness_100', icon: '🏆', title: 'Prüfungsreif!', desc: '100% gewichtete Prüfungsreife erreicht.' },
    { id: 'focus_10', icon: '🎯', title: 'Fokus-Einsteiger', desc: '10 Lernziele im Fokus-Modus bewertet.' },
    { id: 'focus_50', icon: '🎯', title: 'Fokus-Profi', desc: '50 Lernziele im Fokus-Modus bewertet.' },
  ];
}

function topicMilestoneDefs() {
  return EXAM_DATA.map(t => ({
    id: `topic_${t.id}`,
    icon: '✅',
    title: `Themenbereich ${String(t.id).padStart(2, '0')} gemeistert`,
    desc: t.name,
  }));
}

function allMilestoneDefs() {
  return [...globalMilestoneDefs(), ...topicMilestoneDefs()];
}

function unlockMilestone(id, def) {
  if (state.unlockedMilestones.includes(id)) return false;
  state.unlockedMilestones.push(id);
  saveState();
  showToast(`${def.icon} Meilenstein freigeschaltet: ${def.title}`, 'milestone');
  burstConfetti();
  return true;
}

function checkMilestones({ changedNr, prevStatus, newStatus } = {}) {
  const stats = computeStats();
  const defs = Object.fromEntries(allMilestoneDefs().map(d => [d.id, d]));

  if (Object.keys(state.checkpoints).length >= 1) unlockMilestone('first_step', defs.first_step);

  if (state.cash >= 100) unlockMilestone('cash_100', defs.cash_100);
  if (state.cash >= 500) unlockMilestone('cash_500', defs.cash_500);
  if (state.cash >= 1500) unlockMilestone('cash_1500', defs.cash_1500);
  if (state.cash >= 3000) unlockMilestone('cash_3000', defs.cash_3000);

  const exProgress = Object.values(state.exerciseProgress);
  if (exProgress.some(p => p.attempts > 0)) unlockMilestone('exercise_first', defs.exercise_first);
  if (exProgress.some(p => p.bestScore >= 0.999)) unlockMilestone('exercise_perfect', defs.exercise_perfect);
  if (EXERCISES.every(ex => state.exerciseProgress[ex.id] && state.exerciseProgress[ex.id].attempts > 0)) {
    unlockMilestone('exercise_all', defs.exercise_all);
  }

  if (stats.percent >= 25) unlockMilestone('readiness_25', defs.readiness_25);
  if (stats.percent >= 50) unlockMilestone('readiness_50', defs.readiness_50);
  if (stats.percent >= 75) unlockMilestone('readiness_75', defs.readiness_75);
  if (stats.percent >= 99.999) unlockMilestone('readiness_100', defs.readiness_100);

  if (state.focusRatingsTotal >= 10) unlockMilestone('focus_10', defs.focus_10);
  if (state.focusRatingsTotal >= 50) unlockMilestone('focus_50', defs.focus_50);

  if (changedNr) {
    const topicId = CHECKPOINT_INDEX[changedNr].topicId;
    if (stats.perTopic[topicId].mastered) {
      unlockMilestone(`topic_${topicId}`, defs[`topic_${topicId}`]);
    }
  } else {
    EXAM_DATA.forEach(t => {
      if (stats.perTopic[t.id].mastered) unlockMilestone(`topic_${t.id}`, defs[`topic_${t.id}`]);
    });
  }

  renderHeader();
}

/* ---------- Rendering: header / level widget ---------- */

function renderHeader() {
  const stats = computeStats();
  const level = levelFromPercent(stats.percent);
  const title = levelTitle(level);

  document.getElementById('levelNumber').textContent = level;
  document.getElementById('levelTitle').textContent = title;

  const levelFloor = (level - 1) * 4;
  const levelCeil = level * 4;
  const withinLevel = Math.max(0, Math.min(100, ((stats.percent - levelFloor) / (levelCeil - levelFloor)) * 100));
  document.getElementById('xpFill').style.width = `${withinLevel}%`;

  const xp = Math.round(stats.weightedScore * 1000);
  const maxXp = Math.round(TOTAL_WEIGHT * 1000);
  document.getElementById('xpText').textContent = `${xp} / ${maxXp} XP`;

  const ring = document.getElementById('levelRing');
  ring.style.background = `conic-gradient(var(--accent-2) ${withinLevel}%, var(--bg-elev-2) 0)`;

  document.getElementById('cashAmount').textContent = formatCash(state.cash);

  document.getElementById('overallPercent').textContent = `${Math.round(stats.percent)}%`;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (stats.percent / 100) * circumference;
  const overallRing = document.getElementById('overallRing');
  overallRing.style.strokeDasharray = circumference;
  overallRing.style.strokeDashoffset = offset;
  overallRing.style.stroke = stats.percent >= 75 ? 'var(--good)' : stats.percent >= 40 ? 'var(--mid)' : 'var(--accent-2)';

  document.getElementById('statMastered').textContent = stats.mastered;
  document.getElementById('statPracticed').textContent = stats.practiced;
  document.getElementById('statOpen').textContent = stats.open;
}

/* ---------- Rendering: topics grid ---------- */

function currentTopicList() {
  const stats = computeStats();
  const query = document.getElementById('searchInput').value.trim().toLocaleLowerCase('de');
  const sortMode = document.getElementById('sortSelect').value;

  let list = EXAM_DATA.filter(topic => {
    if (!query) return true;
    if (topic.name.toLocaleLowerCase('de').includes(query)) return true;
    return topic.checkpoints.some(cp => cp.text.toLocaleLowerCase('de').includes(query));
  });

  list = [...list];
  if (sortMode === 'weight') {
    list.sort((a, b) => b.weight - a.weight);
  } else if (sortMode === 'progress') {
    list.sort((a, b) => stats.perTopic[a.id].percent - stats.perTopic[b.id].percent);
  } else if (sortMode === 'number') {
    list.sort((a, b) => a.id - b.id);
  } else if (sortMode === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
  return list;
}

function renderTopicsGrid() {
  const stats = computeStats();
  const grid = document.getElementById('topicsGrid');
  const list = currentTopicList();

  grid.innerHTML = list.map(topic => {
    const p = stats.perTopic[topic.id];
    const pct = Math.round(p.percent);
    const exerciseCount = exercisesForTopic(topic.id).length;
    return `
      <div class="topic-card ${p.mastered ? 'mastered' : ''}" data-topic-id="${topic.id}">
        <div class="topic-top">
          <div class="topic-name">${String(topic.id).padStart(2, '0')} · ${escapeHtml(topic.name)}</div>
          <div class="topic-weight-badge">Gewicht ${Math.round(topic.weight * 100)}%</div>
        </div>
        <div class="topic-sub">${topic.checkpoints.length} Lernziele · ${pct}% beherrscht${exerciseCount ? ` · <span class="topic-badge-exercises">📝 ${exerciseCount} Übung${exerciseCount === 1 ? '' : 'en'}</span>` : ''}</div>
        <div class="topic-bar"><div class="topic-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('') || `<p style="color:var(--text-dim)">Keine Treffer für diese Suche.</p>`;

  grid.querySelectorAll('.topic-card').forEach(el => {
    el.addEventListener('click', () => openTopicDetail(Number(el.dataset.topicId)));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Topic detail overlay ---------- */

function openTopicDetail(topicId) {
  const topic = EXAM_DATA.find(t => t.id === topicId);
  topicExerciseFilter = 'all';
  document.querySelectorAll('#topicExerciseFilters .chip-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  renderTopicDetail(topic);
  showOverlay('topicOverlay');
}

function renderTopicDetail(topic) {
  const stats = computeStats();
  const nameEl = document.getElementById('topicDetailName');
  nameEl.textContent = `${String(topic.id).padStart(2, '0')} · ${topic.name}`;
  nameEl.dataset.topicId = topic.id;
  document.getElementById('topicDetailWeight').textContent = `Gewicht ${Math.round(topic.weight * 100)}%`;
  document.getElementById('topicDetailProgress').style.width = `${Math.round(stats.perTopic[topic.id].percent)}%`;

  const list = document.getElementById('checkpointList');
  list.innerHTML = topic.checkpoints.map(cp => {
    const status = getStatus(cp.nr);
    return `
      <div class="checkpoint-item" data-nr="${cp.nr}">
        <div class="checkpoint-text">
          <span class="checkpoint-nr">${cp.nr}</span>${escapeHtml(cp.text)}
          <span class="checkpoint-weight">Gewicht ${Math.round(cp.weight * 100)}%</span>
        </div>
        <div class="status-toggle">
          ${STATUS_ORDER.map(s => `
            <button class="status-dot ${s === status ? 'active' : ''}" data-s="${s}" title="${STATUS_LABEL[s]}">${STATUS_ICON[s]}</button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.checkpoint-item').forEach(item => {
    const nr = item.dataset.nr;
    item.querySelectorAll('.status-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        setStatus(nr, btn.dataset.s);
        renderTopicDetail(topic);
        renderTopicsGrid();
      });
    });
  });

  renderTopicExercises(topic);
}

/* ---------- Focus mode ---------- */

let focusQueue = [];
let focusCurrent = null;
let focusSessionStartXp = 0;
let focusSessionRatings = 0;

function buildFocusQueue() {
  const items = Object.values(CHECKPOINT_INDEX)
    .filter(cp => getStatus(cp.nr) !== 'beherrscht')
    .map(cp => {
      const factor = MASTERY_FACTOR[getStatus(cp.nr)];
      const priority = cp.weight * cp.topicWeight * (1 - factor * 0.5);
      return { ...cp, priority };
    })
    .sort((a, b) => b.priority - a.priority);
  return items.slice(0, FOCUS_SESSION_SIZE);
}

function startFocusMode() {
  focusQueue = buildFocusQueue();
  if (focusQueue.length === 0) {
    showToast('🏆 Alle Lernziele sind bereits beherrscht!', 'milestone');
    return;
  }
  focusSessionStartXp = computeStats().weightedScore;
  focusSessionRatings = 0;
  nextFocusCard();
  showOverlay('focusOverlay');
}

function nextFocusCard() {
  if (focusQueue.length === 0) {
    endFocusSession();
    return;
  }
  focusCurrent = focusQueue.shift();
  renderFocusCard();
}

function renderFocusCard() {
  const cp = focusCurrent;
  document.getElementById('focusTopicName').textContent = cp.topicName;
  document.getElementById('focusWeight').textContent = `Gewichtung ${Math.round(cp.weight * 100)}%`;
  document.getElementById('focusText').textContent = cp.text;

  const total = FOCUS_SESSION_SIZE;
  const done = total - focusQueue.length - 1;
  document.getElementById('focusProgressFill').style.width = `${Math.round((done / total) * 100)}%`;
}

function rateFocus(status) {
  setStatus(focusCurrent.nr, status);
  focusSessionRatings++;
  state.focusRatingsTotal++;
  saveState();
  checkMilestones({});
  renderTopicsGrid();
  nextFocusCard();
}

function skipFocusCard() {
  nextFocusCard();
}

function endFocusSession() {
  hideOverlay('focusOverlay');
  const xpGained = Math.round((computeStats().weightedScore - focusSessionStartXp) * 1000);
  document.getElementById('sessionSummary').textContent =
    `Du hast ${focusSessionRatings} Lernziele bewertet und ${xpGained} XP gesammelt. Weiter so!`;
  showOverlay('sessionDoneOverlay');
  if (focusSessionRatings > 0) burstConfetti(40);
}

/* ---------- Übungsaufgaben: Field-Check & Token-Check Engines ---------- */

const CASH_MULTIPLIER = { offen: 0.3, geuebt: 0.7, beherrscht: 1.1 };

let currentExercise = null;
let currentExerciseBuilt = null;
let currentExerciseScore = 0;
let exerciseReturnToTopicId = null;
let topicExerciseFilter = 'all';

function exerciseProgressFor(id) {
  if (!state.exerciseProgress[id]) {
    state.exerciseProgress[id] = { bestScore: 0, attempts: 0, lastRating: null, intervalDays: 0, nextReviewAt: null };
  }
  return state.exerciseProgress[id];
}

function exerciseRelevance(ex) {
  const weights = ex.checkpointNrs.map(nr => CHECKPOINT_INDEX[nr] ? CHECKPOINT_INDEX[nr].weight : 0);
  return weights.length ? weights.reduce((s, w) => s + w, 0) / weights.length : 0;
}

function exercisesForTopic(topicId) {
  return EXERCISES.filter(ex => ex.topicId === topicId);
}

function isExerciseDue(id) {
  const prog = state.exerciseProgress[id];
  if (!prog || !prog.nextReviewAt) return true;
  return new Date(prog.nextReviewAt).getTime() <= Date.now();
}

function renderTopicExercises(topic) {
  const section = document.getElementById('topicExercisesSection');
  const topicExercises = exercisesForTopic(topic.id);

  if (topicExercises.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  const grid = document.getElementById('topicExercisesGrid');
  const list = topicExercises.filter(ex => {
    const prog = exerciseProgressFor(ex.id);
    if (topicExerciseFilter === 'due') return prog.attempts > 0 && isExerciseDue(ex.id);
    if (topicExerciseFilter === 'new') return prog.attempts === 0;
    if (topicExerciseFilter === 'mastered') return prog.bestScore >= 0.999;
    return true;
  });

  grid.innerHTML = list.map(ex => {
    const prog = exerciseProgressFor(ex.id);
    const due = isExerciseDue(ex.id);
    const relevance = exerciseRelevance(ex);
    const bestPct = Math.round(prog.bestScore * 100);
    return `
      <div class="exercise-card" data-exercise-id="${ex.id}">
        <div class="exercise-top">
          <span class="exercise-icon">${ex.icon}</span>
          <span class="exercise-weight-badge">Relevanz ${Math.round(relevance * 100)}%</span>
        </div>
        <div class="exercise-name">${escapeHtml(ex.title)}</div>
        <div class="exercise-sub">Checkpoints ${ex.checkpointNrs.join(', ')}</div>
        <div class="exercise-foot">
          <span class="exercise-score ${prog.attempts ? '' : 'muted'}">${prog.attempts ? bestPct + '% beste Lösung' : 'Noch nicht versucht'}</span>
          ${prog.attempts ? `<span class="exercise-due ${due ? 'due' : ''}">${due ? '🔁 fällig' : '✓ frisch'}</span>` : ''}
        </div>
      </div>
    `;
  }).join('') || `<p style="color:var(--text-dim)">Keine Übungsaufgaben für diesen Filter.</p>`;

  grid.querySelectorAll('.exercise-card').forEach(el => {
    el.addEventListener('click', () => openExercise(el.dataset.exerciseId, { returnToTopicId: topic.id }));
  });
}


function matchText(value, expected, mode) {
  const v = (value || '').trim().toLowerCase();
  if (mode === 'dash-or-contains') {
    return v === '' || v === '-' || v === '—' || v === 'keine' || v === 'nein';
  }
  if (mode === 'contains-key') {
    const keys = expected.split(',').map(k => k.trim().toLowerCase());
    return keys.every(k => v.replace(/\s+/g, '').includes(k.replace(/\s+/g, '')));
  }
  return v === expected.toLowerCase();
}

function openExercise(id, opts = {}) {
  currentExercise = EXERCISE_INDEX[id];
  currentExerciseBuilt = null;
  currentExerciseScore = 0;
  exerciseReturnToTopicId = opts.returnToTopicId ?? null;
  const ex = currentExercise;

  if (exerciseReturnToTopicId) hideOverlay('topicOverlay');

  document.getElementById('exerciseMeta').innerHTML = `
    <span class="chip">${ex.icon} Themenbereich ${String(ex.topicId).padStart(2, '0')}</span>
    <span class="chip weight-chip">Checkpoints ${ex.checkpointNrs.join(', ')}</span>
  `;
  document.getElementById('exerciseTitle').textContent = ex.title;
  document.getElementById('exerciseIntro').innerHTML = ex.intro;

  const hintsBtn = document.getElementById('toggleExerciseHints');
  const hintsBody = document.getElementById('exerciseHintsBody');
  if (ex.hints) {
    hintsBtn.classList.remove('hidden');
    hintsBtn.textContent = 'Hinweise anzeigen ▾';
    hintsBody.innerHTML = ex.hints.map(h => `<p>${escapeHtml(h)}</p>`).join('');
    hintsBody.classList.add('hidden');
  } else {
    hintsBtn.classList.add('hidden');
    hintsBody.classList.add('hidden');
  }

  const body = document.getElementById('exerciseBody');
  if (ex.engine === 'field') {
    currentExerciseBuilt = typeof ex.build === 'function' ? ex.build() : ex.build;
    body.innerHTML = renderFieldEngineHtml(currentExerciseBuilt);
  } else if (ex.engine === 'token') {
    body.innerHTML = `<textarea id="exerciseTokenInput" placeholder="${escapeHtml(ex.placeholder || '')}"></textarea>`;
  } else if (ex.engine === 'selfassess') {
    body.innerHTML = `<textarea id="exerciseSelfassessInput" placeholder="Formuliere deine Antwort in eigenen Worten, bevor du die Musterlösung aufdeckst…"></textarea>`;
  }

  const checkBtn = document.getElementById('checkExerciseBtn');
  checkBtn.textContent = ex.engine === 'selfassess' ? 'Musterlösung anzeigen' : 'Prüfen';
  checkBtn.classList.remove('hidden');
  document.getElementById('resetExerciseBtn').classList.add('hidden');
  document.getElementById('exerciseScoreBanner').classList.add('hidden');
  document.getElementById('exerciseExplanation').classList.add('hidden');
  document.getElementById('exerciseRateBody').classList.add('hidden');
  document.getElementById('exerciseCashResult').classList.add('hidden');

  showOverlay('exerciseOverlay');
}

function renderFieldEngineHtml(built) {
  const header = built.tableData[0];
  const infoRows = built.tableData.slice(1);
  const infoTable = `
    <div class="table-scroll">
      <table class="field-table info-table">
        <tr>${header.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        ${infoRows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
      </table>
    </div>
  `;
  const glossaryHtml = built.glossary ? `
    <div class="glossary-box">
      <span class="glossary-label">📖 Erlaubte Begriffe:</span>
      ${built.glossary.map(term => `<span class="glossary-chip">${escapeHtml(term)}</span>`).join('')}
    </div>
  ` : '';
  const inputTable = `
    <div class="table-scroll">
      <table class="field-table">
        <tr><th>Zeile</th>${built.columns.map(c => `<th>${c}</th>`).join('')}</tr>
        ${built.rows.map(row => `
          <tr>
            <td class="name-col">${escapeHtml(row.label)}</td>
            ${row.fields.map(f => `<td>${renderFieldInput(row.id, f)}</td>`).join('')}
          </tr>
        `).join('')}
      </table>
    </div>
  `;
  return infoTable + glossaryHtml + inputTable;
}

function renderFieldInput(rowId, f) {
  if (f.type === 'number') {
    return `<input type="number" step="any" data-row="${rowId}" data-field="${f.key}">`;
  }
  if (f.type === 'checkbox') {
    return `<input type="checkbox" data-row="${rowId}" data-field="${f.key}">`;
  }
  if (f.type === 'select') {
    return `<select data-row="${rowId}" data-field="${f.key}">
      <option value="">—</option>
      ${f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
    </select>`;
  }
  return `<input type="text" data-row="${rowId}" data-field="${f.key}">`;
}

function checkCurrentExercise() {
  const ex = currentExercise;
  if (ex.engine === 'field') {
    currentExerciseScore = checkFieldExercise(currentExerciseBuilt);
    showExerciseResult(currentExerciseScore, currentExerciseBuilt.explanation);
  } else if (ex.engine === 'token') {
    const { score, results } = checkTokenExercise(ex);
    currentExerciseScore = score;
    const resultsHtml = `
      <p style="margin-top:0;"><strong>Struktur-Check:</strong></p>
      <ul class="token-result-list">
        ${results.map(r => `<li class="${r.ok ? 'token-ok' : 'token-fail'}">${r.ok ? '✓' : '✗'} ${escapeHtml(r.label)}</li>`).join('')}
      </ul>
      <p><strong>Musterlösung:</strong></p>
      <pre class="code-block">${escapeHtml(ex.modelAnswer)}</pre>
    `;
    showExerciseResult(score, resultsHtml);
  } else if (ex.engine === 'selfassess') {
    currentExerciseScore = 0;
    const explanationHtml = `
      <p style="margin-top:0;"><strong>Musterlösung:</strong></p>
      <div class="model-answer-text">${ex.modelAnswer}</div>
      <p style="margin-top:14px;"><strong>Selbstcheck — hast du folgendes erwähnt?</strong></p>
      <div class="selfassess-checklist" id="selfassessChecklist">
        ${ex.checklist.map((c, i) => `
          <label><input type="checkbox" data-selfassess-item="${i}"> ${escapeHtml(c)}</label>
        `).join('')}
      </div>
    `;
    showExerciseResult(0, explanationHtml);
    document.getElementById('exerciseScoreBanner').classList.remove('hidden');
    wireSelfassessChecklist(ex.checklist.length);
  }
}

function wireSelfassessChecklist(total) {
  const boxes = document.querySelectorAll('#selfassessChecklist input[type="checkbox"]');
  boxes.forEach(box => {
    box.addEventListener('change', () => {
      const checked = document.querySelectorAll('#selfassessChecklist input:checked').length;
      currentExerciseScore = total ? checked / total : 0;
      document.getElementById('exerciseScoreText').textContent = `${Math.round(currentExerciseScore * 100)}%`;
    });
  });
}

function checkFieldExercise(built) {
  let correct = 0, total = 0;
  built.rows.forEach(row => {
    row.fields.forEach(f => {
      total++;
      const input = document.querySelector(`[data-row="${row.id}"][data-field="${f.key}"]`);
      let ok = false;
      if (f.type === 'number') {
        const val = parseFloat(input.value);
        ok = input.value !== '' && !Number.isNaN(val) && Math.abs(val - f.expected) < 0.02;
      } else if (f.type === 'checkbox') {
        ok = input.checked === f.expected;
      } else if (f.type === 'select') {
        ok = input.value === f.expected;
      } else if (f.type === 'text') {
        ok = matchText(input.value, f.expected, f.matchMode);
      }
      const cell = input.closest('td');
      cell.classList.toggle('correct', ok);
      cell.classList.toggle('incorrect', !ok);
      if (ok) correct++;
    });
  });
  return total ? correct / total : 0;
}

function checkTokenExercise(ex) {
  const text = document.getElementById('exerciseTokenInput').value;
  let matched = 0;
  const results = ex.tokens.map(t => {
    const re = t.regex || new RegExp(t.pattern, 'is');
    const ok = re.test(text);
    if (ok) matched++;
    return { label: t.label, ok };
  });
  return { score: ex.tokens.length ? matched / ex.tokens.length : 0, results };
}

function showExerciseResult(score, explanationHtml) {
  document.getElementById('exerciseScoreBanner').classList.remove('hidden');
  document.getElementById('exerciseScoreText').textContent = `${Math.round(score * 100)}%`;
  document.getElementById('exerciseExplanation').classList.remove('hidden');
  document.getElementById('exerciseExplanation').innerHTML = explanationHtml;
  document.getElementById('exerciseRateBody').classList.remove('hidden');
  document.getElementById('checkExerciseBtn').classList.add('hidden');
  document.getElementById('resetExerciseBtn').classList.remove('hidden');
}

function resetCurrentExercise() {
  openExercise(currentExercise.id);
}

function computeNextReview(exerciseId, ratingStatus) {
  const prog = exerciseProgressFor(exerciseId);
  const prevInterval = prog.intervalDays || 0;
  let interval;
  if (ratingStatus === 'offen') {
    interval = 1;
  } else if (ratingStatus === 'geuebt') {
    interval = Math.max(3, Math.round(prevInterval * 1.5) || 3);
  } else {
    interval = Math.max(4, Math.round((prevInterval || 2) * 2.2));
  }
  interval = Math.min(interval, 45);
  return interval;
}

function rateExercise(ratingStatus) {
  const ex = currentExercise;
  const prog = exerciseProgressFor(ex.id);
  const interval = computeNextReview(ex.id, ratingStatus);

  prog.attempts++;
  prog.bestScore = Math.max(prog.bestScore, currentExerciseScore);
  prog.lastRating = ratingStatus;
  prog.intervalDays = interval;
  prog.nextReviewAt = new Date(Date.now() + interval * 86400000).toISOString();

  const cashEarned = Math.round(ex.baseReward * currentExerciseScore * CASH_MULTIPLIER[ratingStatus]);
  state.cash += cashEarned;

  ex.checkpointNrs.forEach(nr => setStatus(nr, ratingStatus, { silent: true }));
  saveState();
  checkMilestones({});

  const resultBox = document.getElementById('exerciseCashResult');
  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="score-banner">
      <span>${state.equipped.cashIcon} Verdient</span>
      <span class="big" style="color:var(--gold)">+${formatCash(cashEarned)}$</span>
    </div>
    <div class="next-review">Nächste Wiederholung in <strong>${interval} Tagen</strong></div>
  `;
  document.getElementById('exerciseRateBody').classList.add('hidden');

  showToast(`${state.equipped.cashIcon} +${formatCash(cashEarned)}$ verdient!`, cashEarned > 0 ? 'milestone' : 'info');
  if (currentExerciseScore >= 0.999) burstConfetti(30);

  renderTopicsGrid();
}

/* ---------- Milestones overlay ---------- */

function renderMilestones() {
  const defs = allMilestoneDefs();
  const list = document.getElementById('milestonesList');
  list.innerHTML = defs.map(d => {
    const unlocked = state.unlockedMilestones.includes(d.id);
    return `
      <div class="milestone ${unlocked ? 'unlocked' : ''}">
        <div class="milestone-icon">${d.icon}</div>
        <div>
          <div class="milestone-title">${escapeHtml(d.title)}</div>
          <div class="milestone-desc">${escapeHtml(d.desc)}</div>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- Toasts & confetti ---------- */

function showToast(message, type = 'info') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  const rainbow = state.equipped.toast === 'rainbow';
  el.className = `toast ${type === 'milestone' ? 'milestone' : ''} ${rainbow ? 'toast-rainbow' : ''}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

const CONFETTI_EMOJI_SETS = {
  emoji: ['🎉', '🎊', '🥳', '✨', '🙌'],
  stars: ['✨', '⭐', '🌟', '💫'],
};

function burstConfetti(count = 24) {
  const layer = document.getElementById('confettiLayer');
  const colors = ['#6c5ce7', '#00d4ff', '#2ecc71', '#ffd166', '#e74c3c'];
  const style = state.equipped.confetti;
  const emojiSet = CONFETTI_EMOJI_SETS[style];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;

    if (emojiSet) {
      piece.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];
      piece.style.fontSize = `${14 + Math.random() * 10}px`;
      piece.style.background = 'transparent';
    } else {
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    }

    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

/* ---------- Shop ---------- */

let shopActiveCategory = 'theme';

function applyEquipped() {
  const theme = SHOP_ITEM_INDEX[state.equipped.theme] || SHOP_THEMES[0];
  Object.entries(theme.vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  const cashIconEl = document.getElementById('cashIconDisplay');
  if (cashIconEl) cashIconEl.textContent = state.equipped.cashIcon;

  const badgeEl = document.getElementById('brandBadge');
  if (badgeEl) badgeEl.textContent = state.equipped.badge;
}

function ownsItem(id) {
  return state.purchasedItems.includes(id);
}

function buyItem(id) {
  const item = SHOP_ITEM_INDEX[id];
  if (!item || ownsItem(id)) return;
  if (state.cash < item.price) {
    showToast('⚠ Nicht genug Cash für diesen Artikel.', 'info');
    return;
  }
  state.cash -= item.price;
  state.purchasedItems.push(id);
  equipItem(id, { silent: true });
  saveState();
  renderHeader();
  renderShop();
  showToast(`${item.icon} „${item.name}“ gekauft und aktiviert!`, 'milestone');
  burstConfetti(20);
}

function equipItem(id, opts = {}) {
  const item = SHOP_ITEM_INDEX[id];
  if (!item || !ownsItem(id)) return;
  if (item.category === 'theme') {
    state.equipped.theme = id;
  } else {
    state.equipped[item.slot] = item.value;
  }
  saveState();
  applyEquipped();
  renderHeader();
  if (!opts.silent) {
    renderShop();
    showToast(`${item.icon} „${item.name}“ aktiviert.`);
  }
}

function isEquipped(item) {
  if (item.category === 'theme') return state.equipped.theme === item.id;
  return state.equipped[item.slot] === item.value;
}

function renderShop() {
  document.getElementById('shopCashAmount').textContent = `$${formatCash(state.cash)}`;

  const items = SHOP_ITEMS.filter(i => i.category === shopActiveCategory);
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = items.map(item => {
    const owned = ownsItem(item.id);
    const equipped = isEquipped(item);
    let actionHtml;
    if (equipped) {
      actionHtml = `<button class="shop-action-btn equipped" disabled>✓ Aktiv</button>`;
    } else if (owned) {
      actionHtml = `<button class="shop-action-btn" data-equip="${item.id}">Aktivieren</button>`;
    } else {
      const afford = state.cash >= item.price;
      actionHtml = `<button class="shop-action-btn ${afford ? '' : 'disabled'}" data-buy="${item.id}" ${afford ? '' : 'disabled'}>Kaufen · $${item.price}</button>`;
    }
    return `
      <div class="shop-item ${equipped ? 'shop-item-active' : ''}">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-name">${escapeHtml(item.name)}</div>
        <div class="shop-item-desc">${escapeHtml(item.description)}</div>
        ${actionHtml}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => buyItem(btn.dataset.buy));
  });
  grid.querySelectorAll('[data-equip]').forEach(btn => {
    btn.addEventListener('click', () => equipItem(btn.dataset.equip));
  });
}

/* ---------- Bug reporting ---------- */

const BUG_STORAGE_KEY = 'fiaT2TrainerBugs_v1';
const BUG_CATEGORY_LABEL = { aufgabe: '📝 Aufgaben-Fehler', ui: '🎨 UI/Darstellung', sonstiges: '❓ Sonstiges' };
const DEFAULT_BUG_REPO_URL = 'https://github.com/xen0natwork/pruefungsvorbereitung';

// Sobald der Cloudflare-Worker-Relay deployed ist (siehe bug-relay-worker.js
// im Projekt-Root für die Setup-Anleitung), hier die Worker-URL eintragen,
// z. B. 'https://bug-relay-pruefungsvorbereitung.deinname.workers.dev'.
// Solange das leer ist, fällt die App auf den manuellen "Issue öffnen"-Weg
// zurück (erfordert einen eigenen GitHub-Account des Melders).
const BUG_RELAY_URL = 'https://bug-worker.fabian-kalb.workers.dev/';

function loadBugData() {
  try {
    const raw = localStorage.getItem(BUG_STORAGE_KEY);
    if (!raw) return { reports: [], repoUrl: DEFAULT_BUG_REPO_URL };
    const parsed = JSON.parse(raw);
    return { reports: Array.isArray(parsed.reports) ? parsed.reports : [], repoUrl: parsed.repoUrl || DEFAULT_BUG_REPO_URL };
  } catch (e) {
    console.warn('Konnte Bug-Reports nicht laden.', e);
    return { reports: [], repoUrl: DEFAULT_BUG_REPO_URL };
  }
}

let bugData = loadBugData();

function saveBugData() {
  try {
    localStorage.setItem(BUG_STORAGE_KEY, JSON.stringify(bugData));
  } catch (e) {
    console.error('Bug-Reports konnten nicht gespeichert werden.', e);
    showToast('⚠ Bug-Report konnte nicht gespeichert werden (Speicher voll?)', 'info');
  }
}

function captureBugContext() {
  const lines = [];
  lines.push(`Zeitpunkt: ${new Date().toLocaleString('de-DE')}`);

  const exerciseOpen = !document.getElementById('exerciseOverlay').classList.contains('hidden');
  const focusOpen = !document.getElementById('focusOverlay').classList.contains('hidden');
  const topicOpen = !document.getElementById('topicOverlay').classList.contains('hidden');

  if (exerciseOpen && currentExercise) {
    lines.push(`Kontext: Übungsaufgabe "${currentExercise.id}" – ${currentExercise.title}`);
    lines.push(`Engine: ${currentExercise.engine} | Checkpoints: ${currentExercise.checkpointNrs.join(', ')} | Themenbereich: ${currentExercise.topicId}`);
  } else if (focusOpen && focusCurrent) {
    lines.push(`Kontext: Fokus-Modus – Checkpoint ${focusCurrent.nr} (${focusCurrent.topicName})`);
  } else if (topicOpen) {
    const topicId = Number(document.getElementById('topicDetailName').dataset.topicId);
    const topic = EXAM_DATA.find(t => t.id === topicId);
    lines.push(`Kontext: Themenbereich ${topicId}${topic ? ' – ' + topic.name : ''}`);
  } else {
    lines.push('Kontext: Dashboard');
  }

  lines.push(`Fenstergröße: ${window.innerWidth}×${window.innerHeight}`);
  lines.push(`Browser: ${navigator.userAgent}`);
  lines.push(`Prüfungsreife: ${Math.round(computeStats().percent)}% · Cash: $${formatCash(state.cash)}`);

  return lines.join('\n');
}

function openBugOverlay() {
  document.getElementById('bugContextBox').textContent = captureBugContext();
  document.getElementById('bugDescriptionInput').value = '';
  renderBugList();
  showOverlay('bugOverlay');
}

async function saveBugReport() {
  const description = document.getElementById('bugDescriptionInput').value.trim();
  if (!description) {
    showToast('⚠ Bitte eine Beschreibung eingeben.', 'info');
    return;
  }
  const honeypot = document.getElementById('bugWebsiteHoneypot').value;
  const category = document.getElementById('bugCategorySelect').value;
  const context = document.getElementById('bugContextBox').textContent;

  const report = {
    id: 'bug_' + Date.now(),
    category,
    description,
    context,
    createdAt: new Date().toISOString(),
    submitted: false,
  };

  const saveBtn = document.getElementById('saveBugBtn');
  saveBtn.disabled = true;
  saveBtn.classList.add('sending');
  saveBtn.textContent = 'Wird gesendet…';

  if (BUG_RELAY_URL) {
    try {
      const res = await fetch(BUG_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description, context, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        report.submitted = true;
        report.issueUrl = data.issueUrl || null;
        bugData.reports.unshift(report);
        saveBugData();
        document.getElementById('bugDescriptionInput').value = '';
        renderBugList();
        showToast('🐛 Danke! Dein Bug-Report wurde übermittelt.', 'milestone');
        resetSaveBugButton();
        return;
      }
      throw new Error(data.error || 'Unbekannter Relay-Fehler');
    } catch (e) {
      console.warn('Bug-Relay nicht erreichbar, Fallback auf manuellen GitHub-Issue-Weg.', e);
      showToast('⚠ Automatisches Melden fehlgeschlagen — öffne manuellen Weg…', 'info');
    }
  }

  // Fallback: lokal merken + manuellen GitHub-Issue-Tab öffnen
  // (funktioniert nur mit eigenem GitHub-Account).
  bugData.reports.unshift(report);
  saveBugData();
  document.getElementById('bugDescriptionInput').value = '';
  renderBugList();
  resetSaveBugButton();
  openGithubIssue(report.id);
}

function resetSaveBugButton() {
  const saveBtn = document.getElementById('saveBugBtn');
  saveBtn.disabled = false;
  saveBtn.classList.remove('sending');
  saveBtn.textContent = 'Report senden';
}

function renderBugList() {
  const section = document.getElementById('bugListSection');
  const list = document.getElementById('bugList');
  document.getElementById('bugCount').textContent = bugData.reports.length;

  if (bugData.reports.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  list.innerHTML = bugData.reports.map(r => `
    <div class="bug-item" data-bug-id="${r.id}">
      <div class="bug-item-head">
        <span class="bug-item-cat">${BUG_CATEGORY_LABEL[r.category] || r.category}</span>
        <span class="bug-item-time">${new Date(r.createdAt).toLocaleString('de-DE')}</span>
      </div>
      <div class="bug-item-desc">${escapeHtml(r.description)}</div>
      <div class="bug-item-context">${escapeHtml(r.context)}</div>
      <div class="bug-item-actions">
        ${r.submitted
          ? (r.issueUrl
              ? `<a class="link-btn" href="${escapeHtml(r.issueUrl)}" target="_blank" rel="noopener">✅ Issue #${r.issueUrl.split('/').pop()} ansehen</a>`
              : `<span class="link-btn" style="cursor:default; color:var(--good);">✅ Übermittelt</span>`)
          : `<button class="link-btn" data-github="${r.id}">🔗 Issue öffnen</button>`}
        <button class="link-btn" data-delete-bug="${r.id}">🗑 Löschen</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-github]').forEach(btn => {
    btn.addEventListener('click', () => openGithubIssue(btn.dataset.github));
  });
  list.querySelectorAll('[data-delete-bug]').forEach(btn => {
    btn.addEventListener('click', () => {
      bugData.reports = bugData.reports.filter(r => r.id !== btn.dataset.deleteBug);
      saveBugData();
      renderBugList();
    });
  });
}

function openGithubIssue(id) {
  const report = bugData.reports.find(r => r.id === id);
  if (!report) return;
  const repoUrl = bugData.repoUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(repoUrl)) {
    showToast('⚠ Bitte zuerst eine gültige GitHub-Repo-URL eintragen (https://github.com/nutzer/repo).', 'info');
    return;
  }
  const title = `[${report.category}] ${report.description.slice(0, 60)}`;
  const body = `**Beschreibung:**\n${report.description}\n\n**Kontext:**\n\`\`\`\n${report.context}\n\`\`\`\n\n**Kategorie:** ${report.category}\n**Erstellt:** ${report.createdAt}`;
  const url = `${repoUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
}

function exportBugsAsMarkdown() {
  if (bugData.reports.length === 0) {
    showToast('Keine Reports zum Exportieren vorhanden.', 'info');
    return;
  }
  const md = [
    '# Bug-Reports – FIA Teil 2 Prüfungstrainer',
    `Exportiert am ${new Date().toLocaleString('de-DE')}`,
    '',
    ...bugData.reports.map(r => [
      `## ${BUG_CATEGORY_LABEL[r.category] || r.category} – ${new Date(r.createdAt).toLocaleString('de-DE')}`,
      '',
      '**Beschreibung:**',
      r.description,
      '',
      '**Kontext:**',
      '```',
      r.context,
      '```',
      '',
    ].join('\n')),
  ].join('\n');

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bug-reports-${todayStr()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearBugReports() {
  if (!confirm('Wirklich alle gespeicherten Bug-Reports löschen?')) return;
  bugData.reports = [];
  saveBugData();
  renderBugList();
}

/* ---------- Overlay helpers ---------- */

function showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
function hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

/* ---------- Data management ---------- */

function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fia-t2-fortschritt-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = { ...defaultState(), ...imported };
      saveState();
      renderAll();
      showToast('Fortschritt erfolgreich importiert.');
    } catch (e) {
      showToast('Import fehlgeschlagen: ungültige Datei.');
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm('Wirklich den gesamten Fortschritt zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) return;
  state = defaultState();
  saveState();
  renderAll();
  showToast('Fortschritt wurde zurückgesetzt.');
}

/* ---------- Init / wiring ---------- */

function renderAll() {
  applyEquipped();
  renderHeader();
  renderTopicsGrid();
}

function wireCollapsible(btnId, bodyId, labelShow, labelHide) {
  document.getElementById(btnId).addEventListener('click', () => {
    const body = document.getElementById(bodyId);
    const btn = document.getElementById(btnId);
    const willShow = body.classList.contains('hidden');
    body.classList.toggle('hidden');
    btn.textContent = willShow ? labelHide : labelShow;
  });
}

function closeExerciseOverlay() {
  hideOverlay('exerciseOverlay');
  if (exerciseReturnToTopicId) {
    const topic = EXAM_DATA.find(t => t.id === exerciseReturnToTopicId);
    exerciseReturnToTopicId = null;
    if (topic) {
      renderTopicDetail(topic);
      showOverlay('topicOverlay');
    }
  }
}

function wireEvents() {
  document.getElementById('startFocus').addEventListener('click', startFocusMode);
  document.getElementById('closeFocus').addEventListener('click', () => hideOverlay('focusOverlay'));
  document.getElementById('skipFocus').addEventListener('click', skipFocusCard);
  document.querySelectorAll('#focusOverlay .rate-btn').forEach(btn => {
    btn.addEventListener('click', () => rateFocus(btn.dataset.status));
  });
  document.getElementById('closeSessionDone').addEventListener('click', () => hideOverlay('sessionDoneOverlay'));

  document.getElementById('closeExercise').addEventListener('click', closeExerciseOverlay);
  document.getElementById('checkExerciseBtn').addEventListener('click', checkCurrentExercise);
  document.getElementById('resetExerciseBtn').addEventListener('click', resetCurrentExercise);
  wireCollapsible('toggleExerciseHints', 'exerciseHintsBody', 'Hinweise anzeigen ▾', 'Hinweise verbergen ▴');
  document.querySelectorAll('#exerciseOverlay .exercise-rate-btn').forEach(btn => {
    btn.addEventListener('click', () => rateExercise(btn.dataset.status));
  });

  document.querySelectorAll('#topicExerciseFilters .chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#topicExerciseFilters .chip-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      topicExerciseFilter = btn.dataset.filter;
      const topicId = Number(document.getElementById('topicDetailName').dataset.topicId);
      const topic = EXAM_DATA.find(t => t.id === topicId);
      if (topic) renderTopicExercises(topic);
    });
  });

  document.getElementById('shopBtn').addEventListener('click', () => {
    shopActiveCategory = 'theme';
    document.querySelectorAll('#shopTabs .chip-filter').forEach(b => b.classList.toggle('active', b.dataset.category === 'theme'));
    renderShop();
    showOverlay('shopOverlay');
  });
  document.getElementById('closeShop').addEventListener('click', () => hideOverlay('shopOverlay'));
  document.querySelectorAll('#shopTabs .chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#shopTabs .chip-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      shopActiveCategory = btn.dataset.category;
      renderShop();
    });
  });

  document.getElementById('milestonesBtn').addEventListener('click', () => {
    renderMilestones();
    showOverlay('milestonesOverlay');
  });
  document.getElementById('closeMilestones').addEventListener('click', () => hideOverlay('milestonesOverlay'));

  document.getElementById('dataBtn').addEventListener('click', () => showOverlay('dataOverlay'));
  document.getElementById('closeData').addEventListener('click', () => hideOverlay('dataOverlay'));
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('resetBtn').addEventListener('click', resetProgress);
  document.getElementById('importInput').addEventListener('change', (e) => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });

  document.getElementById('closeTopic').addEventListener('click', () => hideOverlay('topicOverlay'));

  document.getElementById('bugFab').addEventListener('click', openBugOverlay);
  document.getElementById('closeBug').addEventListener('click', () => hideOverlay('bugOverlay'));
  document.getElementById('saveBugBtn').addEventListener('click', saveBugReport);
  document.getElementById('exportBugsBtn').addEventListener('click', exportBugsAsMarkdown);
  document.getElementById('clearBugsBtn').addEventListener('click', clearBugReports);

  document.getElementById('searchInput').addEventListener('input', renderTopicsGrid);
  document.getElementById('sortSelect').addEventListener('change', renderTopicsGrid);

  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', (e) => {
      if (e.target !== ov) return;
      if (ov.id === 'exerciseOverlay') closeExerciseOverlay();
      else ov.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const exerciseOpen = !document.getElementById('exerciseOverlay').classList.contains('hidden');
      if (exerciseOpen) {
        closeExerciseOverlay();
      } else {
        document.querySelectorAll('.overlay').forEach(ov => ov.classList.add('hidden'));
      }
    }
  });
}

wireEvents();
renderAll();
checkMilestones({});

window.addEventListener('beforeunload', saveState);
window.addEventListener('pagehide', saveState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState();
});

if (Object.keys(state.checkpoints).length > 0 || state.cash > 0) {
  showToast(`${state.equipped.cashIcon} Fortschritt geladen · $${formatCash(state.cash)} Cash`, 'info');
}
