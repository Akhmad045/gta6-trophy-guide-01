// Leonida Nights — progress store: earned trophies, counter progress and the spoiler
// shield, persisted in localStorage, with export / import / reset for the tracker.
// State shape: { earned: number[], counters: { [trophyId]: number }, spoiler: boolean }

import { STORAGE_KEY } from './config.js';

export function blankState() {
  return { earned: [], counters: {}, spoiler: true };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    return normaliseState(parsed);
  } catch {
    return blankState();
  }
}

export function normaliseState(value) {
  const state = blankState();
  if (!value || typeof value !== 'object') return state;
  if (Array.isArray(value.earned)) {
    state.earned = [...new Set(value.earned.filter((n) => Number.isInteger(n)))];
  }
  if (value.counters && typeof value.counters === 'object') {
    for (const [key, count] of Object.entries(value.counters)) {
      const id = Number(key);
      if (Number.isInteger(id) && Number.isFinite(count) && count > 0) {
        state.counters[id] = Math.floor(count);
      }
    }
  }
  if (typeof value.spoiler === 'boolean') state.spoiler = value.spoiler;
  return state;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-mode or full storage: the tracker keeps working for this session.
  }
}

export function exportState(state) {
  const payload = {
    app: 'Leonida Nights — GTA VI Trophy Guide',
    version: 3,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    counters: state.counters,
    spoiler: state.spoiler,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-nights-progress.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function importState(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Accept both this app's export shape and a bare { earned, counters } object.
  return normaliseState(parsed);
}

export function counterOf(state, trophy) {
  return Math.min(state.counters[trophy.id] ?? 0, trophy.target ?? 0);
}

export function counterComplete(state, trophy) {
  return Boolean(trophy.target) && counterOf(state, trophy) >= trophy.target;
}
