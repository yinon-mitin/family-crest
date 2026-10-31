import type { Layer } from '../model/types.ts';
import { BY_ICON } from '../data/catalog.ts';
import { ORNAMENTS } from '../render/ornaments.ts';
import { SHAPES } from '../render/shields.ts';

export function layerTitle(l: Layer): string {
  switch (l.kind) {
    case 'shield':
      return `Щит: ${SHAPES[l.shape].name.toLowerCase()}`;
    case 'symbol':
      return BY_ICON[l.symbol]?.name ?? 'Символ';
    case 'ornament':
      return ORNAMENTS[l.ornament].name;
    case 'text':
      return l.text ? `«${l.text}»` : 'Пустая надпись';
  }
}

export function layerMeaning(l: Layer): string | undefined {
  if (l.kind === 'symbol') return BY_ICON[l.symbol]?.meaning;
  if (l.kind === 'ornament') return ORNAMENTS[l.ornament].meaning;
  return undefined;
}

export const KIND_LABEL: Record<Layer['kind'], string> = {
  shield: 'Щит',
  symbol: 'Символ',
  ornament: 'Орнамент',
  text: 'Надпись',
};
