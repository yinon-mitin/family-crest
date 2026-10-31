import { useStore } from '../model/store.ts';
import { Editor } from './Editor.tsx';
import { Start } from './Start.tsx';

export function App() {
  const screen = useStore((s) => s.screen);
  const toast = useStore((s) => s.toast);
  return (
    <>
      {screen === 'start' ? <Start /> : <Editor />}
      {screen === 'start' && toast && <div class="toast" role="status">{toast}</div>}
    </>
  );
}
