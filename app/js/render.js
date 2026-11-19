// Leonida Nights — rendering: header progress, grouped trophy cards, the guide pane,
// the five-stage roadmap and the missable-watch page. Pure DOM building; state lives in app.js.

import { GRADE_META, GRADE_ORDER, KIND_BLURBS, KIND_ORDER, ROADMAP_STAGES, TOTAL_TROPHIES } from './config.js';
import { counterOf } from './store.js';

const RING_CIRCUMFERENCE = 2 * Math.PI * 27;

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function medallion(grade, small = false) {
  const meta = GRADE_META[grade];
  const node = el('span', `medallion ${grade}${small ? ' small' : ''}`, meta.label[0]);
  node.title = meta.label;
  return node;
}

export function gradePill(grade) {
  return el('span', `pill ${grade}`, GRADE_META[grade].label);
}

export function isSpoilerHidden(trophy, state) {
  return state.spoiler && trophy.kind === 'Story' && !state.earned.includes(trophy.id);
}

export function displayName(trophy, state) {
  return isSpoilerHidden(trophy, state) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(trophy, state) {
  return isSpoilerHidden(trophy, state)
    ? 'Spoiler shield is on — earn this story trophy or switch the shield off to reveal it.'
    : trophy.description;
}

/* ---------- header ---------- */

export function renderHeader(trophies, state) {
  const earnedCount = trophies.filter((t) => state.earned.includes(t.id)).length;
  const pct = Math.round((earnedCount / TOTAL_TROPHIES) * 100);
  document.getElementById('progressText').textContent = `${earnedCount} / ${TOTAL_TROPHIES}`;
  document.getElementById('ringText').textContent = `${pct}%`;
  const ring = document.getElementById('ringFg');
  ring.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - earnedCount / TOTAL_TROPHIES));
  document.getElementById('progressBar').style.width = `${pct}%`;

  const pills = document.getElementById('gradePills');
  pills.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => state.earned.includes(t.id)).length;
    const pill = el('span', 'grade-pill');
    pill.append(medallion(grade, true), el('span', '', GRADE_META[grade].label), el('b', '', `${got}/${inGrade.length}`));
    pills.append(pill);
  }
  document.getElementById('shieldState').textContent = state.spoiler ? 'ON' : 'OFF';
  document.getElementById('spoilerToggle').checked = state.spoiler;
}

/* ---------- filter chips ---------- */

export function renderChips(container, options, activeId, onPick) {
  container.replaceChildren();
  for (const option of options) {
    const chip = el('button', `chip${option.watch ? ' watch' : ''}${option.id === activeId ? ' is-on' : ''}`, option.label);
    chip.type = 'button';
    chip.addEventListener('click', () => onPick(option.id));
    container.append(chip);
  }
}

/* ---------- checklist ---------- */

