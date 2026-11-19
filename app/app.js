// Leonida Ledger — guide + tracker logic.
// Loads the trophy data from app/data/trophies.json (same folder tree, no
// network beyond this app's own files), keeps progress in localStorage, and
// renders three views: checklist with a guide pane, roadmap, and missables.

const STORAGE_KEY = 'leonida-ledger-v1';
const KIND_LABELS = {
  all: 'All kinds',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities & quests',
  platinum: 'Platinum',
};
const KIND_ORDER = ['all', 'story', 'missable', 'collectibles', 'activities', 'platinum'];

const state = loadState();
let data = null;
let selectedId = null;

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (raw && Array.isArray(raw.earned)) {
      return { earned: new Set(raw.earned), spoilersHidden: raw.spoilersHidden !== false };
    }
  } catch { /* a corrupt save falls through to a fresh one */ }
  return { earned: new Set(), spoilersHidden: true };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...state.earned],
    spoilersHidden: state.spoilersHidden,
  }));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isSpoilerHidden(trophy) {
  return state.spoilersHidden && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function displayName(trophy) {
  return isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isSpoilerHidden(trophy)
    ? 'Name and description stay hidden until you earn this story trophy (spoiler setting is on).'
    : trophy.description;
}

function gradeCounts(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (state.earned.has(t.id)) counts[t.grade] += 1;
  return counts;
}

function renderScoreboard() {
  const total = data.trophies.length;
  const done = state.earned.size;
  document.getElementById('earned-count').textContent = String(done);
  const fill = document.getElementById('progress-fill');
  fill.style.width = `${Math.round((done / total) * 100)}%`;
  document.getElementById('progress-bar').setAttribute('aria-valuenow', String(done));
  const c = gradeCounts(data.trophies);
  document.getElementById('grade-counts').textContent =
    `${c.platinum} of 1 platinum · ${c.gold} of 2 gold · ${c.silver} of 6 silver · ${c.bronze} of 46 bronze earned`;
}

function currentFilters() {
  return {
    query: document.getElementById('search').value.trim().toLowerCase(),
    grade: document.getElementById('grade-filter').value,
    kind: document.querySelector('.chip.is-active')?.dataset.kind ?? 'all',
    todoOnly: document.getElementById('todo-toggle').checked,
  };
}

function trophyMatches(trophy, f) {
  if (f.grade !== 'all' && trophy.grade !== f.grade) return false;
  if (f.kind !== 'all' && trophy.kind !== f.kind) return false;
  if (f.todoOnly && state.earned.has(trophy.id)) return false;
  if (f.query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.kind}`.toLowerCase();
    if (!haystack.includes(f.query)) return false;
  }
  return true;
}

function renderCards() {
  const list = document.getElementById('cards');
  list.replaceChildren();
  const f = currentFilters();
  const shown = data.trophies.filter((t) => trophyMatches(t, f));
  for (const trophy of shown) {
    const card = el('li', `card grade-${trophy.grade}`);
    if (state.earned.has(trophy.id)) card.classList.add('is-earned');
    if (trophy.id === selectedId) card.classList.add('is-selected');
    const top = el('div', 'card-top');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'card-check';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => toggleEarned(trophy.id));
    top.append(box, el('span', 'card-name', displayName(trophy)));
    top.append(el('span', `pill grade-${trophy.grade}`, trophy.grade));
    if (trophy.missable) top.append(el('span', 'pill missable', 'Missable'));
    card.append(top);
    card.append(el('p', 'card-desc', displayDescription(trophy)));
    const meta = [`${KIND_LABELS[trophy.kind] ?? trophy.kind}`, `Roadmap stage ${trophy.stage}`];
    if (trophy.target) meta.push(`Target: ${trophy.target.toLocaleString('en-US')} ${trophy.targetLabel}`);
    card.append(el('p', 'card-meta', meta.join(' · ')));
    card.addEventListener('click', () => { selectedId = trophy.id; renderCards(); renderDetail(); });
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Read the guide for ${trophy.name}`);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target !== card) return;
      event.preventDefault();
      selectedId = trophy.id;
      renderCards();
      renderDetail();
    });
    list.append(card);
  }
  document.getElementById('result-line').textContent =
    `Showing ${shown.length} of ${data.trophies.length} trophies · ${state.earned.size} earned overall`;
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  persist();
  renderScoreboard();
  renderCards();
  renderDetail();
  renderRoadmap();
}

