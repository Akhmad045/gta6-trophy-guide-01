// Leonida Nights — GTA VI Trophy Guide & Tracker.
// Entrypoint for the gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// What this program does, in order:
//   1. Checks the entry on disk before anything is handed in: the app shell exists,
//      the trophy data parses and covers the full official list with a guide for
//      every trophy, and the screenshots sit inside the scorer's size limits.
//   2. Copies app/ and screenshots/ into the output directory with a deterministic,
//      sorted walk, so two runs over the same tree produce the same bytes.
//   3. Writes dossier.json with the vendored make.fun library (buildDossier) using
//      the scorer's caps, then confirms the dossier itself is under its cap and
//      prints a short build report.
//
// Run it the way the kit prescribes:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// With MAKEFUN_OUTPUT_DIR unset it writes to /output, as inside the grader.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// ---------------------------------------------------------------------------
// Entry configuration: the facts about this guide that the checks rely on.
// ---------------------------------------------------------------------------

const ENTRY = {
  slug: 'gta6-trophy-guide-01',
  title: 'Leonida Nights — GTA VI Trophy Guide & Tracker',
  game: 'Grand Theft Auto VI',
  platform: 'PlayStation 5',
  expectedTrophies: 55,
  grades: { platinum: 1, gold: 2, silver: 6, bronze: 46 },
};

// The scorer's caps, mirrored here so a bad tree fails locally with a clear
// message instead of failing silently at grade time.
const LIMITS = {
  textMaxBytes: 163840,
  screenshotMaxCount: 4,
  screenshotMaxBytes: 262144,
  appMaxEntries: 993,
  appMaxBytes: 50331648,
  dossierMaxBytes: 1572864,
};

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Small filesystem helpers (sorted, deterministic, no symlinks followed out).
// ---------------------------------------------------------------------------

function sortedEntries(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function walkFiles(dir, base = dir, acc = []) {
  for (const entry of sortedEntries(dir)) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, base, acc);
    else if (entry.isFile()) acc.push(relative(base, full));
  }
  return acc;
}

function copyTree(sourceDir, targetDir) {
  let files = 0;
  let bytes = 0;
  for (const rel of walkFiles(sourceDir)) {
    const from = join(sourceDir, rel);
    const to = join(targetDir, rel);
    mkdirSync(join(to, '..'), { recursive: true });
    copyFileSync(from, to);
    files += 1;
    bytes += statSync(from).size;
  }
  return { files, bytes };
}

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pre-flight checks: the guide is only handed in if its data is whole.
// ---------------------------------------------------------------------------

function checkAppTree(appDir) {
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing — the guide has no shell to open.');
  const files = walkFiles(appDir);
  let bytes = 0;
  for (const rel of files) bytes += statSync(join(appDir, rel)).size;
  if (files.length > LIMITS.appMaxEntries) fail(`app/ holds ${files.length} files, over the ${LIMITS.appMaxEntries} cap.`);
  if (bytes > LIMITS.appMaxBytes) fail(`app/ is ${bytes} bytes, over the ${LIMITS.appMaxBytes} cap.`);
  return { files: files.length, bytes };
}

function checkTrophyData(appDir) {
  const dataPath = join(appDir, 'data', 'trophies.json');
  if (!existsSync(dataPath)) fail('app/data/trophies.json is missing — the gate reads the trophy list from there.');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(dataPath, 'utf8'));
  } catch {
    fail('app/data/trophies.json is not valid JSON.');
  }
  const trophies = Array.isArray(parsed) ? parsed : parsed.trophies;
  if (!Array.isArray(trophies)) fail('app/data/trophies.json does not carry a trophies array.');
  if (trophies.length !== ENTRY.expectedTrophies) {
    fail(`trophy data covers ${trophies.length} trophies; the official list has ${ENTRY.expectedTrophies}.`);
  }
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (typeof trophy.name !== 'string' || trophy.name.trim() === '') fail('a trophy is missing its official name.');
    if (typeof trophy.guide !== 'string' || trophy.guide.trim() === '') fail(`trophy "${trophy.name}" has no guide text.`);
    if (typeof trophy.description !== 'string' || trophy.description.trim() === '') fail(`trophy "${trophy.name}" has no official description.`);
    if (!(trophy.grade in byGrade)) fail(`trophy "${trophy.name}" has an unknown grade "${trophy.grade}".`);
    byGrade[trophy.grade] += 1;
  }
  for (const [grade, want] of Object.entries(ENTRY.grades)) {
    if (byGrade[grade] !== want) fail(`grade mix is off: ${grade} shows ${byGrade[grade]}, the official list has ${want}.`);
  }
  return { count: trophies.length, byGrade };
}

function checkScreenshots(shotsDir) {
  if (!existsSync(shotsDir)) fail('screenshots/ is missing — an entry hands in 3 or 4 renders of the guide.');
  const shots = walkFiles(shotsDir).filter((rel) => !rel.includes(sep) && /\.(png|jpe?g)$/i.test(rel));
  if (shots.length < 3 || shots.length > LIMITS.screenshotMaxCount) {
    fail(`screenshots/ holds ${shots.length} images; the gate wants 3 or 4.`);
  }
  const report = [];
  for (const rel of shots) {
    const size = statSync(join(shotsDir, rel)).size;
    if (size > LIMITS.screenshotMaxBytes) fail(`screenshot ${rel} is ${size} bytes, over the ${LIMITS.screenshotMaxBytes} cap.`);
    report.push({ file: rel, bytes: size });
  }
  return report;
}

// ---------------------------------------------------------------------------
// The handoff itself.
// ---------------------------------------------------------------------------

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

const appStats = checkAppTree(appDir);
const trophyStats = checkTrophyData(appDir);
const shotStats = checkScreenshots(shotsDir);

mkdirSync(outputDir, { recursive: true });
const copiedApp = copyTree(appDir, join(outputDir, 'app'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const copiedShots = copyTree(shotsDir, join(outputDir, 'screenshots'));

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: LIMITS.textMaxBytes,
    screenshots: { max: LIMITS.screenshotMaxCount, max_bytes: LIMITS.screenshotMaxBytes },
    app_max_files: LIMITS.appMaxEntries,
    app_max_bytes: LIMITS.appMaxBytes,
  }),
);

const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
if (dossierBytes > LIMITS.dossierMaxBytes) fail(`dossier.json is ${dossierBytes} bytes, over the ${LIMITS.dossierMaxBytes} cap.`);

console.log(`${ENTRY.title} (${ENTRY.slug})`);
console.log(`  game data : ${trophyStats.count} trophies — ${trophyStats.byGrade.platinum} platinum, ${trophyStats.byGrade.gold} gold, ${trophyStats.byGrade.silver} silver, ${trophyStats.byGrade.bronze} bronze`);
console.log(`  app/      : ${appStats.files} files, ${appStats.bytes} bytes (copied ${copiedApp.files})`);
console.log(`  shots     : ${shotStats.map((s) => `${s.file} ${s.bytes}B`).join(' · ')} (copied ${copiedShots.files})`);
console.log(`  dossier   : ${dossierBytes} bytes written to ${join(outputDir, 'dossier.json')}`);
