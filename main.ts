// Vice Cover Maker — a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The app is plain static files under app/: index.html plus one ES module (app.js)
// and a stylesheet, an OFL font under app/fonts/, and two sample photos made with
// an image model. It runs offline in desktop Chrome and exports a PNG cover.
//
// This program hands the entry in: it copies app/ and screenshots/ from beside
// this file into the output directory and writes /output/dossier.json with the
// vendored make.fun library (buildDossier). Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(source, target) {
  if (!existsSync(source)) return;
  cpSync(source, target, { recursive: true });
}

function writeDossier() {
  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
  // bytes; the others refuse an entry the scorer would refuse (more than 4
  // screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
  // app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
  // /output's own 1000-entry cap, its screenshots/ and dossier.json).
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  return dossier.length;
}

// Start from a clean output directory so stale files can never leak into a run.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
const dossierBytes = writeDossier();
console.log(`wrote ${outDir} (dossier.json ${dossierBytes} bytes)`);
