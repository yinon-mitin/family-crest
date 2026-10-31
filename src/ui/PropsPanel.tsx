import type { Layer, SymbolLayer, TextLayer } from '../model/types.ts';
import { attachSymbol, detachSymbol, findLayer, nearestSlot, resolveSymbol } from '../model/doc.ts';
import { commit, deleteLayer, duplicateLayer, getState, moveLayer, setDoc, setState, updateLayer, useStore, type TabId } from '../model/store.ts';
import { FONT_LIST, TEXT_FORMS } from '../data/names.ts';
import { textBox } from '../render/text.ts';
import { ColorField, Section, Slider } from './common.tsx';
import { KIND_LABEL, layerMeaning, layerTitle } from './names.ts';

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
      <Section title="Герб в целом">
        <p class="hint">Нажмите на элемент на холсте или в списке слоёв, чтобы изменить его цвет, размер и поворот. Двумя пальцами можно менять размер и поворот.</p>
        <ColorField label="Фон холста" value={doc.background} none onChange={(v) => setDoc({ background: v }, 'bg')} />
        {hasShield && (
          <label class="check">
            <input type="checkbox" checked={doc.snap} onChange={(e) => setDoc({ snap: (e.target as HTMLInputElement).checked })} />
            <span>Привязывать символы к полям щита</span>
          </label>
        )}
        {hasShield && <p class="hint">Пока привязка включена, новые символы встают в свободные поля щита, а при перетаскивании «прилипают» к ближайшему полю. Любой символ можно открепить и поставить где угодно.</p>}
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
        <div class="kind">{KIND_LABEL[l.kind]}</div>
        <h2>{layerTitle(l)}</h2>
        {meaning && <p class="meaning">Может означать: {meaning}.</p>}
      </div>

      {l.kind === 'symbol' && <SymbolProps layer={l} replace={replace} hasShield={hasShield} slotted={!!slotted} />}
      {l.kind === 'ornament' && (
        <Section title="Цвета">
          <ColorField label="Основной цвет" value={l.color} onChange={(v) => v && set({ color: v }, 'c1')} />
          <ColorField label="Дополнительный цвет" value={l.color2} onChange={(v) => v && set({ color2: v }, 'c2')} />
        </Section>
      )}
      {l.kind === 'text' && <TextProps layer={l} />}
      {l.kind === 'shield' && (
        <Section title="Щит">
          <p class="hint">Форму, деление и цвета полей меняйте на вкладке «Щит» слева.</p>
          <button type="button" class="btn" onClick={() => setState({ pane: 'add', tab: 'shield' })}>Открыть вкладку «Щит»</button>
          <div class="spacer" />
          <ColorField label="Цвет обводки" value={l.outline} onChange={(v) => v && set({ outline: v }, 'outline')} />
          <Slider label="Толщина обводки" value={l.outlineWidth} min={0} max={30} onInput={(v) => set({ outlineWidth: v }, 'ow')} />
        </Section>
      )}

      <Section title="Размер и поворот">
        <Slider label="Размер" value={l.scale * 100} min={range[0]} max={range[1]} unit="%" onInput={(v) => set({ scale: v / 100 }, 'scale')} />
        <Slider label="Поворот" value={l.rotation} min={-180} max={180} unit="°" onInput={(v) => set({ rotation: v }, 'rot')} />
        <div class="row">
          {l.kind !== 'text' && <button type="button" class="btn" onClick={() => set({ flipX: !l.flipX })}>Отразить</button>}
          <button type="button" class="btn" onClick={() => set({ rotation: 0 })}>Сбросить поворот</button>
        </div>
      </Section>

      <Section title="Почему я выбрал(а) это?">
        <textarea
          rows={3}
          maxLength={1000}
          placeholder="Что для вас значит этот элемент? Заметка попадёт в рассказ о гербе (PDF)."
          value={l.note}
          onInput={(e) => set({ note: (e.target as HTMLTextAreaElement).value }, 'note')}
        />
      </Section>

      <Section title="Действия">
        <div class="row wrap">
          <button type="button" class="btn" onClick={() => duplicateLayer(l.id)}>Копия</button>
          <button type="button" class="btn" disabled={idx >= doc.layers.length - 1} onClick={() => moveLayer(l.id, 1)}>Выше</button>
          <button type="button" class="btn" disabled={idx <= 0} onClick={() => moveLayer(l.id, -1)}>Ниже</button>
          <button type="button" class="btn" onClick={() => set({ locked: !l.locked })}>{l.locked ? 'Разблокировать' : 'Заблокировать'}</button>
          <button type="button" class="btn" onClick={() => set({ hidden: !l.hidden })}>{l.hidden ? 'Показать' : 'Скрыть'}</button>
          <button type="button" class="btn danger" onClick={() => deleteLayer(l.id)}>Удалить</button>
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
      <Section title="Цвет">
        <ColorField label="Цвет символа" value={l.color} meaning onChange={(v) => v && set({ color: v }, 'c1')} />
        <ColorField label="Обводка для контраста" value={l.halo} none onChange={(v) => set({ halo: v }, 'halo')} />
      </Section>
      <Section title="Положение">
        {hasShield && (
          <div class="row wrap">
            {slotted ? (
              <>
                <span class="hint grow">Закреплён в поле щита: размер и место подбираются сами.</span>
                <button type="button" class="btn" onClick={() => commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? detachSymbol(l, d) : x)) }))}>Открепить</button>
              </>
            ) : (
              <>
                <span class="hint grow">Стоит свободно: можно перетащить в любое место.</span>
                <button type="button" class="btn" onClick={toSlot}>Вернуть в поле</button>
              </>
            )}
          </div>
        )}
        <button type="button" class="btn" onClick={() => setState({ pane: 'add', replace: true, tab: CATALOG_TABS.includes(getState().tab) ? getState().tab : 'symbol' })}>
          {replace ? 'Выберите новый символ слева' : 'Заменить на другой символ'}
        </button>
      </Section>
    </>
  );
}

