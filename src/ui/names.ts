import type { Layer } from '../model/types.ts';
import { ornamentMeaning, ornamentName, shapeName, symbolInfo } from '../i18n/data.ts';
import { t } from '../i18n/index.ts';

export function layerTitle(l: Layer): string {
  switch (l.kind) {
    case 'shield':
      return t('layer.shield', { shape: shapeName(l.shape).toLowerCase() });
    case 'symbol':
      return symbolInfo(l.symbol)?.name ?? t('layer.symbol');
    case 'ornament':
      return ornamentName(l.ornament);
    case 'text':
      return l.text ? t('layer.text', { text: l.text }) : t('layer.emptyText');
  }
}

export function layerMeaning(l: Layer): string | undefined {
  if (l.kind === 'symbol') return symbolInfo(l.symbol)?.meaning;
  if (l.kind === 'ornament') return ornamentMeaning(l.ornament);
  return undefined;
}

export const kindLabel = (kind: Layer['kind']): string => t(`kind.${kind}`);
