export const CANVAS_W = 1000;
export const CANVAS_H = 1200;

export type ShapeId = 'heater' | 'french' | 'round' | 'oval' | 'kite' | 'lozenge' | 'notched' | 'hexagon';
export type DivisionId = 'whole' | 'pale' | 'fess' | 'bend' | 'bendSinister' | 'quarterly' | 'chevron' | 'pall' | 'fess3';
export type PatternId = 'stripes' | 'chevrons' | 'checks' | 'lozenges' | 'scales' | 'waves' | 'dots' | 'ermine';
export type OrnamentId =
  | 'laurel'
  | 'olive'
  | 'wheat'
  | 'crown'
  | 'ribbon'
  | 'rays'
  | 'ringDots'
  | 'ringDouble'
  | 'frame'
  | 'flourish'
  | 'stars'
  | 'tree';
export type FontId = 'serif' | 'display';
export type TextForm = 'line' | 'arcUp' | 'arcDown' | 'banner';

export interface FieldStyle {
  color: string;
  pattern: PatternId | null;
  patternColor: string;
}

interface Base {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipX: boolean;
  hidden: boolean;
  locked: boolean;
  /** Личная заметка участника: почему выбран этот элемент. */
  note: string;
}

export interface ShieldLayer extends Base {
  kind: 'shield';
  shape: ShapeId;
  division: DivisionId;
  fields: FieldStyle[];
  outline: string;
  outlineWidth: number;
}

export interface SymbolLayer extends Base {
  kind: 'symbol';
  symbol: string;
  color: string;
  /** Контрастная обводка, чтобы символ был виден на любом поле. */
  halo: string | null;
  /** Привязка к полю щита. Пока она есть, положение и размер вычисляются из поля. */
  slot?: { shield: string; field: number };
}

export interface OrnamentLayer extends Base {
  kind: 'ornament';
  ornament: OrnamentId;
  color: string;
  color2: string;
}

export interface TextLayer extends Base {
  kind: 'text';
  text: string;
  font: FontId;
  bold: boolean;
  form: TextForm;
  color: string;
  bannerColor: string;
  /** Радиус дуги в единицах холста (для форм arcUp и arcDown). */
  radius: number;
}

export type Layer = ShieldLayer | SymbolLayer | OrnamentLayer | TextLayer;

export interface CrestDoc {
  version: 1;
  family: string;
  background: string | null;
  snap: boolean;
  layers: Layer[];
}
