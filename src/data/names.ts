import type { DivisionId, FontId, PatternId, ShapeId, TextForm } from '../model/types.ts';
import { DIVISIONS, SHAPES } from '../render/shields.ts';
import { PATTERNS } from '../render/patterns.ts';
import { FONT_NAMES } from '../render/fonts.ts';

export const SHAPE_LIST = (Object.keys(SHAPES) as ShapeId[]).map((id) => ({ id, name: SHAPES[id].name }));
export const DIVISION_LIST = (Object.keys(DIVISIONS) as DivisionId[]).map((id) => ({ id, name: DIVISIONS[id].name }));
export const PATTERN_LIST = (Object.keys(PATTERNS) as PatternId[]).map((id) => ({ id, name: PATTERNS[id].name }));
export const FONT_LIST = (Object.keys(FONT_NAMES) as FontId[]).map((id) => ({ id, name: FONT_NAMES[id] }));
export const TEXT_FORMS: { id: TextForm; name: string }[] = [
  { id: 'line', name: 'Прямо' },
  { id: 'arcUp', name: 'Дугой вверх' },
  { id: 'arcDown', name: 'Дугой вниз' },
  { id: 'banner', name: 'На ленте' },
];
