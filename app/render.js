// render.js — every visual piece of Leonida Nights, built as DOM nodes.
// The trophy medallion is an inline SVG cup tinted per grade; earned cards,
// spoiler-hidden story trophies and missable-watch badges are all rendered
// here so the checklist, the detail pane and the roadmap stay consistent.

import { counterOf } from './store.js';
import { displayDescription, displayName, isSpoilerHidden } from './filters.js';

export const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const CUP_PATH = 'M14 4h20v6a10 10 0 0 1-20 0V4z M14 6H7a7 7 0 0 0 7 9 M34 6h7a7 7 0 0 1-7 9 M24 20v4 M15 32h18 M20 28h8l1 4H19l1-4z';

export function medallion(grade, sizeClass = '') {
  const wrap = document.createElement('span');
  wrap.className = `medallion medallion-${grade} ${sizeClass}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg viewBox="0 0 48 40" focusable="false"><path d="${CUP_PATH}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return wrap;
}

export function gradeBadge(grade) {
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${grade}`;
  badge.textContent = GRADE_LABEL[grade];
  return badge;
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderHeaderStats(container, summary) {
  container.replaceChildren();
  const ring = el('div', 'ring-wrap');
  const circumference = 2 * Math.PI * 34;
  const filled = (summary.percent / 100) * circumference;
  ring.innerHTML = `<svg viewBox="0 0 84 84" class="ring"><circle cx="42" cy="42" r="34" class="ring-track"/><circle cx="42" cy="42" r="34" class="ring-fill" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"/></svg>`;
  const ringText = el('div', 'ring-text');
  ringText.append(el('strong', '', `${summary.percent}%`), el('span', '', 'complete'));
  ring.append(ringText);
  container.append(ring);

  const counts = el('div', 'header-counts');
  counts.append(el('p', 'big-count', `${summary.earnedCount} / ${summary.total} trophies earned`));
  const pills = el('div', 'grade-pills');
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const pill = el('span', `grade-pill grade-${grade}`);
    pill.append(medallion(grade, 'medallion-mini'), el('span', '', `${summary.byGrade[grade]}/${summary.totalByGrade[grade]} ${GRADE_LABEL[grade]}`));
    pills.append(pill);
  }
  counts.append(pills);
  const bar = el('div', 'progress-track');
  const fill = el('div', 'progress-fill');
  fill.style.width = `${summary.percent}%`;
  bar.append(fill);
  counts.append(bar);
  container.append(counts);
}

