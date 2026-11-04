import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Layer } from '../model/types.ts';
import { CANVAS_H, CANVAS_W } from '../model/types.ts';
import { attachSymbol, detachSymbol, findLayer, layerBox, nearestSlot, resolveSymbol } from '../model/doc.ts';
import { commit, getState, select, setState, updateLayer, useStore } from '../model/store.ts';
import { t } from '../i18n/index.ts';
import { renderBody } from '../render/renderCrest.ts';

type Gesture =
  | { kind: 'drag'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean; key: string }
  | { kind: 'scale'; id: string; cx: number; cy: number; d0: number; s0: number; key: string }
  | { kind: 'rotate'; id: string; cx: number; cy: number; a0: number; r0: number; key: string }
  | { kind: 'pinch'; id: string; d0: number; a0: number; s0: number; r0: number; key: string };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
let gestureCounter = 0;

export function Canvas() {
  const doc = useStore((s) => s.doc);
  const selectedId = useStore((s) => s.selected);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const [unit, setUnit] = useState(1.6);
  const [guide, setGuide] = useState(false);

  const html = useMemo(() => renderBody(doc, { editor: true, prefix: 'ed' }), [doc]);
  const selected = findLayer(doc, selectedId);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => setUnit(CANVAS_W / Math.max(svg.clientWidth, 200));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  const toCanvas = (e: PointerEvent) => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  const startPinch = () => {
    const id = getState().selected;
    const l = findLayer(getState().doc, id);
    const [a, b] = [...pointers.current.values()];
    if (!l || l.locked || !a || !b) return;
    gesture.current = {
      kind: 'pinch',
      id: l.id,
      d0: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      a0: Math.atan2(b.y - a.y, b.x - a.x),
      s0: l.scale,
      r0: l.rotation,
      key: `pinch${++gestureCounter}`,
    };
  };

  const onDown = (e: PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) {
      startPinch();
      return;
    }
    const target = e.target as Element;
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle');
    const st = getState();
    const key = `g${++gestureCounter}`;
    if (handle && selected) {
      const b = layerBox(selected, st.doc);
      if (handle === 'scale') {
        gesture.current = { kind: 'scale', id: selected.id, cx: b.cx, cy: b.cy, d0: Math.hypot(p.x - b.cx, p.y - b.cy) || 1, s0: selected.scale, key };
      } else {
        gesture.current = { kind: 'rotate', id: selected.id, cx: b.cx, cy: b.cy, a0: Math.atan2(p.y - b.cy, p.x - b.cx), r0: selected.rotation, key };
      }
      return;
    }
    const id = target.closest('[data-id]')?.getAttribute('data-id');
    if (!id) {
      select(null);
      gesture.current = null;
      return;
    }
    select(id);
    if (typeof matchMedia === 'function' && matchMedia('(max-width: 900px)').matches) setState({ pane: 'props' });
    const l = findLayer(st.doc, id);
    if (l && !l.locked) {
      const r = l.kind === 'symbol' ? resolveSymbol(l, st.doc) : l;
      gesture.current = { kind: 'drag', id, sx: p.x, sy: p.y, ox: r.x, oy: r.y, moved: false, key };
    } else gesture.current = null;
  };

  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toCanvas(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      updateLayer(g.id, { scale: clamp(g.s0 * (d / g.d0), 0.05, 20), rotation: g.r0 + ((ang - g.a0) * 180) / Math.PI }, g.key);
    } else if (g.kind === 'scale') {
      updateLayer(g.id, { scale: clamp(g.s0 * (Math.hypot(p.x - g.cx, p.y - g.cy) / g.d0), 0.05, 20) }, g.key);
    } else if (g.kind === 'rotate') {
      let r = g.r0 + ((Math.atan2(p.y - g.cy, p.x - g.cx) - g.a0) * 180) / Math.PI;
      const near = Math.round(r / 15) * 15;
      if (Math.abs(r - near) < 4) r = near;
      updateLayer(g.id, { rotation: Math.round(r * 10) / 10 }, g.key);
    } else {
      const dx = p.x - g.sx;
      const dy = p.y - g.sy;
      if (!g.moved) {
        if (Math.hypot(dx, dy) < 4 * unit) return;
        g.moved = true;
        const l = findLayer(getState().doc, g.id);
        if (l?.kind === 'symbol' && l.slot) {
          const doc0 = getState().doc;
          const free = detachSymbol(l, doc0);
          commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === g.id ? free : x)) }), g.key);
          g.ox = free.x;
          g.oy = free.y;
        }
      }
      let nx = g.ox + dx;
      const ny = g.oy + dy;
      const snapped = Math.abs(nx - CANVAS_W / 2) < 9 * unit;
      if (snapped) nx = CANVAS_W / 2;
      setGuide(snapped);
      updateLayer(g.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 }, g.key);
    }
  };

  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    setGuide(false);
    if (g?.kind === 'drag' && g.moved) {
      const doc0 = getState().doc;
      const l = findLayer(doc0, g.id);
      if (l?.kind === 'symbol' && doc0.snap && !l.slot) {
        const near = nearestSlot(doc0, l.x, l.y);
        if (near && near.dist < 150) commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === g.id ? attachSymbol(l, near.shield, near.field) : x)) }), g.key);
      }
    }
    if (g?.kind === 'pinch' || pointers.current.size === 0) gesture.current = null;
  };

  const box = selected && !selected.hidden ? layerBox(selected, doc) : null;
  const u = unit;

  return (
    <svg
      ref={svgRef}
      class="canvas"
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      role="application"
      aria-label={t('canvas.label')}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <rect width={CANVAS_W} height={CANVAS_H} fill="var(--paper)" />
      <g dangerouslySetInnerHTML={{ __html: html }} />
      {guide && <line class="guide" x1={CANVAS_W / 2} x2={CANVAS_W / 2} y1="0" y2={CANVAS_H} stroke-width={2 * u} stroke-dasharray={`${8 * u} ${8 * u}`} />}
      {box && <Overlay layer={selected!} box={box} u={u} />}
    </svg>
  );
}

function Overlay({ layer, box, u }: { layer: Layer; box: ReturnType<typeof layerBox>; u: number }) {
  const w = box.w + 16 * u;
  const h = box.h + 16 * u;
  const stem = 46 * u;
  return (
    <g class="overlay" transform={`translate(${box.cx} ${box.cy}) rotate(${box.rot})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke-width={2 * u} stroke-dasharray={`${7 * u} ${5 * u}`} />
      {layer.locked ? (
        <text x={w / 2 - 4 * u} y={-h / 2 + 22 * u} font-size={20 * u} text-anchor="end">🔒</text>
      ) : (
        <>
          <line x1="0" y1={-h / 2} x2="0" y2={-h / 2 - stem} stroke-width={2 * u} />
          <circle class="handle" data-handle="rotate" cx="0" cy={-h / 2 - stem} r={13 * u} stroke-width={2 * u} />
          <circle class="hit" data-handle="rotate" cx="0" cy={-h / 2 - stem} r={26 * u} />
          <rect class="handle" data-handle="scale" x={w / 2 - 12 * u} y={h / 2 - 12 * u} width={24 * u} height={24 * u} rx={5 * u} stroke-width={2 * u} />
          <circle class="hit" data-handle="scale" cx={w / 2} cy={h / 2} r={26 * u} />
        </>
      )}
    </g>
  );
}
