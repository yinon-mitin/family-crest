import { useState } from 'preact/hooks';
import type { Layer, ShieldLayer } from '../model/types.ts';
import type { CatalogEntry, Category } from '../data/catalog.ts';
import { divisionList, patternList, shapeList } from '../data/names.ts';
import { categoryTitle, ornamentMeaning, ornamentName, symbolCatalog } from '../i18n/data.ts';
import { t } from '../i18n/index.ts';
import { ORNAMENT_IDS } from '../render/ornaments.ts';
import { addOrnament, addShield, addSymbol, addText, replaceSymbol, setState, updateLayer, useStore, type TabId } from '../model/store.ts';
import { ColorField, DivisionThumb, OrnamentThumb, Prompts, Section, ShapeThumb, SymbolThumb } from './common.tsx';

const TABS: TabId[] = ['shield', 'work', 'animal', 'nature', 'symbol', 'ornament', 'text'];

export function AddPanel() {
  const tab = useStore((s) => s.tab);
  return (
    <div class="panel add-panel">
      <div class="tabs" role="tablist" aria-label={t('tab.label')}>
        {TABS.map((id) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setState({ tab: id })}>
            {t(`tab.${id}`)}
          </button>
        ))}
      </div>
      <div class="tab-body" role="tabpanel">
        <Prompts tab={tab} />
        {tab === 'shield' && <ShieldTab />}
        {(tab === 'work' || tab === 'animal' || tab === 'nature' || tab === 'symbol') && <Catalog cat={tab} />}
        {tab === 'ornament' && <OrnamentTab />}
        {tab === 'text' && <TextTab />}
      </div>
    </div>
  );
}

// ---------- щит ----------

