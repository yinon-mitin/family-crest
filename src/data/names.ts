import type { DivisionId, FontId, PatternId, ShapeId, TextForm } from '../model/types.ts';
import { DIVISIONS, SHAPES } from '../render/shields.ts';
import { PATTERNS } from '../render/patterns.ts';
import { FONT_NAMES } from '../render/fonts.ts';
import { divisionName, patternName, shapeName } from '../i18n/data.ts';
import { t } from '../i18n/index.ts';

// Списки собираются при каждом вызове, чтобы названия шли на текущем языке.
export const shapeList = () => (Object.keys(SHAPES) as ShapeId[]).map((id) => ({ id, name: shapeName(id) }));
export const divisionList = () => (Object.keys(DIVISIONS) as DivisionId[]).map((id) => ({ id, name: divisionName(id) }));
export const patternList = () => (Object.keys(PATTERNS) as PatternId[]).map((id) => ({ id, name: patternName(id) }));
export const fontList = () => (Object.keys(FONT_NAMES) as FontId[]).map((id) => ({ id, name: FONT_NAMES[id] }));
export const textForms = (): { id: TextForm; name: string }[] => [
  { id: 'line', name: t('text.form.line') },
  { id: 'arcUp', name: t('text.form.arcUp') },
  { id: 'arcDown', name: t('text.form.arcDown') },
  { id: 'banner', name: t('text.form.banner') },
];