export function renderTrophyCard(trophy, state, { selected = false, onSelect, onToggle }) {
  const earned = state.earned.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, state);
  const card = el('article', `trophy-card${earned ? ' is-earned' : ''}${selected ? ' is-selected' : ''}${hidden ? ' is-hidden-story' : ''}`);
  card.dataset.trophyId = String(trophy.id);
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${displayName(trophy, state)} — ${GRADE_LABEL[trophy.grade]} trophy`);

  const top = el('div', 'card-top');
  top.append(medallion(trophy.grade));
  const titles = el('div', 'card-titles');
  titles.append(el('h3', 'card-name', displayName(trophy, state)), el('p', 'card-desc', displayDescription(trophy, state)));
  top.append(titles);
  const check = el('button', `earn-toggle${earned ? ' is-on' : ''}`, earned ? '✓' : '');
  check.type = 'button';
  check.title = earned ? 'Earned — click to undo' : 'Mark as earned';
  check.setAttribute('aria-pressed', String(earned));
  check.addEventListener('click', (event) => {
    event.stopPropagation();
    onToggle(trophy);
  });
  top.append(check);
  card.append(top);

  const meta = el('div', 'card-meta');
  meta.append(gradeBadge(trophy.grade), el('span', 'kind-tag', trophy.kindLabel));
  if (trophy.missable) meta.append(el('span', 'missable-badge', '⚠ Missable watch'));
  if (trophy.target) {
    const current = counterOf(state, trophy);
    const chip = el('span', 'target-chip', `${formatCount(current, trophy)} / ${formatCount(trophy.target, trophy)} ${trophy.targetLabel}`);
    if (current >= trophy.target) chip.classList.add('is-done');
    meta.append(chip);
  }
  if (earned) meta.append(el('span', 'earned-label', 'Earned'));
  card.append(meta);

  card.addEventListener('click', () => onSelect(trophy));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(trophy);
    }
  });
  return card;
}

export function formatCount(value, trophy) {
  if (trophy.targetLabel && trophy.targetLabel.includes('dollars')) return `$${value.toLocaleString('en-US')}`;
  if (trophy.targetLabel && trophy.targetLabel.includes('%')) return `${value}%`;
  return String(value);
}

export function renderDetail(container, trophy, state, { onToggle, onCounter }) {
  container.replaceChildren();
  if (!trophy) {
    container.append(el('p', 'detail-empty', 'Select a trophy to read its guide.'));
    return;
  }
  const earned = state.earned.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, state);

  const head = el('div', 'detail-head');
  head.append(medallion(trophy.grade, 'medallion-large'));
  const headText = el('div', 'detail-head-text');
  headText.append(el('p', 'detail-kicker', `${trophy.kindLabel} · ${GRADE_LABEL[trophy.grade]} trophy`));
  headText.append(el('h2', 'detail-name', displayName(trophy, state)));
  head.append(headText);
  container.append(head);

  const official = el('blockquote', 'official-desc');
  official.append(el('span', 'official-label', 'Official description — PlayStation'), el('p', '', displayDescription(trophy, state)));
  container.append(official);

  if (trophy.missable && trophy.missableNote) {
    const warn = el('div', 'missable-note');
    warn.append(el('strong', '', '⚠ Missable watch — built from the official description. '), el('span', '', trophy.missableNote));
    container.append(warn);
  }

  const guide = el('div', 'detail-guide');
  guide.append(el('h3', '', 'How to earn it'));
  guide.append(el('p', '', hidden ? 'Earn this story trophy to reveal its guide — the spoiler shield hides story details until then.' : trophy.guide));
  container.append(guide);

  if (trophy.target) {
    const counter = el('div', 'counter-row');
    counter.append(el('span', 'counter-label', `Progress — ${trophy.targetLabel}`));
    const controls = el('div', 'counter-controls');
    const minus = el('button', 'counter-btn', '−');
    minus.type = 'button';
    const value = el('strong', 'counter-value', `${formatCount(counterOf(state, trophy), trophy)} / ${formatCount(trophy.target, trophy)}`);
    const plus = el('button', 'counter-btn', '+');
    plus.type = 'button';
    const step = trophy.target >= 10000 ? 5000 : trophy.target >= 1000 ? 50 : 1;
    minus.addEventListener('click', () => onCounter(trophy, counterOf(state, trophy) - step));
    plus.addEventListener('click', () => onCounter(trophy, counterOf(state, trophy) + step));
    controls.append(minus, value, plus);
    counter.append(controls);
    container.append(counter);
  }

  const toggle = el('button', `detail-toggle${earned ? ' is-on' : ''}`, earned ? '✓ Earned — tap to undo' : 'Mark as earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => onToggle(trophy));
  container.append(toggle);

  container.append(el('p', 'detail-sources', 'Sources: official trophy list as published for PlayStation 5 and listed by Exophase and PSNProfiles (name, description, grade; PSNProfiles for tracked counts). Guide text is original to Leonida Nights, written from the official description.'));
}

const ROADMAP_STAGES = [
  {
    title: 'Stage 1 — Story first',
    kinds: ['story'],
    text: 'Play the campaign straight through: the opening mission Gone Fishing, Chapters 1–4, the named story missions (Breakfast Run, The Cartel Heist, Child’s Play, Headliners, VCIA Takedown, Operation Savage Glory) and the final mission. That is 12 trophies — including the gold for the final mission — and it unlocks the world for everything after. Keep a manual save before the finale and before any big choice — the missable-watch trophies below are all worded around choices or one-off moments.',
  },
  {
    title: 'Stage 2 — Strangers & side strands',
    kinds: ['side'],
    text: 'Close out the stranger strands: Andy, Kenton, Billy, Randy and Tyrone each end in a named finale trophy, Bret’s hunt is Fair Game, and finishing any 8 strands earns the silver Strangers & Freaks. Finish strands you have started before opening new ones — a strand only counts when its final mission is done.',
  },
  {
    title: 'Stage 3 — Collectibles & exploration',
    kinds: ['collectibles'],
    text: 'Sweep Leonida area by area: meditate at all 18 spots, WAiNK at 100 locations, complete 3 card sets, discover 100 vehicles, and explore all 52 areas for The Goodtime State. These five trophies share the same travels, so run them together and lean on the counters in each trophy’s guide panel.',
  },
  {
    title: 'Stage 4 — Activities & skill',
    kinds: ['activities'],
    text: 'Sample everything once for Master of None (9 activity types), then go deep: 250 stunts, gold in all 42 Shooting Range challenges, drone-race wins at 14 locations, 20 different race wins, Cal’s fishing challenge, one arcade game, bowling at Kolt & Associates, and 50 challenges.',
  },
  {
    title: 'Stage 5 — Free-roam feats, 100% & the platinum',
    kinds: ['world', 'completion'],
    text: 'Finish the free-roam list — partner escapes, robberies, the money trophies ($250,000 laundered, $100,000 spent, all 8 garages) and the cryptic one-off moments — then close the in-game checklist for A Long Road (100% completion, gold). The moment the 54th trophy lands, Vice Got a Price! completes the set.',
  },
];

export function renderRoadmap(container, trophies, state, { onSelect }) {
  container.replaceChildren();
  container.append(el('h2', 'view-title', 'Roadmap to the platinum'));
  container.append(el('p', 'view-lede', 'Five stages, in the order this guide recommends, built from the official descriptions: which chapters and missions come first, which strands and collectibles follow, and what the 100% cleanup needs. Every stage lists its trophies — tap one to open its guide.'));
  for (const stage of ROADMAP_STAGES) {
    const section = el('section', 'roadmap-stage');
    section.append(el('h3', '', stage.title), el('p', '', stage.text));
    const chips = el('div', 'roadmap-chips');
    for (const trophy of trophies.filter((t) => stage.kinds.includes(t.kind))) {
      const chip = el('button', `roadmap-chip grade-${trophy.grade}${state.earned.has(trophy.id) ? ' is-earned' : ''}`, `${state.earned.has(trophy.id) ? '✓ ' : ''}${trophy.name}`);
      chip.type = 'button';
      chip.addEventListener('click', () => onSelect(trophy));
      chips.append(chip);
    }
    section.append(chips);
    container.append(section);
  }
}

export function renderMissables(container, trophies, state, { onSelect }) {
  container.replaceChildren();
  container.append(el('h2', 'view-title', 'Missable watch'));
  container.append(el('p', 'view-lede', 'No trophy in the official list is labelled “missable” outright — so instead of inventing certainty, this page flags the trophies whose official descriptions are worded around a choice, a single named moment, or a success that needs a failed first try. Each flag quotes the reasoning from the description itself. Earn these early, and keep rotating manual saves before story choices.'));
  const flagged = trophies.filter((t) => t.missable);
  for (const trophy of flagged) {
    const row = el('article', 'missable-row');
    row.append(medallion(trophy.grade));
    const body = el('div', 'missable-body');
    body.append(el('h3', '', displayName(trophy, state)), el('p', 'missable-desc', `“${trophy.description}”`), el('p', '', trophy.missableNote ?? ''));
    row.append(body);
    const open = el('button', 'missable-open', 'Open guide');
    open.type = 'button';
    open.addEventListener('click', () => onSelect(trophy));
    row.append(open);
    container.append(row);
  }
  const safe = el('section', 'missable-safe');
  safe.append(el('h3', '', 'Everything else'));
  safe.append(el('p', '', `The other ${trophies.length - flagged.length} trophies are worded as completions, totals or repeatable feats — chapters to finish, counts to reach, robberies and races that can be attempted again — so nothing in their official descriptions suggests a point of no return. If a description is cryptic (Challenging Tank, Personal Best, The Truth Is Out There), this guide says so in its panel rather than guessing a missable window.`));
  container.append(safe);
}
