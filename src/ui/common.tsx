import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import type { DivisionId, ShapeId, OrnamentId } from '../model/types.ts';
import { getSymbolPath } from '../data/symbols.ts';
import { prompts, tinctureByHex, tinctures } from '../i18n/data.ts';
import { t } from '../i18n/index.ts';
import type { TabId } from '../model/store.ts';
import { ORNAMENTS } from '../render/ornaments.ts';
import { SHAPES, shieldFields } from '../render/shields.ts';

export function SymbolThumb({ icon }: { icon: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path d={getSymbolPath(icon) ?? ''} fill="currentColor" />
    </svg>
  );
}

export function ShapeThumb({ shape }: { shape: ShapeId }) {
  return (
    <svg viewBox="-340 -390 680 780" aria-hidden="true">
      <path d={SHAPES[shape].d} fill="currentColor" />
    </svg>
  );
}

export function DivisionThumb({ division }: { division: DivisionId }) {
  const id = useId();
  const tones = ['#2c5aa0', '#e0b44c', '#b3282d', '#2f7a4a'];
  return (
    <svg viewBox="-340 -390 680 780" aria-hidden="true">
      <clipPath id={`${id}c`}>
        <path d={SHAPES.heater.d} />
      </clipPath>
      <g clip-path={`url(#${id}c)`}>
        {shieldFields('heater', division).map((f, i) => (
          <path key={i} d={f.d} fill={tones[i % 4]} stroke="#1c1c24" stroke-width="14" />
        ))}
      </g>
      <path d={SHAPES.heater.d} fill="none" stroke="#1c1c24" stroke-width="18" />
    </svg>
  );
}

export function OrnamentThumb({ id }: { id: OrnamentId }) {
  const o = ORNAMENTS[id];
  const pad = 20;
  return (
    <svg
      viewBox={`${-o.w / 2 - pad} ${-o.h / 2 - pad} ${o.w + 2 * pad} ${o.h + 2 * pad}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: o.draw(o.color, o.color2) }}
    />
  );
}

export function ColorField(props: {
  label: string;
  value: string | null;
  onChange(v: string | null): void;
  /** Показывать кнопку «без цвета» (например, для обводки символа). */
  none?: boolean;
  /** Показывать значение выбранного цвета. */
  meaning?: boolean;
}) {
  const tincture = props.value ? tinctureByHex(props.value) : undefined;
  return (
    <div class="field">
      <div class="field-label">{props.label}</div>
      <div class="swatches" role="group" aria-label={props.label}>
        {props.none && (
          <button type="button" class={`swatch none${props.value === null ? ' on' : ''}`} title={t('color.none')} aria-label={t('color.none')} aria-pressed={props.value === null} onClick={() => props.onChange(null)} />
        )}
        {tinctures().map((c) => (
          <button
            type="button"
            key={c.hex}
            class={`swatch${props.value?.toLowerCase() === c.hex ? ' on' : ''}`}
            style={{ background: c.hex }}
            title={c.name}
            aria-label={c.name}
            aria-pressed={props.value?.toLowerCase() === c.hex}
            onClick={() => props.onChange(c.hex)}
          />
        ))}
        <label class="swatch custom" title={t('color.custom')}>
          <input type="color" value={props.value ?? '#ffffff'} aria-label={t('color.customOf', { label: props.label })} onInput={(e) => props.onChange((e.target as HTMLInputElement).value)} />
        </label>
      </div>
      {props.meaning && tincture && (
        <div class="hint">
          <b>{tincture.name}</b>: {tincture.meaning}
        </div>
      )}
    </div>
  );
}

export function Slider(props: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onInput(v: number): void }) {
  const id = useId();
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {props.label}: <span class="value">{Math.round(props.value * 10) / 10}{props.unit ?? ''}</span>
      </label>
      <input id={id} type="range" min={props.min} max={props.max} step={props.step ?? 1} value={props.value} onInput={(e) => props.onInput(Number((e.target as HTMLInputElement).value))} />
    </div>
  );
}

export function Prompts({ tab }: { tab: TabId }) {
  return (
    <details class="prompts">
      <summary>{t('prompts.title')}</summary>
      <ul>
        {prompts(tab).map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
      <p class="hint">{t('prompts.hint')}</p>
    </details>
  );
}

export function Section(props: { title: string; children: ComponentChildren }) {
  return (
    <section class="section">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}
