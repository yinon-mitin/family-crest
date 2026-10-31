import { useEffect } from 'preact/hooks';
import { deleteLayer, duplicateLayer, getState, redo, select, setState, undo, updateLayer, useStore, type Pane } from '../model/store.ts';
import { findLayer } from '../model/doc.ts';
import { About } from './About.tsx';
import { AddPanel } from './AddPanel.tsx';
import { Canvas } from './Canvas.tsx';
import { ExportDialog } from './ExportDialog.tsx';
import { Header, StageBar } from './Header.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { PropsPanel } from './PropsPanel.tsx';

const PANES: { id: Pane; label: string }[] = [
  { id: 'add', label: 'Добавить' },
  { id: 'props', label: 'Свойства' },
  { id: 'layers', label: 'Слои' },
];

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || getState().dialog) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      const st = getState();
      const l = findLayer(st.doc, st.selected);
      if (e.key === 'Escape') select(null);
      if (!l) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteLayer(l.id);
      } else if (mod && key === 'd') {
        e.preventDefault();
        duplicateLayer(l.id);
      } else if (e.key.startsWith('Arrow') && !l.locked && !(l.kind === 'symbol' && l.slot)) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 4;
        updateLayer(l.id, { x: l.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), y: l.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) }, 'nudge');
      } else if ((e.key === '+' || e.key === '=' || e.key === '-') && !l.locked) {
        updateLayer(l.id, { scale: Math.max(0.05, l.scale * (e.key === '-' ? 0.95 : 1.05)) }, 'keyscale');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function Editor() {
  const pane = useStore((s) => s.pane);
  const dialog = useStore((s) => s.dialog);
  const toast = useStore((s) => s.toast);
  useShortcuts();
  return (
    <div class="editor" data-pane={pane}>
      <Header />
      <main class="workspace">
        <aside class="left">
          <AddPanel />
        </aside>
        <section class="stage" aria-label="Герб">
          <StageBar />
          <div class="canvas-wrap">
            <Canvas />
          </div>
        </section>
        <aside class="right">
          <PropsPanel />
          <LayersPanel />
        </aside>
      </main>
      <nav class="pane-tabs" aria-label="Панели">
        {PANES.map((p) => (
          <button key={p.id} type="button" class={pane === p.id ? 'on' : ''} aria-pressed={pane === p.id} onClick={() => setState({ pane: p.id })}>
            {p.label}
          </button>
        ))}
      </nav>
      {dialog === 'about' && <About onClose={() => setState({ dialog: null })} />}
      {dialog === 'export' && <ExportDialog />}
      {toast && <div class="toast" role="status">{toast}</div>}
    </div>
  );
}
