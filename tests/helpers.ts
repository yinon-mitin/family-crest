import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { registerFont } from '../src/render/fonts.ts';
import { setSymbols } from '../src/data/symbols.ts';

const require = createRequire(import.meta.url);

const buf = (pkg: string, file: string): ArrayBuffer => {
  const b = readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

export function loadAll(): void {
  for (const [id, pkg] of [['serif', 'pt-serif'], ['display', 'cormorant']] as const) {
    for (const [bold, w] of [[false, 400], [true, 700]] as const) {
      registerFont(id, bold, [buf(pkg, `${pkg}-cyrillic-${w}-normal.woff`), buf(pkg, `${pkg}-latin-${w}-normal.woff`)]);
    }
  }
  setSymbols(JSON.parse(readFileSync(new URL('../src/data/symbols.json', import.meta.url), 'utf8')));
}
