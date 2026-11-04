// Геометрия контуров: разбор path в ломаные и проверки «точка внутри» и «расстояние до края».
export type Pt = [number, number];
export type Poly = Pt[];

const STEPS = 12;

/** Разбирает атрибут d (M L H V C S Q T A Z, абсолютные и относительные) в замкнутые ломаные. */
export function flatten(d: string): Poly[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: Poly[] = [];
  let cur: Poly = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cx2 = 0;
  let cy2 = 0; // последняя управляющая точка для S/T
  let prev = '';
  const num = (): number => Number(tokens[i++]);
  const push = (px: number, py: number): void => {
    cur.push([px, py]);
    x = px;
    y = py;
  };
  const end = (): void => {
    if (cur.length > 1) out.push(cur);
    cur = [];
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (C) {
      case 'M': {
        end();
        const nx = num() + ox;
        const ny = num() + oy;
        push(nx, ny);
        sx = nx;
        sy = ny;
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L':
        push(num() + ox, num() + oy);
        break;
      case 'H':
        push(num() + (rel ? x : 0), y);
        break;
      case 'V':
        push(x, num() + (rel ? y : 0));
        break;
      case 'C':
      case 'S': {
        const x0 = x;
        const y0 = y;
        let x1: number;
        let y1: number;
        if (C === 'C') {
          x1 = num() + ox;
          y1 = num() + oy;
        } else {
          const smooth = 'CScs'.includes(prev);
          x1 = smooth ? 2 * x0 - cx2 : x0;
          y1 = smooth ? 2 * y0 - cy2 : y0;
        }
        const x2 = num() + ox;
        const y2 = num() + oy;
        const x3 = num() + ox;
        const y3 = num() + oy;
        for (let s = 1; s <= STEPS; s++) {
          const t = s / STEPS;
          const u = 1 - t;
          push(
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          );
        }
        cx2 = x2;
        cy2 = y2;
        break;
      }
      case 'Q':
      case 'T': {
        const x0 = x;
        const y0 = y;
        let x1: number;
        let y1: number;
        if (C === 'Q') {
          x1 = num() + ox;
          y1 = num() + oy;
        } else {
          const smooth = 'QTqt'.includes(prev);
          x1 = smooth ? 2 * x0 - cx2 : x0;
          y1 = smooth ? 2 * y0 - cy2 : y0;
        }
        const x2 = num() + ox;
        const y2 = num() + oy;
        for (let s = 1; s <= STEPS; s++) {
          const t = s / STEPS;
          const u = 1 - t;
          push(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2);
        }
        cx2 = x1;
        cy2 = y1;
        break;
      }
      case 'A': {
        const rx0 = Math.abs(num());
        const ry0 = Math.abs(num());
        const phi = (num() * Math.PI) / 180;
        const fa = num();
        const fs = num();
        const ex = num() + ox;
        const ey = num() + oy;
        arc(push, x, y, rx0, ry0, phi, fa, fs, ex, ey);
        break;
      }
      case 'Z':
        if (cur.length) cur.push([sx, sy]);
        x = sx;
        y = sy;
        end();
        break;
      default:
        throw new Error(`команда пути ${cmd} не поддерживается`);
    }
    prev = cmd;
  }
  end();
  return out;
}

function arc(push: (x: number, y: number) => void, x1: number, y1: number, rx0: number, ry0: number, phi: number, fa: number, fs: number, x2: number, y2: number): void {
  if (!rx0 || !ry0) return push(x2, y2);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = c * dx + s * dy;
  const y1p = -s * dx + c * dy;
  let rx = rx0;
  let ry = ry0;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (k * rx * y1p) / ry;
  const cyp = (-k * ry * x1p) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2;
  const cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number): number => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  if (fs && dth < 0) dth += 2 * Math.PI;
  const n = Math.max(STEPS, Math.ceil((Math.abs(dth) / (Math.PI / 2)) * STEPS));
  for (let i = 1; i <= n; i++) {
    const t = th1 + (dth * i) / n;
    push(cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c);
  }
}

/** Чётно-нечётное правило, как у fill-rule="evenodd" и нулевого правила для непересекающихся контуров. */
export function inside(polys: Poly[], x: number, y: number): boolean {
  let c = false;
  for (const p of polys)
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i];
      const [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
  return c;
}

export function distToEdge(polys: Poly[], x: number, y: number): number {
  let best = Infinity;
  for (const p of polys)
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1];
      const [bx, by] = p[i];
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  return best;
}
