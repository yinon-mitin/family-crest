// Отбирает из набора game-icons только значки каталога и пишет их контуры в src/data/symbols.json.
// Падает с ошибкой, если значок не найден или состоит не из одного контура.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { ICONS_USED } from '../src/data/catalog.ts';

const require = createRequire(import.meta.url);
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'));

const out: Record<string, string> = {};
const problems: string[] = [];
const seen = new Set<string>();
for (const id of ICONS_USED) {
  if (seen.has(id)) {
    problems.push(`повтор в каталоге: ${id}`);
    continue;
  }
  seen.add(id);
  const icon = set.icons[id];
  if (!icon) {
    problems.push(`нет значка: ${id}`);
    continue;
  }
  const m = /^<path [^>]*\bd="([^"]+)"[^>]*\/>$/.exec(icon.body);
  if (!m) {
    problems.push(`значок не из одного контура: ${id}`);
    continue;
  }
  out[id] = m[1];
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const target = new URL('../src/data/symbols.json', import.meta.url);
mkdirSync(dirname(target.pathname), { recursive: true });
writeFileSync(target, JSON.stringify(out));
console.log(`symbols.json: ${Object.keys(out).length} значков, ${(JSON.stringify(out).length / 1024).toFixed(0)} КБ`);
