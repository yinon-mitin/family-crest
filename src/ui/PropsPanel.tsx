import type { Layer, SymbolLayer, TextLayer } from '../model/types.ts';
import { attachSymbol, detachSymbol, findLayer, nearestSlot, resolveSymbol } from '../model/doc.ts';
import { commit, deleteLayer, duplicateLayer, getState, moveLayer, setDoc, setState, updateLayer, useStore, type TabId } from '../model/store.ts';
import { fontList, textForms } from '../data/names.ts';
import { t } from '../i18n/index.ts';
import { textBox } from '../render/text.ts';
import { ColorField, Section, Slider } from './common.tsx';
import { kindLabel, layerMeaning, layerTitle } from './names.ts';

const CATALOG_TABS: TabId[] = ['work', 'animal', 'nature', 'symbol'];

export function PropsPanel() {
  const doc = useStore((s) => s.doc);
  const id = useStore((s) => s.selected);
  const l = findLayer(doc, id);
  if (!l) return <DocSettings />;
  return <LayerProps layer={l} />;
}

function DocSettings() {
  const doc = useStore((s) => s.doc);
  const hasShield = doc.layers.some((l) => l.kind === 'shield');
  return (
    <div class="panel props-panel">
      <Section title={t('doc.title')}>
        <p class="hint">{t('doc.hint')}</p>
        <ColorField label={t('doc.background')} value={doc.background} none onChange={(v) => setDoc({ background: v }, 'bg')} />
        {hasShield && (
          <label class="check">
            <input type="checkbox" checked={doc.snap} onChange={(e) => setDoc({ snap: (e.target as HTMLInputElement).checked })} />
            <span>{t('doc.snap')}</span>
          </label>
        )}
        {hasShield && <p class="hint">{t('doc.snapHint')}</p>}
      </Section>
    </div>
  );
}

function LayerProps({ layer: l }: { layer: Layer }) {
  const doc = useStore((s) => s.doc);
  const replace = useStore((s) => s.replace);
  const set = (patch: Partial<Layer>, key = '') => updateLayer(l.id, patch, key);
  const meaning = layerMeaning(l);
  const hasShield = doc.layers.some((x) => x.kind === 'shield');
  const slotted = l.kind === 'symbol' && l.slot && doc.layers.some((x) => x.id === l.slot!.shield);
  const idx = doc.layers.findIndex((x) => x.id === l.id);

  const range: [number, number] =
    l.kind === 'shield' ? [30, 200] : l.kind === 'symbol' ? (slotted ? [20, 200] : [10, 500]) : l.kind === 'text' ? [20, 300] : [20, 300];

  return (
    <div class="panel props-panel">
      <div class="props-head">
        <div class="kind">{kindLabel(l.kind)}</div>
        <h2>{layerTitle(l)}</h2>
        {meaning && <p class="meaning">{t('meaning.prefix', { text: meaning })}</p>}
      </div>

      {l.kind === 'symbol' && <SymbolProps layer={l} replace={replace} hasShield={hasShield} slotted={!!slotted} />}
      {l.kind === 'ornament' && (
        <Section title={t('props.colors')}>
          <ColorField label={t('props.color1')} value={l.color} onChange={(v) => v && set({ color: v }, 'c1')} />
          <ColorField label={t('props.color2')} value={l.color2} onChange={(v) => v && set({ color2: v }, 'c2')} />
        </Section>
      )}
      {l.kind === 'text' && <TextProps layer={l} />}
      {l.kind === 'shield' && (
        <Section title={t('shield.title')}>
          <p class="hint">{t('props.shieldHint')}</p>
          <button type="button" class="btn" onClick={() => setState({ pane: 'add', tab: 'shield' })}>{t('props.openShield')}</button>
          <div class="spacer" />
          <ColorField label={t('props.outline')} value={l.outline} onChange={(v) => v && set({ outline: v }, 'outline')} />
          <Slider label={t('props.outlineWidth')} value={l.outlineWidth} min={0} max={30} onInput={(v) => set({ outlineWidth: v }, 'ow')} />
        </Section>
      )}

      <Section title={t('props.sizeRotate')}>
        <Slider label={t('props.size')} value={l.scale * 100} min={range[0]} max={range[1]} unit="%" onInput={(v) => set({ scale: v / 100 }, 'scale')} />
        <Slider label={t('props.rotation')} value={l.rotation} min={-180} max={180} unit="°" onInput={(v) => set({ rotation: v }, 'rot')} />
        <div class="row">
          {l.kind !== 'text' && <button type="button" class="btn" onClick={() => set({ flipX: !l.flipX })}>{t('props.flip')}</button>}
          <button type="button" class="btn" onClick={() => set({ rotation: 0 })}>{t('props.resetRotation')}</button>
        </div>
      </Section>

      <Section title={t('props.why')}>
        <textarea
          rows={3}
          maxLength={1000}
          placeholder={t('props.whyPlaceholder')}
          value={l.note}
          onInput={(e) => set({ note: (e.target as HTMLTextAreaElement).value }, 'note')}
        />
      </Section>

      <Section title={t('props.actions')}>
        <div class="row wrap">
          <button type="button" class="btn" onClick={() => duplicateLayer(l.id)}>{t('props.duplicate')}</button>
          <button type="button" class="btn" disabled={idx >= doc.layers.length - 1} onClick={() => moveLayer(l.id, 1)}>{t('props.up')}</button>
          <button type="button" class="btn" disabled={idx <= 0} onClick={() => moveLayer(l.id, -1)}>{t('props.down')}</button>
          <button type="button" class="btn" onClick={() => set({ locked: !l.locked })}>{l.locked ? t('props.unlock') : t('props.lock')}</button>
          <button type="button" class="btn" onClick={() => set({ hidden: !l.hidden })}>{l.hidden ? t('props.show') : t('props.hide')}</button>
          <button type="button" class="btn danger" onClick={() => deleteLayer(l.id)}>{t('props.delete')}</button>
        </div>
      </Section>
    </div>
  );
}