function TextProps({ layer: l }: { layer: TextLayer }) {
  const set = (patch: Partial<TextLayer>, key = '') => updateLayer(l.id, patch, key);
  const { missing } = textBox(l);
  return (
    <Section title="Надпись">
      <div class="field">
        <label class="field-label" for="txt">Текст</label>
        <input id="txt" type="text" maxLength={60} value={l.text} onInput={(e) => set({ text: (e.target as HTMLInputElement).value }, 'text')} />
      </div>
      {missing.length > 0 && <p class="warn">Этих знаков нет в шрифте, они не будут показаны: {missing.join(' ')}</p>}
      <div class="field">
        <label class="field-label" for="form">Форма</label>
        <select id="form" value={l.form} onChange={(e) => set({ form: (e.target as HTMLSelectElement).value as TextLayer['form'] })}>
          {TEXT_FORMS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      {(l.form === 'arcUp' || l.form === 'arcDown') && <Slider label="Изгиб дуги (радиус)" value={l.radius} min={120} max={1200} step={10} onInput={(v) => set({ radius: v }, 'radius')} />}
      <div class="field">
        <label class="field-label" for="font">Шрифт</label>
        <select id="font" value={l.font} onChange={(e) => set({ font: (e.target as HTMLSelectElement).value as TextLayer['font'] })}>
          {FONT_LIST.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <label class="check">
        <input type="checkbox" checked={l.bold} onChange={(e) => set({ bold: (e.target as HTMLInputElement).checked })} />
        <span>Жирный</span>
      </label>
      <ColorField label="Цвет букв" value={l.color} onChange={(v) => v && set({ color: v }, 'c1')} />
      {l.form === 'banner' && <ColorField label="Цвет ленты" value={l.bannerColor} onChange={(v) => v && set({ bannerColor: v }, 'c2')} />}
    </Section>
  );
}
