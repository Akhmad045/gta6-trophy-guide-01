// Leonida Ledger — entry program for gta6-trophy-guide-01 (Node 22, standard
// library only). The guide itself is the app/ folder beside this file: plain
// static files (index.html, style.css, app.js, data/trophies.json) that a
// browser opens offline and that load nothing over the network.
//
// This program hands the guide in. It copies app/ and screenshots/ into the
// output folder and writes dossier.json there with buildDossier from
// vendor/makefun-frontend.ts, the kit's library, left byte-identical on
// purpose: the scorer rebuilds the dossier with its own copy and compares.
//
// Run it locally the same way the grader does, with an output override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json): the dossier text
// budget, at most 4 screenshots of at most 256 KiB each, and app/ within 993
// files and 48 MiB. Passing them here means an entry the scorer would refuse
// for size fails loudly at build time instead of silently at grading.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