function ShieldTab() {
  const doc = useStore((s) => s.doc);
  const selectedId = useStore((s) => s.selected);
  const shields = doc.layers.filter((l): l is ShieldLayer => l.kind === 'shield');
  const target = shields.find((s) => s.id === selectedId) ?? shields[0];
  if (!target) {
    return (
      <Section title={t('shield.title')}>
        <p class="hint">{t('shield.none')}</p>
        <button type="button" class="btn primary" onClick={addShield}>{t('shield.add')}</button>
      </Section>
    );
  }
  const set = (patch: Partial<ShieldLayer>, key = '') => updateLayer(target.id, patch, key);
  const setField = (i: number, patch: Partial<ShieldLayer['fields'][number]>, key: string) =>
    set({ fields: target.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }, key);
  return (
    <>
      {shields.length > 1 && (
        <p class="hint">
          {t('shield.which', { n: shields.indexOf(target) + 1, total: shields.length })}
        </p>
      )}
      <Section title={t('shield.shape')}>
        <div class="grid thumbs">
          {shapeList().map((s) => (
            <button key={s.id} type="button" class={`thumb${target.shape === s.id ? ' on' : ''}`} aria-pressed={target.shape === s.id} title={s.name} onClick={() => set({ shape: s.id })}>
              <ShapeThumb shape={s.id} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('shield.division')}>
        <div class="grid thumbs">
          {divisionList().map((d) => (
            <button key={d.id} type="button" class={`thumb${target.division === d.id ? ' on' : ''}`} aria-pressed={target.division === d.id} title={d.name} onClick={() => set({ division: d.id })}>
              <DivisionThumb division={d.id} />
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('shield.colors')}>
        {target.fields.map((f, i) => (
          <div class="card" key={i}>
            {target.fields.length > 1 && <div class="card-title">{t('shield.field', { n: i + 1 })}</div>}
            <ColorField label={t('shield.fieldColor')} value={f.color} meaning onChange={(v) => v && setField(i, { color: v }, `f${i}c`)} />
            <div class="field">
              <label class="field-label" for={`pat${i}`}>{t('shield.pattern')}</label>
              <select id={`pat${i}`} value={f.pattern ?? ''} onChange={(e) => setField(i, { pattern: ((e.target as HTMLSelectElement).value || null) as typeof f.pattern }, '')}>
                <option value="">{t('shield.noPattern')}</option>
                {patternList().map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {f.pattern && <ColorField label={t('shield.patternColor')} value={f.patternColor} onChange={(v) => v && setField(i, { patternColor: v }, `f${i}p`)} />}
          </div>
        ))}
        <ColorField label={t('shield.outlineColor')} value={target.outline} onChange={(v) => v && set({ outline: v }, 'outline')} />
      </Section>
    </>
  );
}

// ---------- каталог ----------

function Catalog({ cat }: { cat: Category }) {
  const [query, setQuery] = useState('');
  const [info, setInfo] = useState<CatalogEntry | null>(null);
  const selectedId = useStore((s) => s.selected);
  const doc = useStore((s) => s.doc);
  const replaceMode = useStore((s) => s.replace);
  const selected: Layer | undefined = doc.layers.find((l) => l.id === selectedId);
  const canReplace = selected?.kind === 'symbol';
  const q = query.trim().toLowerCase();
  const catalog = symbolCatalog();
  const items = q
    ? catalog.filter((e) => e.name.toLowerCase().includes(q) || e.meaning.toLowerCase().includes(q))
    : catalog.filter((e) => e.cat === cat);
  const title = q ? t('catalog.found', { n: items.length }) : categoryTitle(cat);

  const pick = (e: CatalogEntry) => {
    if (canReplace && replaceMode) {
      replaceSymbol(selected!.id, e.icon);
    } else {
      addSymbol(e.icon);
    }
    setInfo(e);
  };

  return (
    <>
      <div class="search">
        <input type="search" placeholder={t('catalog.search')} aria-label={t('catalog.searchLabel')} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {canReplace && (
        <div class="segmented" role="group" aria-label={t('catalog.modeLabel')}>
          <button type="button" class={!replaceMode ? 'on' : ''} aria-pressed={!replaceMode} onClick={() => setState({ replace: false })}>{t('catalog.modeAdd')}</button>
          <button type="button" class={replaceMode ? 'on' : ''} aria-pressed={replaceMode} onClick={() => setState({ replace: true })}>{t('catalog.modeReplace')}</button>
        </div>
      )}
      <Section title={title}>
        <div class="grid symbols">
          {items.map((e) => (
            <button
              key={e.icon}
              type="button"
              class="sym"
              title={`${e.name}: ${e.meaning}`}
              aria-label={e.name}
              onClick={() => pick(e)}
              onMouseEnter={() => setInfo(e)}
              onFocus={() => setInfo(e)}
            >
              <SymbolThumb icon={e.icon} />
            </button>
          ))}
        </div>
        {items.length === 0 && <p class="hint">{t('catalog.empty')}</p>}
      </Section>
      <div class="infobar" aria-live="polite">
        {info ? (
          <>
            <b>{info.name}</b>
            <span>{t('meaning.prefix', { text: info.meaning })}</span>
          </>
        ) : (
          <span>{t('catalog.infoDefault')}</span>
        )}
      </div>
    </>
  );
}

// ---------- орнаменты и текст ----------

function OrnamentTab() {
  return (
    <Section title={t('ornaments.title')}>
      <div class="grid thumbs ornaments">
        {ORNAMENT_IDS.map((id) => (
          <button key={id} type="button" class="thumb" title={`${ornamentName(id)}: ${ornamentMeaning(id)}`} onClick={() => addOrnament(id)}>
            <OrnamentThumb id={id} />
            <span>{ornamentName(id)}</span>
          </button>
        ))}
      </div>
      <p class="hint">{t('ornaments.hint')}</p>
    </Section>
  );
}

function TextTab() {
  const [text, setText] = useState('');
  const add = () => {
    addText(text.trim() || undefined);
    setText('');
  };
  return (
    <Section title={t('text.title')}>
      <div class="field">
        <label class="field-label" for="new-text">{t('text.label')}</label>
        <input id="new-text" type="text" maxLength={60} placeholder={t('text.placeholder')} value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      <button type="button" class="btn primary" onClick={add}>{t('text.add')}</button>
      <p class="hint">{t('text.hint')}</p>
    </Section>
  );
}

