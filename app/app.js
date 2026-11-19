// app.js — boot and orchestration for Leonida Nights.
// Loads the official trophy data, wires the toolbar (search, grade and kind
// chips, earned-state filter, sort, spoiler shield, export/import) to the
// checklist, the detail pane, the roadmap and the missable-watch views, and
// keeps the sticky progress header in sync with the saved state.

import { counterOf, exportProgress, importProgress, loadState, progressSummary, saveState, setCounter, toggleEarned } from './store.js';
import { defaultFilters, groupByKind, matchesFilters, readUrlFilters, sortTrophies } from './filters.js';
import { el, renderDetail, renderHeaderStats, renderMissables, renderRoadmap, renderTrophyCard } from './render.js';

// A small, clearly-labelled demo seed used only when the page is opened with
// ?seed=demo (how this guide's own screenshots were taken): it pre-marks the
// opening story trophies so the progress header shows a hunt in progress.
// A normal visit never seeds anything.
const DEMO_EARNED = [2, 3, 4, 8, 10, 21, 44, 46, 51];
const DEMO_COUNTERS = { 17: 18, 28: 7, 31: 34, 35: 41, 42: 19 };

const url = readUrlFilters();
const filters = { ...defaultFilters(), ...url.filters };
let state = loadState();
if (url.seed && state.earned.size === 0) {
  state.earned = new Set(DEMO_EARNED);
  state.counters = { ...DEMO_COUNTERS };
  saveState(state);
}
if (url.spoilers) state.spoilersHidden = true;

let trophies = [];
let selectedId = url.selected ?? 17;
let activeView = url.view === 'roadmap' || url.view === 'missables' ? url.view : 'guide';

const headerStats = document.getElementById('header-stats');
const listRoot = document.getElementById('trophy-list');
const detailRoot = document.getElementById('detail-pane');
const roadmapRoot = document.getElementById('roadmap-view');
const missablesRoot = document.getElementById('missables-view');
const guideView = document.getElementById('guide-view');
const resultCount = document.getElementById('result-count');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const earnedSelect = document.getElementById('earned-filter');
const spoilerToggle = document.getElementById('spoiler-toggle');

function selectedTrophy() {
  return trophies.find((t) => t.id === selectedId) ?? trophies[0] ?? null;
}

function handleToggle(trophy) {
  toggleEarned(state, trophy.id);
  renderAll();
}

function handleCounter(trophy, value) {
  setCounter(state, trophy.id, value, trophy.target);
  renderAll();
}

function handleSelect(trophy) {
  selectedId = trophy.id;
  if (activeView !== 'guide') switchView('guide');
  renderAll();
  document.getElementById('detail-pane').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function renderChecklist() {
  const visible = sortTrophies(trophies.filter((t) => matchesFilters(t, filters, state)), filters.sort);
  // "Remaining first" keeps roadmap order inside each half.
  if (filters.sort === 'remaining') {
    visible.sort((a, b) => Number(state.earned.has(a.id)) - Number(state.earned.has(b.id)) || a.id - b.id);
  }
  listRoot.replaceChildren();
  resultCount.textContent = `Showing ${visible.length} of ${trophies.length} trophies`;
  if (visible.length === 0) {
    listRoot.append(el('p', 'no-results', 'No trophies match those filters — try clearing the search or choosing another grade or kind.'));
    return;
  }
  if (filters.sort === 'roadmap' && filters.kind === 'all' && !filters.query) {
    for (const [kind, items] of groupByKind(visible)) {
      const section = el('section', 'kind-section');
      const earnedInKind = items.filter((t) => state.earned.has(t.id)).length;
      section.append(el('h2', 'kind-heading', `${items[0].kindLabel} · ${earnedInKind}/${items.length}`));
      const grid = el('div', 'card-grid');
      for (const trophy of items) grid.append(renderTrophyCard(trophy, state, { selected: trophy.id === selectedId, onSelect: handleSelect, onToggle: handleToggle }));
      section.append(grid);
      listRoot.append(section);
    }
  } else {
    const grid = el('div', 'card-grid');
    for (const trophy of visible) grid.append(renderTrophyCard(trophy, state, { selected: trophy.id === selectedId, onSelect: handleSelect, onToggle: handleToggle }));
    listRoot.append(grid);
  }
}

function renderAll() {
  renderHeaderStats(headerStats, progressSummary(state, trophies));
  renderChecklist();
  renderDetail(detailRoot, selectedTrophy(), state, { onToggle: handleToggle, onCounter: handleCounter });
  renderRoadmap(roadmapRoot, trophies, state, { onSelect: handleSelect });
  renderMissables(missablesRoot, trophies, state, { onSelect: handleSelect });
  spoilerToggle.checked = state.spoilersHidden;
  syncChips();
}

function syncChips() {
  for (const chip of document.querySelectorAll('[data-grade-chip]')) {
    chip.classList.toggle('is-active', chip.dataset.gradeChip === filters.grade);
  }
  for (const chip of document.querySelectorAll('[data-kind-chip]')) {
    chip.classList.toggle('is-active', chip.dataset.kindChip === filters.kind);
  }
  for (const tab of document.querySelectorAll('[data-view-tab]')) {
    tab.classList.toggle('is-active', tab.dataset.viewTab === activeView);
  }
}

function switchView(view) {
  activeView = view;
  guideView.hidden = view !== 'guide';
  roadmapRoot.hidden = view !== 'roadmap';
  missablesRoot.hidden = view !== 'missables';
  syncChips();
}

function wireToolbar() {
  searchInput.value = filters.query;
  searchInput.addEventListener('input', () => {
    filters.query = searchInput.value.trim();
    renderChecklist();
  });
  sortSelect.value = filters.sort;
  sortSelect.addEventListener('change', () => {
    filters.sort = sortSelect.value;
    renderChecklist();
  });
  earnedSelect.value = filters.earnedState;
  earnedSelect.addEventListener('change', () => {
    filters.earnedState = earnedSelect.value;
    renderChecklist();
  });
  for (const chip of document.querySelectorAll('[data-grade-chip]')) {
    chip.addEventListener('click', () => {
      filters.grade = chip.dataset.gradeChip;
      renderChecklist();
      syncChips();
    });
  }
  for (const chip of document.querySelectorAll('[data-kind-chip]')) {
    chip.addEventListener('click', () => {
      filters.kind = chip.dataset.kindChip;
      renderChecklist();
      syncChips();
    });
  }
  for (const tab of document.querySelectorAll('[data-view-tab]')) {
    tab.addEventListener('click', () => switchView(tab.dataset.viewTab));
  }
  spoilerToggle.checked = state.spoilersHidden;
  spoilerToggle.addEventListener('change', () => {
    state.spoilersHidden = spoilerToggle.checked;
    saveState(state);
    renderAll();
  });
  document.getElementById('export-btn').addEventListener('click', () => exportProgress(state));
  document.getElementById('import-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      state = await importProgress(file);
      saveState(state);
      renderAll();
    } catch {
      resultCount.textContent = 'That import file could not be read — progress was left unchanged.';
    }
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    state.earned.clear();
    state.counters = {};
    saveState(state);
    renderAll();
  });
}

async function boot() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  trophies = data.trophies;
  if (!trophies.some((t) => t.id === selectedId)) selectedId = trophies[0].id;
  wireToolbar();
  switchView(activeView);
  renderAll();
}

boot();