function renderDetail() {
  const pane = document.getElementById('detail');
  pane.replaceChildren();
  const trophy = data.trophies.find((t) => t.id === selectedId);
  if (!trophy) {
    pane.append(el('p', 'detail-empty',
      'Pick a trophy from the list to read its guide — what to do, where and how, when it can be missed, and the sources each fact comes from.'));
    return;
  }
  pane.append(el('span', `pill grade-${trophy.grade}`, `${trophy.grade} · ${KIND_LABELS[trophy.kind] ?? trophy.kind}`));
  if (trophy.missable) pane.append(' ', el('span', 'pill missable', 'Missable'));
  pane.append(el('h2', '', displayName(trophy)));
  pane.append(el('p', 'official', `“${displayDescription(trophy)}” — official description`));
  if (trophy.missable) {
    const warn = el('p', 'warn',
      'Missable: the Chapter 1 balcony meditation at Jason’s house disappears after Chapter 1. Take it when Lucia offers it, and keep a manual save at the start of the chapter.');
    pane.append(warn);
  }
  pane.append(el('h3', '', 'Guide — our own words'));
  if (isSpoilerHidden(trophy)) {
    pane.append(el('p', '', 'This story trophy’s guide stays hidden while the spoiler setting is on. Earn it, or switch “Hide story spoilers” off, to read it.'));
  } else {
    pane.append(el('p', '', trophy.guide));
  }
  if (trophy.target) {
    pane.append(el('h3', '', 'Target'));
    pane.append(el('p', '', `PlayStation tracks this one: ${trophy.target.toLocaleString('en-US')} ${trophy.targetLabel}.`));
  }
  pane.append(el('h3', '', 'Where it fits'));
  const stage = data.roadmap.find((s) => s.stage === trophy.stage);
  pane.append(el('p', '', `Roadmap stage ${trophy.stage}: ${stage ? stage.title : ''}`));
  pane.append(el('h3', '', 'Sources'));
  const ul = el('ul');
  for (const source of trophy.sources ?? []) {
    const li = el('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.textContent = source.label;
    a.rel = 'noopener';
    li.append(a);
    ul.append(li);
  }
  pane.append(ul);
  const btn = el('button', 'btn earn-btn', state.earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned');
  btn.type = 'button';
  btn.addEventListener('click', () => toggleEarned(trophy.id));
  pane.append(btn);
}

function renderRoadmap() {
  const list = document.getElementById('stages');
  if (!list || !data) return;
  list.replaceChildren();
  for (const stage of data.roadmap) {
    const inStage = data.trophies.filter((t) => t.stage === stage.stage);
    const done = inStage.filter((t) => state.earned.has(t.id)).length;
    const item = el('li', 'stage');
    const head = el('h3');
    head.append(el('span', 'stage-num', `Stage ${stage.stage}`), document.createTextNode(stage.title));
    item.append(head);
    item.append(el('p', 'hours', stage.hours));
    item.append(el('p', '', stage.body));
    item.append(el('p', 'stage-progress', `${done} of ${inStage.length} trophies in this stage earned`));
    list.append(item);
  }
}

function renderMissables() {
  const wrap = document.getElementById('missable-list');
  wrap.replaceChildren();
  for (const trophy of data.trophies.filter((t) => t.missable)) {
    const card = el('div', 'stage');
    card.append(el('h3', '', `${trophy.name} — ${trophy.grade}`));
    card.append(el('p', 'official', `“${trophy.description}”`));
    card.append(el('p', '', trophy.guide));
    wrap.append(card);
  }
}

function renderChips() {
  const wrap = document.getElementById('kind-chips');
  wrap.replaceChildren();
  for (const kind of KIND_ORDER) {
    const chip = el('button', 'chip', KIND_LABELS[kind]);
    chip.type = 'button';
    chip.dataset.kind = kind;
    if (kind === 'all') chip.classList.add('is-active');
    chip.addEventListener('click', () => {
      wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      renderCards();
    });
    wrap.append(chip);
  }
}

function switchView(name) {
  for (const view of ['checklist', 'roadmap', 'missables']) {
    document.getElementById(`view-${view}`).hidden = view !== name;
    document.getElementById(`tab-${view}`).classList.toggle('is-active', view === name);
  }
}

function exportProgress() {
  const payload = JSON.stringify({
    app: 'leonida-ledger',
    version: 1,
    earned: [...state.earned],
    exportedAt: new Date().toISOString(),
  }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('not a progress file');
  const valid = new Set(data.trophies.map((t) => t.id));
  state.earned = new Set(names.filter((id) => valid.has(id)));
  persist();
  renderScoreboard();
  renderCards();
  renderDetail();
  renderRoadmap();
}

async function boot() {
  const response = await fetch('data/trophies.json');
  data = await response.json();
  renderChips();
  renderScoreboard();
  renderCards();
  renderRoadmap();
  renderMissables();
  const spoiler = document.getElementById('spoiler-toggle');
  spoiler.checked = state.spoilersHidden;
  spoiler.addEventListener('change', () => {
    state.spoilersHidden = spoiler.checked;
    persist();
    renderCards();
    renderDetail();
  });
  document.getElementById('search').addEventListener('input', renderCards);
  document.getElementById('grade-filter').addEventListener('change', renderCards);
  document.getElementById('todo-toggle').addEventListener('change', renderCards);
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await importProgress(file);
    event.target.value = '';
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }
}

boot();