function SymbolProps({ layer: l, replace, hasShield, slotted }: { layer: SymbolLayer; replace: boolean; hasShield: boolean; slotted: boolean }) {
  const doc = useStore((s) => s.doc);
  const set = (patch: Partial<SymbolLayer>, key = '') => updateLayer(l.id, patch, key);
  const toSlot = () => {
    const r = resolveSymbol(l, doc);
    const near = nearestSlot(doc, r.x, r.y);
    if (near) commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? attachSymbol(l, near.shield, near.field) : x)) }));
  };
  return (
    <>
      <Section title={t('symbol.color')}>
        <ColorField label={t('symbol.ink')} value={l.color} meaning onChange={(v) => v && set({ color: v }, 'c1')} />
        <ColorField label={t('symbol.halo')} value={l.halo} none onChange={(v) => set({ halo: v }, 'halo')} />
      </Section>
      <Section title={t('symbol.position')}>
        {hasShield && (
          <div class="row wrap">
            {slotted ? (
              <>
                <span class="hint grow">{t('symbol.slotted')}</span>
                <button type="button" class="btn" onClick={() => commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? detachSymbol(l, d) : x)) }))}>{t('symbol.detach')}</button>
              </>
            ) : (
              <>
                <span class="hint grow">{t('symbol.free')}</span>
                <button type="button" class="btn" onClick={toSlot}>{t('symbol.attach')}</button>
              </>
            )}
          </div>
        )}
        <button type="button" class="btn" onClick={() => setState({ pane: 'add', replace: true, tab: CATALOG_TABS.includes(getState().tab) ? getState().tab : 'symbol' })}>
          {replace ? t('symbol.replaceChoose') : t('symbol.replace')}
        </button>
      </Section>
    </>
  );
}

function TextProps({ layer: l }: { layer: TextLayer }) {
  const set = (patch: Partial<TextLayer>, key = '') => updateLayer(l.id, patch, key);
  const { missing } = textBox(l);
  return (
    <Section title={t('label.title')}>
      <div class="field">
        <label class="field-label" for="txt">{t('label.text')}</label>
        <input id="txt" type="text" maxLength={60} value={l.text} onInput={(e) => set({ text: (e.target as HTMLInputElement).value }, 'text')} />
      </div>
      {missing.length > 0 && <p class="warn">{t('label.missing', { chars: missing.join(' ') })}</p>}
      <div class="field">
        <label class="field-label" for="form">{t('label.form')}</label>
        <select id="form" value={l.form} onChange={(e) => set({ form: (e.target as HTMLSelectElement).value as TextLayer['form'] })}>
          {textForms().map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      {(l.form === 'arcUp' || l.form === 'arcDown') && <Slider label={t('label.radius')} value={l.radius} min={120} max={1200} step={10} onInput={(v) => set({ radius: v }, 'radius')} />}
      <div class="field">
        <label class="field-label" for="font">{t('label.font')}</label>
        <select id="font" value={l.font} onChange={(e) => set({ font: (e.target as HTMLSelectElement).value as TextLayer['font'] })}>
          {fontList().map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <label class="check">
        <input type="checkbox" checked={l.bold} onChange={(e) => set({ bold: (e.target as HTMLInputElement).checked })} />
        <span>{t('label.bold')}</span>
      </label>
      <ColorField label={t('label.color')} value={l.color} onChange={(v) => v && set({ color: v }, 'c1')} />
      {l.form === 'banner' && <ColorField label={t('label.bannerColor')} value={l.bannerColor} onChange={(v) => v && set({ bannerColor: v }, 'c2')} />}
    </Section>
  );
}