export function trophyMatches(trophy, filters, state) {
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (filters.kind !== 'all' && trophy.kind !== filters.kind) return false;
  if (filters.state === 'earned' && !state.earned.includes(trophy.id)) return false;
  if (filters.state === 'remaining' && state.earned.includes(trophy.id)) return false;
  if (filters.query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.kind} ${trophy.grade}`.toLowerCase();
    if (!haystack.includes(filters.query)) return false;
  }
  return true;
}

export function sortTrophies(list, sortId, state) {
  const sorted = [...list];
  if (sortId === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortId === 'grade') sorted.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || a.id - b.id);
  else if (sortId === 'remaining') sorted.sort((a, b) => Number(state.earned.includes(a.id)) - Number(state.earned.includes(b.id)) || a.id - b.id);
  else sorted.sort((a, b) => a.id - b.id);
  return sorted;
}

export function renderList(container, trophies, filters, state, handlers) {
  container.replaceChildren();
  const visible = sortTrophies(trophies.filter((t) => trophyMatches(t, filters, state)), filters.sort, state);
  const grouped = filters.sort === 'guide' && filters.kind === 'all' && filters.grade === 'all';

  const buildCard = (trophy) => {
    const earned = state.earned.includes(trophy.id);
    const card = el('div', `card${earned ? ' is-earned' : ''}${handlers.selectedId === trophy.id ? ' is-selected' : ''}`);
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.append(medallion(trophy.grade));

    const main = el('div', 'card-main');
    const hidden = isSpoilerHidden(trophy, state);
    main.append(el('div', 'card-name', displayName(trophy, state)));
    const desc = el('div', `card-desc${hidden ? ' spoiler-mask' : ''}`, displayDescription(trophy, state));
    main.append(desc);
    card.append(main);

    const meta = el('div', 'card-meta');
    meta.append(gradePill(trophy.grade));
    if (trophy.missable) meta.append(el('span', 'pill watch', 'Missable watch'));
    if (trophy.target) {
      const chip = el('span', 'card-counter');
      const done = counterOf(state, trophy);
      chip.append(el('b', '', `${formatCount(done, trophy)}`), document.createTextNode(` / ${formatCount(trophy.target, trophy)}`));
      meta.append(chip);
    }
    const label = el('label', 'earned-box');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => handlers.onToggleEarned(trophy.id, box.checked));
    label.append(box, el('span', '', earned ? 'Earned' : 'To do'));
    label.addEventListener('click', (event) => event.stopPropagation());
    meta.append(label);
    card.append(meta);

    card.addEventListener('click', () => handlers.onSelect(trophy.id));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handlers.onSelect(trophy.id); }
    });
    return card;
  };

  if (grouped) {
    for (const kind of KIND_ORDER) {
      const inKind = visible.filter((t) => t.kind === kind);
      if (!inKind.length) continue;
      const group = el('section', 'kind-group');
      const head = el('div', 'kind-head');
      const got = inKind.filter((t) => state.earned.includes(t.id)).length;
      head.append(el('h3', '', kind), el('span', 'kind-count', `${got}/${inKind.length} earned`), el('p', '', KIND_BLURBS[kind]));
      group.append(head);
      for (const trophy of inKind) group.append(buildCard(trophy));
      container.append(group);
    }
  } else {
    const group = el('section', 'kind-group');
    for (const trophy of visible) group.append(buildCard(trophy));
    container.append(group);
  }
  return visible.length;
}

export function formatCount(value, trophy) {
  if (trophy.targetLabel.includes('$')) return `$${value.toLocaleString('en-US')}`;
  return String(value);
}

/* ---------- guide pane ---------- */

export function renderGuidePane(trophy, state, handlers) {
  if (!trophy) return;
  const medallionEl = document.getElementById('gpMedallion');
  medallionEl.className = `medallion ${trophy.grade}`;
  medallionEl.textContent = GRADE_META[trophy.grade].label[0];
  medallionEl.title = GRADE_META[trophy.grade].label;

  const gradeEl = document.getElementById('gpGrade');
  gradeEl.className = `pill ${trophy.grade}`;
  gradeEl.textContent = GRADE_META[trophy.grade].label;
  document.getElementById('gpKind').textContent = trophy.kind;
  document.getElementById('gpStage').textContent = `Roadmap stage ${trophy.stage}`;

  const hidden = isSpoilerHidden(trophy, state);
  document.getElementById('gpName').textContent = displayName(trophy, state);
  document.getElementById('gpOfficial').textContent = hidden
    ? 'Hidden by the spoiler shield. Earn this story trophy, or switch the shield off above, to read its official name and description.'
    : `“${trophy.description}”`;

  const missableBlock = document.getElementById('gpMissable');
  if (trophy.missable) {
    missableBlock.hidden = false;
    document.getElementById('gpMissableText').textContent = trophy.missableNote;
  } else {
    missableBlock.hidden = true;
  }

  document.getElementById('gpGuide').textContent = hidden
    ? 'The guide for this trophy is hidden by the spoiler shield too — it would give the story beat away. It appears here the moment the trophy is earned.'
    : trophy.guide;

  const counterBlock = document.getElementById('gpCounter');
  if (trophy.target) {
    counterBlock.hidden = false;
    const value = counterOf(state, trophy);
    document.getElementById('gpCountVal').textContent = `${formatCount(value, trophy)} / ${formatCount(trophy.target, trophy)}`;
    document.getElementById('gpCountLabel').textContent = trophy.targetLabel;
    document.getElementById('gpMiniFill').style.width = `${Math.round((value / trophy.target) * 100)}%`;
    document.getElementById('gpMinus').onclick = () => handlers.onCounter(trophy.id, -stepFor(trophy));
    document.getElementById('gpPlus').onclick = () => handlers.onCounter(trophy.id, stepFor(trophy));
  } else {
    counterBlock.hidden = true;
  }

  const earnedBox = document.getElementById('gpEarned');
  earnedBox.checked = state.earned.includes(trophy.id);
  earnedBox.onchange = () => handlers.onToggleEarned(trophy.id, earnedBox.checked);

  document.getElementById('gpSources').textContent = `Sources: ${trophy.sources}`;
}

function stepFor(trophy) {
  if (!trophy.target) return 1;
  if (trophy.target >= 10000) return 5000;
  if (trophy.target >= 1000) return 500;
  if (trophy.target >= 200) return 10;
  return 1;
}

/* ---------- roadmap ---------- */

export function renderRoadmap(container, trophies, state) {
  container.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const inStage = trophies.filter((t) => t.stage === stage.n);
    const got = inStage.filter((t) => state.earned.includes(t.id)).length;
    const card = el('article', 'stage-card');
    const top = el('div', 'stage-top');
    top.append(el('span', 'stage-num', String(stage.n)));
    const title = el('h3', '', stage.title);
    title.append(el('small', '', stage.sub));
    top.append(title);
    const progress = el('div', 'stage-progress');
    progress.append(el('b', '', `${got} / ${inStage.length} earned`));
    const bar = el('div', 'mini-bar');
    const fill = el('div', 'mini-fill');
    fill.style.width = `${inStage.length ? Math.round((got / inStage.length) * 100) : 0}%`;
    bar.append(fill);
    progress.append(bar);
    top.append(progress);
    card.append(top);
    card.append(el('p', '', stage.text));
    const chips = el('div', 'stage-chips');
    for (const trophy of inStage) {
      const done = state.earned.includes(trophy.id);
      chips.append(el('span', `stage-chip${done ? ' done' : ''}`, displayName(trophy, state)));
    }
    card.append(chips);
    container.append(card);
  }
}

/* ---------- missable watch ---------- */

export function renderMissables(container, trophies, state, handlers) {
  container.replaceChildren();
  for (const trophy of trophies.filter((t) => t.missable)) {
    const card = el('article', 'watch-card');
    card.append(medallion(trophy.grade));
    const body = el('div');
    const title = el('h3', '', trophy.name);
    title.append(gradePill(trophy.grade), el('span', 'pill kind', trophy.kind));
    if (state.earned.includes(trophy.id)) title.append(el('span', 'pill done', 'Earned'));
    body.append(title);
    body.append(el('p', 'w-official', `Official description: “${trophy.description}”`));
    body.append(el('p', 'w-reason', trophy.missableNote));
    body.append(el('p', 'w-guide', trophy.guide));
    body.append(el('p', 'w-sources', `Sources: ${trophy.sources}`));
    card.append(body);
    card.addEventListener('click', () => handlers.onSelect(trophy.id));
    container.append(card);
  }
}
