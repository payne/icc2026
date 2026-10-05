// Runs before every build/serve:
//  1. Copies the conference data (JSON + SQLite DB from ../data, produced by
//     fetch_data.py and build_db.py) into public/data.
//  2. Stamps public/updated.json with the build time. The running app polls
//     this file and fully reloads itself when the timestamp is newer than the
//     one it has stored.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

const DATA_FILES = [
  'event.json',
  'sessions.json',
  'speakers.json',
  'topics.json',
  'sponsors.json',
  'organizers.json',
  'icc2026.db',
];

const src = new URL('../../data/', import.meta.url);
const dest = new URL('../public/data/', import.meta.url);
mkdirSync(dest, { recursive: true });
for (const name of DATA_FILES) {
  copyFileSync(new URL(name, src), new URL(name, dest));
}
console.log(`copied ${DATA_FILES.length} data files to public/data`);

const updated = new Date().toISOString();
writeFileSync(new URL('../public/updated.json', import.meta.url), JSON.stringify({ updated }, null, 2) + '\n');
console.log(`updated.json: ${updated}`);
