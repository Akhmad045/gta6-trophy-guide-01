// Leonida Nights — GTA VI trophy guide entrypoint (Node 22, standard library only).
//
// This program is the entry's own build step, written for this guide. It does not just
// copy files: before anything is handed in it runs a pre-flight over the repository —
// the app shell must be complete, the trophy data must parse and must carry exactly
// the official 55 trophies in the official grade mix (1 platinum, 2 gold, 6 silver,
// 46 bronze), every trophy must carry a non-blank guide, and the screenshots must sit
// inside the competition caps. Only a tree that passes is copied, deterministically,
// to the output directory, where the vendored make.fun library writes dossier.json.
// A final size check and a printed build report close the run.
//
// Run locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and the output is /output.

import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

/* ------------------------------------------------------------------ config */

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const EXPECTED_TROPHY_COUNT = 55;
const EXPECTED_GRADE_MIX = { platinum: 1, gold: 2, silver: 6, bronze: 46 } as const;
const REQUIRED_APP_FILES = [
  'index.html',
  'style.css',
  join('js', 'app.js'),
  join('js', 'config.js'),
  join('js', 'render.js'),
  join('js', 'store.js'),
  join('data', 'trophies.json'),
];
const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 50_331_648,
} as const;
const DOSSIER_MAX_BYTES = 1_572_864; // 1.5 MiB, the scorer's dossier cap.
const MIN_SCREENSHOTS = 3;

/* ------------------------------------------------------------------ helpers */

const problems: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) problems.push(message);
}

function listFilesSorted(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) found.push(full);
    }
  };
  walk(root);
  return found;
}

function failIfProblems(stage: string): void {
  if (problems.length === 0) return;
  console.error(`Leonida Nights pre-flight failed at ${stage}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

/* ------------------------------------------------------- pre-flight: shell */

const appDir = join(HERE, 'app');
check(existsSync(appDir), 'app/ directory is missing');
for (const rel of REQUIRED_APP_FILES) {
  check(existsSync(join(appDir, rel)), `app/${rel} is missing from the app shell`);
}
failIfProblems('app shell');

/* ------------------------------------------------------ pre-flight: trophies */

type TrophyRecord = { name?: unknown; grade?: unknown; guide?: unknown };

let trophyCount = 0;
const gradeMix: Record<string, number> = {};
try {
  const raw = readFileSync(join(appDir, 'data', 'trophies.json'), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const list: TrophyRecord[] = Array.isArray(parsed)
    ? (parsed as TrophyRecord[])
    : ((parsed as { trophies?: TrophyRecord[] }).trophies ?? []);
  trophyCount = list.length;
  check(list.length === EXPECTED_TROPHY_COUNT, `expected ${EXPECTED_TROPHY_COUNT} trophies, found ${list.length}`);
  const seenNames = new Set<string>();
  for (const trophy of list) {
    const name = typeof trophy.name === 'string' ? trophy.name : '';
    check(name.length > 0, 'a trophy is missing its official name');
    check(!seenNames.has(name), `duplicate trophy name: ${name}`);
    seenNames.add(name);
    const grade = typeof trophy.grade === 'string' ? trophy.grade : '';
    gradeMix[grade] = (gradeMix[grade] ?? 0) + 1;
    check(
      typeof trophy.guide === 'string' && trophy.guide.trim().length > 0,
      `trophy "${name}" has a blank guide`,
    );
  }
  for (const [grade, expected] of Object.entries(EXPECTED_GRADE_MIX)) {
    check(gradeMix[grade] === expected, `grade mix: expected ${expected} ${grade}, found ${gradeMix[grade] ?? 0}`);
  }
} catch (error) {
  check(false, `app/data/trophies.json does not parse: ${(error as Error).message}`);
}
failIfProblems('trophy data');

/* --------------------------------------------------- pre-flight: screenshots */

const shotsDir = join(HERE, 'screenshots');
const shotFiles = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort()
  : [];
check(
  shotFiles.length >= MIN_SCREENSHOTS && shotFiles.length <= DOSSIER_CAPS.screenshots.max,
  `screenshots/ must hold ${MIN_SCREENSHOTS} to ${DOSSIER_CAPS.screenshots.max} images, found ${shotFiles.length}`,
);
for (const name of shotFiles) {
  const size = statSync(join(shotsDir, name)).size;
  check(size <= DOSSIER_CAPS.screenshots.max_bytes, `screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
}
failIfProblems('screenshots');

/* ------------------------------------------------------- deterministic copy */

// Copy in sorted-path order so two runs over the same tree produce the same output
// tree (and therefore the same dossier) byte for byte.
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(join(OUTPUT_DIR, 'app'), { recursive: true });
mkdirSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true });

let copiedAppFiles = 0;
for (const file of listFilesSorted(appDir)) {
  const rel = file.slice(appDir.length + 1);
  const target = join(OUTPUT_DIR, 'app', rel);
  mkdirSync(join(target, '..'), { recursive: true });
  cpSync(file, target);
  copiedAppFiles += 1;
}
for (const name of shotFiles) {
  cpSync(join(shotsDir, name), join(OUTPUT_DIR, 'screenshots', name));
}

/* ------------------------------------------------------------- dossier write */

const dossierPath = join(OUTPUT_DIR, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(OUTPUT_DIR, {
    text_max_bytes: DOSSIER_CAPS.text_max_bytes,
    screenshots: { max: DOSSIER_CAPS.screenshots.max, max_bytes: DOSSIER_CAPS.screenshots.max_bytes },
    app_max_files: DOSSIER_CAPS.app_max_files,
    app_max_bytes: DOSSIER_CAPS.app_max_bytes,
  }),
);
const dossierBytes = statSync(dossierPath).size;
check(dossierBytes <= DOSSIER_MAX_BYTES, `dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
failIfProblems('dossier');

/* -------------------------------------------------------------- build report */

console.log('Leonida Nights — build report');
console.log(`  trophies: ${trophyCount} (platinum ${gradeMix.platinum ?? 0}, gold ${gradeMix.gold ?? 0}, silver ${gradeMix.silver ?? 0}, bronze ${gradeMix.bronze ?? 0})`);
console.log(`  app files copied: ${copiedAppFiles}`);
console.log(`  screenshots: ${shotFiles.length} (${shotFiles.join(', ')})`);
console.log(`  dossier: ${dossierBytes} bytes at ${dossierPath}`);
console.log('  pre-flight: all checks passed');
