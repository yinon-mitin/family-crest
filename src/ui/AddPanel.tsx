import { useState } from 'preact/hooks';
import type { Layer, ShieldLayer } from '../model/types.ts';
import { CATALOG, CATEGORIES, type CatalogEntry, type Category } from '../data/catalog.ts';
import { DIVISION_LIST, PATTERN_LIST, SHAPE_LIST } from '../data/names.ts';
import { ORNAMENTS, ORNAMENT_IDS } from '../render/ornaments.ts';
import { addOrnament, addShield, addSymbol, addText, replaceSymbol, setState, updateLayer, useStore, type TabId } from '../model/store.ts';
import { ColorField, DivisionThumb, OrnamentThumb, Prompts, Section, ShapeThumb, SymbolThumb } from './common.tsx';

const TABS: { id: TabId; label: string }[] = [
  { id: 'shield', label: 'Щит' },
  { id: 'work', label: 'Рабочие сферы' },
  { id: 'animal', label: 'Животные' },
  { id: 'nature', label: 'Природа' },
  { id: 'symbol', label: 'Символы' },
  { id: 'ornament', label: 'Орнаменты' },
  { id: 'text', label: 'Текст' },
];

export function AddPanel() {
  const tab = useStore((s) => s.tab);
  return (
    <div class="panel add-panel">
      <div class="tabs" role="tablist" aria-label="Что добавить">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} class={tab === t.id ? 'on' : ''} onClick={() => setState({ tab: t.id })}>
            {t.label}
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
      <Section title="Щит">
        <p class="hint">Щита пока нет. Можно начать с него или собирать герб из любых элементов без щита.</p>
        <button type="button" class="btn primary" onClick={addShield}>Добавить щит</button>
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
          Изменяется щит {shields.indexOf(target) + 1} из {shields.length}. Выберите другой на холсте или в «Слоях».
        </p>
      )}
      <Section title="Форма">
        <div class="grid thumbs">
          {SHAPE_LIST.map((s) => (
            <button key={s.id} type="button" class={`thumb${target.shape === s.id ? ' on' : ''}`} aria-pressed={target.shape === s.id} title={s.name} onClick={() => set({ shape: s.id })}>
              <ShapeThumb shape={s.id} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Деление на поля">
        <div class="grid thumbs">
          {DIVISION_LIST.map((d) => (
            <button key={d.id} type="button" class={`thumb${target.division === d.id ? ' on' : ''}`} aria-pressed={target.division === d.id} title={d.name} onClick={() => set({ division: d.id })}>
              <DivisionThumb division={d.id} />
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Цвета и узоры полей">
        {target.fields.map((f, i) => (
          <div class="card" key={i}>
            {target.fields.length > 1 && <div class="card-title">Поле {i + 1}</div>}
            <ColorField label="Цвет поля" value={f.color} meaning onChange={(v) => v && setField(i, { color: v }, `f${i}c`)} />
            <div class="field">
              <label class="field-label" for={`pat${i}`}>Узор</label>
              <select id={`pat${i}`} value={f.pattern ?? ''} onChange={(e) => setField(i, { pattern: ((e.target as HTMLSelectElement).value || null) as typeof f.pattern }, '')}>
                <option value="">Без узора</option>
                {PATTERN_LIST.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {f.pattern && <ColorField label="Цвет узора" value={f.patternColor} onChange={(v) => v && setField(i, { patternColor: v }, `f${i}p`)} />}
          </div>
        ))}
        <ColorField label="Цвет обводки и линий" value={target.outline} onChange={(v) => v && set({ outline: v }, 'outline')} />
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
  const items = q
    ? CATALOG.filter((e) => e.name.toLowerCase().includes(q) || e.meaning.toLowerCase().includes(q))
    : CATALOG.filter((e) => e.cat === cat);
  const title = q ? `Найдено: ${items.length}` : CATEGORIES.find((c) => c.id === cat)!.title;

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
        <input type="search" placeholder="Поиск по названию и значению" aria-label="Поиск символов" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {canReplace && (
        <div class="segmented" role="group" aria-label="Что делает нажатие на символ">
          <button type="button" class={!replaceMode ? 'on' : ''} aria-pressed={!replaceMode} onClick={() => setState({ replace: false })}>Добавить новый</button>
          <button type="button" class={replaceMode ? 'on' : ''} aria-pressed={replaceMode} onClick={() => setState({ replace: true })}>Заменить выбранный</button>
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
        {items.length === 0 && <p class="hint">Ничего не найдено. Попробуйте другое слово.</p>}
      </Section>
      <div class="infobar" aria-live="polite">
        {info ? (
          <>
            <b>{info.name}</b>
            <span>Может означать: {info.meaning}.</span>
          </>
        ) : (
          <span>Нажмите на символ, чтобы добавить его на герб. Значение появится здесь, а потом в свойствах.</span>
        )}
      </div>
    </>
  );
}

// ---------- орнаменты и текст ----------

function OrnamentTab() {
  return (
    <Section title="Орнаменты и украшения">
      <div class="grid thumbs ornaments">
        {ORNAMENT_IDS.map((id) => (
          <button key={id} type="button" class="thumb" title={`${ORNAMENTS[id].name}: ${ORNAMENTS[id].meaning}`} onClick={() => addOrnament(id)}>
            <OrnamentThumb id={id} />
            <span>{ORNAMENTS[id].name}</span>
          </button>
        ))}
      </div>
      <p class="hint">Венки, лучи, кольца и рамка добавляются под щит, остальное поверх.</p>
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
    <Section title="Девиз или название">
      <div class="field">
        <label class="field-label" for="new-text">Текст</label>
        <input id="new-text" type="text" maxLength={60} placeholder="Например: Вместе мы сильнее" value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      <button type="button" class="btn primary" onClick={add}>Добавить надпись</button>
      <p class="hint">Форму надписи (на ленте, по дуге, прямо), шрифт и цвет можно изменить после добавления.</p>
    </Section>
  );
}

