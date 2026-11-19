// store.js — progress state for Leonida Nights.
// Earned trophies, per-trophy counters and the spoiler setting live in
// localStorage, so progress survives reloads with the network off. The same
// state can be exported to a JSON file and imported back on another machine.

const STORAGE_KEY = 'leonida-nights-progress-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    return {
      earned: new Set(Array.isArray(parsed.earned) ? parsed.earned : []),
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      spoilersHidden: parsed.spoilersHidden === true,
    };
  } catch {
    return freshState();
  }
}

export function freshState() {
  return { earned: new Set(), counters: {}, spoilersHidden: false };
}

export function saveState(state) {
  const payload = {
    earned: [...state.earned],
    counters: state.counters,
    spoilersHidden: state.spoilersHidden,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function toggleEarned(state, trophyId) {
  if (state.earned.has(trophyId)) state.earned.delete(trophyId);
  else state.earned.add(trophyId);
  saveState(state);
  return state.earned.has(trophyId);
}

export function setCounter(state, trophyId, value, target) {
  const clamped = Math.max(0, target ? Math.min(value, target) : value);
  state.counters[trophyId] = clamped;
  saveState(state);
  return clamped;
}

export function counterOf(state, trophy) {
  return state.counters[trophy.id] ?? 0;
}

export function exportProgress(state) {
  const payload = {
    app: 'leonida-nights',
    game: 'Grand Theft Auto VI',
    exportedEarned: [...state.earned],
    counters: state.counters,
    spoilersHidden: state.spoilersHidden,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-nights-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importProgress(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Accept both this app's export shape and a bare array of trophy ids/names.
  const earnedList = Array.isArray(parsed) ? parsed : parsed.exportedEarned ?? parsed.earned ?? [];
  return {
    earned: new Set(earnedList),
    counters: !Array.isArray(parsed) && parsed.counters ? parsed.counters : {},
    spoilersHidden: !Array.isArray(parsed) && parsed.spoilersHidden === true,
  };
}

export function progressSummary(state, trophies) {
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totalByGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    totalByGrade[trophy.grade] += 1;
    if (state.earned.has(trophy.id)) byGrade[trophy.grade] += 1;
  }
  const earnedCount = state.earned.size;
  return {
    earnedCount,
    total: trophies.length,
    percent: trophies.length ? Math.round((earnedCount / trophies.length) * 100) : 0,
    byGrade,
    totalByGrade,
  };
}
