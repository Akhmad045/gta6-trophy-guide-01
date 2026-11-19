// Leonida Nights — app boot and wiring: loads the official trophy data, restores saved
// progress, applies the opening view from the URL (?view=, ?grade=, ?kind=, ?select=),
// and keeps the header, checklist, guide pane, roadmap and missable page in sync.

import { DATA_URL, GRADE_ORDER, KIND_ORDER, MISSABLE_NOTE, SORT_ORDERS } from './config.js';
import { counterComplete, exportState, importState, loadState, saveState } from './store.js';
import {
  renderChips, renderGuidePane, renderHeader, renderList, renderMissables, renderRoadmap,
} from './render.js';

const params = new URLSearchParams(location.search);

const state = loadState();
if (params.get('spoiler') === 'off') state.spoiler = false;
if (params.get('spoiler') === 'on') state.spoiler = true;

const filters = {
  query: '',
  grade: params.get('grade') || 'all',
  kind: params.get('kind') || 'all',
  state: 'all',
  sort: 'guide',
};

let trophies = [];
let selectedId = Number(params.get('select')) || 17; // The Shootist: a counter trophy with a full guide.
let view = ['roadmap', 'missables'].includes(params.get('view')) ? params.get('view') : 'checklist';

const $ = (id) => document.getElementById(id);

function persistAndRender() {
  saveState(state);
  renderAll();
}

function renderAll() {
  renderHeader(trophies, state);
  renderFilterChips();
  const visibleCount = renderList($('listEl'), trophies, filters, state, handlers);
  $('emptyNote').hidden = visibleCount !== 0;
  $('resultCount').textContent = `${visibleCount} of ${trophies.length} trophies shown`;
  const selected = trophies.find((t) => t.id === selectedId) ?? trophies[0];
  if (selected) {
    selectedId = selected.id;
    renderGuidePane(selected, state, handlers);
  }
  renderRoadmap($('roadmapEl'), trophies, state);
  renderMissables($('missablesEl'), trophies, state, handlers);
  applyView();
}

function renderFilterChips() {
  renderChips($('gradeChips'), [
    { id: 'all', label: 'All grades' },
    ...GRADE_ORDER.map((grade) => ({ id: grade, label: grade })),
  ], filters.grade, (id) => { filters.grade = id; renderAll(); });

  renderChips($('kindChips'), [
    { id: 'all', label: 'All kinds' },
    ...KIND_ORDER.map((kind) => ({ id: kind, label: kind })),
    { id: 'missable', label: '⚑ Missable watch', watch: true },
  ], filters.kind, (id) => { filters.kind = id; renderAll(); });
}

function applyView() {
  for (const name of ['checklist', 'roadmap', 'missables']) {
    $(`view${name[0].toUpperCase()}${name.slice(1)}`).hidden = name !== view;
  }
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  });
  $('toolbar').style.display = view === 'checklist' ? '' : 'none';
}

const handlers = {
  get selectedId() { return selectedId; },
  onSelect(id) {
    selectedId = id;
    if (view !== 'checklist') view = 'checklist';
    renderAll();
    $('guidePane').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
  onToggleEarned(id, earned) {
    const has = state.earned.includes(id);
    if (earned && !has) state.earned.push(id);
    if (!earned && has) state.earned = state.earned.filter((n) => n !== id);
    persistAndRender();
  },
  onCounter(id, delta) {
    const trophy = trophies.find((t) => t.id === id);
    if (!trophy || !trophy.target) return;
    const next = Math.max(0, Math.min(trophy.target, (state.counters[id] ?? 0) + delta));
    if (next > 0) state.counters[id] = next; else delete state.counters[id];
    if (counterComplete(state, trophy) && !state.earned.includes(id)) state.earned.push(id);
    if (!counterComplete(state, trophy) && state.earned.includes(id) && (state.counters[id] ?? 0) === 0) {
      // Only auto-earned trophies drop back off when their counter returns to zero.
    }
    persistAndRender();
  },
};

function wireControls() {
  const sortSelect = $('sortSelect');
  for (const order of SORT_ORDERS) {
    const option = document.createElement('option');
    option.value = order.id;
    option.textContent = order.label;
    sortSelect.append(option);
  }
  sortSelect.value = filters.sort;
  sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; renderAll(); });

  $('searchInput').addEventListener('input', (event) => {
    filters.query = event.target.value.trim().toLowerCase();
    renderAll();
  });
  $('stateFilter').addEventListener('change', (event) => { filters.state = event.target.value; renderAll(); });

  const clear = () => {
    filters.query = ''; filters.grade = 'all'; filters.kind = 'all'; filters.state = 'all'; filters.sort = 'guide';
    $('searchInput').value = ''; $('stateFilter').value = 'all'; sortSelect.value = 'guide';
    renderAll();
  };
  $('clearFilters').addEventListener('click', clear);
  $('emptyClear').addEventListener('click', clear);

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => { view = tab.dataset.view; applyView(); });
  });

  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    persistAndRender();
  });
  $('exportBtn').addEventListener('click', () => exportState(state));
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = await importState(file);
      state.earned = imported.earned;
      state.counters = imported.counters;
      state.spoiler = imported.spoiler;
      persistAndRender();
    } catch {
      $('resultCount').textContent = 'That file could not be read as Leonida Nights progress.';
    }
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    state.earned = [];
    state.counters = {};
    persistAndRender();
  });
}

async function boot() {
  const response = await fetch(DATA_URL);
  const doc = await response.json();
  trophies = doc.trophies;
  $('missableHonesty').textContent = MISSABLE_NOTE;
  if (!trophies.some((t) => t.id === selectedId)) selectedId = trophies[0].id;
  wireControls();
  renderAll();
}

boot();
