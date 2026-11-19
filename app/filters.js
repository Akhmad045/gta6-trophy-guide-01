// filters.js — search, filtering and sorting for the trophy checklist.
// A trophy is shown when it passes every active filter at once: the text
// search, the grade chips, the kind chips, the earned-state filter and the
// missable-watch toggle. Spoiler handling lives here too, so every view
// agrees on what a hidden story trophy looks like.

export const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

export const KIND_FILTERS = [
  { key: 'all', label: 'All kinds' },
  { key: 'story', label: 'Story' },
  { key: 'side', label: 'Strangers & Side' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'world', label: 'World & Free Roam' },
  { key: 'missable', label: 'Missable watch' },
];

export function defaultFilters() {
  return {
    query: '',
    grade: 'all',
    kind: 'all',
    earnedState: 'all',
    sort: 'roadmap',
  };
}

export function isSpoilerHidden(trophy, state) {
  return state.spoilersHidden && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

export function displayName(trophy, state) {
  return isSpoilerHidden(trophy, state) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(trophy, state) {
  if (isSpoilerHidden(trophy, state)) return 'Spoiler shield is on — earn this story trophy to reveal it.';
  return trophy.description;
}

export function matchesFilters(trophy, filters, state) {
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (filters.kind !== 'all' && trophy.kind !== filters.kind) return false;
  if (filters.earnedState === 'earned' && !state.earned.has(trophy.id)) return false;
  if (filters.earnedState === 'remaining' && state.earned.has(trophy.id)) return false;
  if (filters.query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.kindLabel} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  return true;
}

export function sortTrophies(list, sortKey) {
  const sorted = [...list];
  if (sortKey === 'grade') {
    sorted.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  } else if (sortKey === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortKey === 'remaining') {
    sorted.sort((a, b) => a.id - b.id);
  } else {
    sorted.sort((a, b) => a.id - b.id);
  }
  return sorted;
}

export function groupByKind(trophies) {
  const order = ['platinum', 'story', 'side', 'collectibles', 'activities', 'world', 'completion'];
  const groups = new Map(order.map((key) => [key, []]));
  for (const trophy of trophies) {
    if (!groups.has(trophy.kind)) groups.set(trophy.kind, []);
    groups.get(trophy.kind).push(trophy);
  }
  return [...groups.entries()].filter(([, items]) => items.length > 0);
}

export function readUrlFilters() {
  const params = new URLSearchParams(location.search);
  const filters = defaultFilters();
  if (params.get('grade')) filters.grade = params.get('grade');
  if (params.get('kind')) filters.kind = params.get('kind');
  if (params.get('q')) filters.query = params.get('q');
  if (params.get('earned')) filters.earnedState = params.get('earned');
  if (params.get('sort')) filters.sort = params.get('sort');
  return {
    filters,
    view: params.get('view') || 'guide',
    selected: params.get('trophy') ? Number(params.get('trophy')) : null,
    spoilers: params.get('spoilers') === 'on',
    seed: params.get('seed') === 'demo',
  };
}
