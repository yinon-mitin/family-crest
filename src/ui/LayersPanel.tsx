import { moveLayer, select, updateLayer, useStore } from '../model/store.ts';
import { KIND_LABEL, layerTitle } from './names.ts';

export function LayersPanel() {
  const doc = useStore((s) => s.doc);
  const selected = useStore((s) => s.selected);
  const list = [...doc.layers].reverse();
  return (
    <div class="panel layers-panel">
      <h3 class="panel-title">Слои</h3>
      {list.length === 0 && <p class="hint">Здесь появятся все элементы герба. Верхние в списке лежат поверх нижних.</p>}
      <ul class="layers">
        {list.map((l) => (
          <li key={l.id} class={`${l.id === selected ? 'on' : ''}${l.hidden ? ' off' : ''}`}>
            <button type="button" class="layer-main" onClick={() => select(l.id)} aria-pressed={l.id === selected}>
              <span class="kind">{KIND_LABEL[l.kind]}</span>
              <span class="name">{layerTitle(l)}</span>
            </button>
            <button type="button" class="mini" title={l.hidden ? 'Показать' : 'Скрыть'} aria-label={l.hidden ? 'Показать' : 'Скрыть'} onClick={() => updateLayer(l.id, { hidden: !l.hidden })}>{l.hidden ? '○' : '●'}</button>
            <button type="button" class="mini" title={l.locked ? 'Разблокировать' : 'Заблокировать'} aria-label={l.locked ? 'Разблокировать' : 'Заблокировать'} onClick={() => updateLayer(l.id, { locked: !l.locked })}>{l.locked ? '🔒' : '🔓'}</button>
            <button type="button" class="mini" title="Выше" aria-label="Выше" onClick={() => moveLayer(l.id, 1)}>↑</button>
            <button type="button" class="mini" title="Ниже" aria-label="Ниже" onClick={() => moveLayer(l.id, -1)}>↓</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
