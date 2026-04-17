// Copie les assets Tarteaucitron.js depuis node_modules vers public/tarteaucitron/
// au build. Self-hosted pour conformité CNIL (aucun call tiers avant consent).
// Idempotent : lance à chaque prebuild/predev, ne fait rien si déjà à jour.

import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'node_modules', 'tarteaucitronjs');
const DEST = join(ROOT, 'public', 'tarteaucitron');

if (!existsSync(SRC)) {
  console.error('[tarteaucitron] node_modules/tarteaucitronjs introuvable — lance `npm install`');
  process.exit(1);
}

const pkgVersion = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf-8')).version;
mkdirSync(DEST, { recursive: true });

const FILES = [
  'tarteaucitron.min.js',
  'tarteaucitron.services.min.js',
];
const DIRS = ['lang', 'css'];

for (const f of FILES) cpSync(join(SRC, f), join(DEST, f));
for (const d of DIRS) cpSync(join(SRC, d), join(DEST, d), { recursive: true });

console.log(`[tarteaucitron] v${pkgVersion} copié vers public/tarteaucitron/`);
