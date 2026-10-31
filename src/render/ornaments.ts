import type { OrnamentId } from '../model/types.ts';
import { circle, leaf, n, poly, seeded, star, strokePoly } from './geometry.ts';

export interface OrnamentDef {
  name: string;
  meaning: string;
  /** Положение и масштаб по умолчанию при добавлении на холст. */
  x: number;
  y: number;
  scale: number;
  /** Размер в локальных координатах (для рамки выделения), центр в начале координат. */
  w: number;
  h: number;
  color: string;
  color2: string;
  /** Рисуется под щитом (венки, лучи, кольца, рамка) или над ним. */
  behind: boolean;
  draw(color: string, color2: string): string;
}

const p = (d: string, fill: string, extra = ''): string => `<path d="${d}" fill="${fill}"${extra}/>`;

// ---------- ветви и венки ----------

type Wreath = 'laurel' | 'olive' | 'wheat';

function wreath(kind: Wreath, color: string, color2: string): string {
  const rx = 370;
  const ry = 440;
  const N = kind === 'wheat' ? 18 : 15;
  const sweep = kind === 'wheat' ? 150 : 165;
  let out = '';
  for (const s of [1, -1]) {
    const pts: [number, number][] = [];
    const heads: number[] = [];
    for (let i = 0; i <= N; i++) {
      const a = ((100 - (i / N) * sweep) * Math.PI) / 180;
      pts.push([s * rx * Math.cos(a), ry * Math.sin(a)]);
      heads.push(Math.atan2(-ry * Math.cos(a), s * rx * Math.sin(a)));
    }
    out += p(strokePoly(pts, pts.map((_, i) => 9 - (i / N) * 5)), color2);
    let leaves = '';
    let extras = '';
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      const [x, y] = pts[i];
      const h = heads[i];
      if (kind === 'laurel') {
        const len = 86 - 28 * t;
        leaves += leaf(x, y, h + 0.8, len, 26 - 6 * t) + leaf(x, y, h - 0.8, len, 26 - 6 * t);
      } else if (kind === 'olive') {
        const len = 70 - 18 * t;
        leaves += leaf(x, y, h + 0.7, len, 14) + leaf(x, y, h - 0.7, len, 14);
        if (i % 3 === 0) extras += circle(x + 16 * Math.cos(h + 1.9), y + 16 * Math.sin(h + 1.9), 11);
      } else if (t < 0.45) {
        leaves += leaf(x, y, h + 0.55, 90 - 30 * t, 14) + leaf(x, y, h - 0.55, 90 - 30 * t, 14);
      } else {
        const len = 52 - 14 * (t - 0.45);
        leaves += leaf(x, y, h + 0.5, len, 15) + leaf(x, y, h - 0.5, len, 15);
        if (i === N) leaves += leaf(x, y, h, len + 8, 14);
      }
    }
    out += p(leaves, color) + (extras ? p(extras, color2) : '');
  }
  return out;
}

// ---------- лента ----------

/** Лента с «ласточкиным хвостом». `half` — полуширина средней части, `sag` — прогиб. */
export function ribbonShape(half: number, thick: number, sag: number, color: string, color2: string): string {
  const top = (x: number) => -thick / 2 + sag * (1 - (x / half) ** 2);
  const tail = (side: number) => {
    const x0 = side * (half - 18);
    const x1 = side * (half + 96);
    const nx = side * (half + 62);
    const y0 = top(half) + thick * 0.32;
    return poly([[x0, y0], [x1, y0], [nx, y0 + thick / 2], [x1, y0 + thick], [x0, y0 + thick]]);
  };
  const fold = (side: number) => {
    const x = side * half;
    const y = top(half);
    return poly([[x, y + thick], [x - side * 18, y + thick * 1.32], [x - side * 18, y + thick]]);
  };
  const main = `M${n(-half)},${n(top(half))}Q0,${n(top(0) * 2 - top(half))} ${n(half)},${n(top(half))}V${n(top(half) + thick)}Q0,${n(top(0) * 2 - top(half) + thick)} ${n(-half)},${n(top(half) + thick)}z`;
  return p(tail(-1) + tail(1), color2) + p(fold(-1) + fold(1), color2, ' opacity=".55"') + p(main, color);
}

// ---------- остальное ----------

function crown(color: string, color2: string): string {
  const body = poly([[-170, 60], [-190, -60], [-100, -5], [-55, -95], [0, -10], [55, -95], [100, -5], [190, -60], [170, 60]]);
  const band = poly([[-174, 60], [174, 60], [180, 108], [-180, 108]]);
  const pearls = [[-190, -72], [-55, -108], [55, -108], [190, -72], [0, -26]].map(([x, y]) => circle(x, y, 15)).join('');
  const gems = [-100, 0, 100].map((x) => circle(x, 84, 13)).join('');
  return p(body + band, color) + p(pearls + gems, color2);
}

function rays(color: string): string {
  let d = '';
  const count = 28;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r1 = i % 2 === 0 ? 560 : 470;
    const half = 0.055;
    d += poly([
      [230 * Math.cos(a - half), 230 * Math.sin(a - half)],
      [r1 * Math.cos(a), r1 * Math.sin(a)],
      [230 * Math.cos(a + half), 230 * Math.sin(a + half)],
    ]);
  }
  return p(d, color);
}

function ringDots(color: string, color2: string): string {
  let dots = '';
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    dots += circle(485 * Math.cos(a), 485 * Math.sin(a), i % 2 === 0 ? 10 : 5);
  }
  const ring = circle(0, 0, 458) + circle(0, 0, 452);
  return p(dots, color) + p(ring, color2, ' fill-rule="evenodd"');
}

function ringDouble(color: string, color2: string): string {
  const outer = circle(0, 0, 494) + circle(0, 0, 482);
  const inner = circle(0, 0, 464) + circle(0, 0, 459);
  return p(outer, color, ' fill-rule="evenodd"') + p(inner, color2, ' fill-rule="evenodd"');
}

function frame(color: string, color2: string): string {
  const ring = (hw: number, hh: number, t: number) =>
    `M${-hw},${-hh}h${2 * hw}v${2 * hh}h${-2 * hw}z` + `M${-hw + t},${-hh + t}v${2 * hh - 2 * t}h${2 * hw - 2 * t}v${-(2 * hh - 2 * t)}z`;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => circle(sx * 470, sy * 570, 24)).join('');
  return p(ring(470, 570, 14), color, ' fill-rule="evenodd"') + p(ring(436, 536, 5), color2, ' fill-rule="evenodd"') + p(corners, color2);
}

function scroll(side: number): [number, number][] {
  const pts: [number, number][] = [];
  const cx = side * 300;
  const cy = 0;
  const a0 = side > 0 ? Math.PI * 0.6 : Math.PI * 0.4;
  const dir = side > 0 ? -1 : 1;
  const sx = cx + 80 * Math.cos(a0);
  const sy = cy + 80 * Math.sin(a0);
  // хвост — плавная кривая от центра к началу спирали
  const ex = side * 70;
  const ey = 70;
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const qx = (1 - t) * (1 - t) * ex + 2 * (1 - t) * t * (side * 190) + t * t * sx;
    const qy = (1 - t) * (1 - t) * ey + 2 * (1 - t) * t * 130 + t * t * sy;
    pts.push([qx, qy]);
  }
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const ang = a0 + dir * t * Math.PI * 3.3;
    const r = 80 * (1 - 0.86 * t);
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return pts;
}

function flourish(color: string, color2: string): string {
  let out = '';
  for (const side of [1, -1]) {
    const pts = scroll(side);
    const widths = pts.map((_, i) => 6 + 16 * Math.sin((i / (pts.length - 1)) * Math.PI) * (1 - (i / pts.length) * 0.55));
    out += p(strokePoly(pts, widths), color);
    const last = pts[pts.length - 1];
    out += p(circle(last[0], last[1], 11), color2);
  }
  return out;
}

function stars(color: string): string {
  let d = '';
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) * 17 * Math.PI) / 180;
    d += star(430 * Math.sin(a), 430 - 430 * Math.cos(a), i === 3 ? 34 : 26, i === 3 ? 14 : 11);
  }
  return p(d, color);
}

function tree(color: string, color2: string): string {
  const rnd = seeded(11);
  let wood = '';
  let crowns = '';
  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, up: boolean): void => {
    const bend = (rnd() - 0.5) * 0.35;
    const mx = x + Math.cos(ang + bend) * len * 0.5;
    const my = y + Math.sin(ang + bend) * len * 0.5;
    const x2 = x + Math.cos(ang) * len + Math.cos(ang + Math.PI / 2) * len * bend * 0.35;
    const y2 = y + Math.sin(ang) * len + Math.sin(ang + Math.PI / 2) * len * bend * 0.35;
    wood += strokePoly([[x, y], [mx, my], [x2, y2]], [w, w * 0.85, w * 0.7]);
    if (depth === 0) {
      if (up) {
        crowns += circle(x2, y2, 24 + rnd() * 10);
        crowns += circle(x2 + 18, y2 + 14, 15 + rnd() * 6);
        crowns += circle(x2 - 18, y2 + 12, 15 + rnd() * 6);
      }
      return;
    }
    const spread = up ? 0.5 : 0.55;
    const kids = depth === 5 && up ? [-0.7, 0.05, 0.7] : [-spread, spread];
    for (const k of kids) grow(x2, y2, ang + k + (rnd() - 0.5) * 0.18, len * 0.76, w * 0.68, depth - 1, up);
  };
  grow(0, 170, -Math.PI / 2, 168, 38, 5, true);
  grow(-8, 168, Math.PI / 2 + 0.55, 90, 17, 3, false);
  grow(8, 168, Math.PI / 2 - 0.55, 90, 17, 3, false);
  grow(0, 168, Math.PI / 2, 80, 14, 3, false);
  return `<g transform="translate(0 -30)">` + p(wood, color) + p(crowns, color2) + `</g>`;
}

export const ORNAMENTS: Record<OrnamentId, OrnamentDef> = {
  laurel: {
    name: 'Лавровый венок', meaning: 'достижения, признание, уважение к труду',
    x: 500, y: 600, scale: 1, w: 880, h: 1040, color: '#2f7a4a', color2: '#7a5c2e',
    behind: true,
    draw: (c, c2) => wreath('laurel', c, c2),
  },
  olive: {
    name: 'Оливковая ветвь', meaning: 'мир, согласие, мудрость',
    x: 500, y: 600, scale: 1, w: 880, h: 1040, color: '#6b8f3a', color2: '#7a5c2e',
    behind: true,
    draw: (c, c2) => wreath('olive', c, c2),
  },
  wheat: {
    name: 'Колосья', meaning: 'достаток, плоды труда, благодарность земле',
    x: 500, y: 600, scale: 1, w: 880, h: 1040, color: '#e0b44c', color2: '#8a6a2a',
    behind: true,
    draw: (c, c2) => wreath('wheat', c, c2),
  },
  crown: {
    name: 'Корона', meaning: 'достоинство, ответственность, ценность каждого члена семьи',
    x: 500, y: 126, scale: 1, w: 400, h: 230, color: '#e0b44c', color2: '#b3282d',
    behind: false,
    draw: (c, c2) => crown(c, c2),
  },
  ribbon: {
    name: 'Лента', meaning: 'связь, торжество, место для девиза',
    x: 500, y: 1100, scale: 1, w: 760, h: 170, color: '#b3282d', color2: '#7d1a1f',
    behind: false,
    draw: (c, c2) => ribbonShape(300, 90, 36, c, c2),
  },
  rays: {
    name: 'Лучи', meaning: 'энергия, щедрость, свет, который делится с другими',
    x: 500, y: 600, scale: 1, w: 1120, h: 1120, color: '#e0b44c', color2: '#e0b44c',
    behind: true,
    draw: (c) => rays(c),
  },
  ringDots: {
    name: 'Кольцо из бусин', meaning: 'единство, круг близких, непрерывность',
    x: 500, y: 600, scale: 1, w: 1000, h: 1000, color: '#e0b44c', color2: '#b3282d',
    behind: true,
    draw: (c, c2) => ringDots(c, c2),
  },
  ringDouble: {
    name: 'Двойное кольцо', meaning: 'целостность, граница, защищённое пространство',
    x: 500, y: 600, scale: 1, w: 980, h: 980, color: '#e0b44c', color2: '#b3282d',
    behind: true,
    draw: (c, c2) => ringDouble(c, c2),
  },
  frame: {
    name: 'Рамка', meaning: 'граница, рамка, в которой живёт семья',
    x: 500, y: 600, scale: 1, w: 960, h: 1160, color: '#e0b44c', color2: '#b3282d',
    behind: true,
    draw: (c, c2) => frame(c, c2),
  },
  flourish: {
    name: 'Завитки', meaning: 'красота, мягкость, украшение, которое мы выбираем сами',
    x: 500, y: 960, scale: 1, w: 800, h: 260, color: '#e0b44c', color2: '#b3282d',
    behind: false,
    draw: (c, c2) => flourish(c, c2),
  },
  stars: {
    name: 'Звёзды', meaning: 'мечты, ориентиры, память о тех, кто светит нам',
    x: 500, y: 90, scale: 1, w: 900, h: 140, color: '#e0b44c', color2: '#e0b44c',
    behind: false,
    draw: (c) => stars(c),
  },
  tree: {
    name: 'Древо жизни', meaning: 'корни и ветви рода, связь поколений, рост',
    x: 500, y: 600, scale: 1, w: 760, h: 900, color: '#6b4a2b', color2: '#2f7a4a',
    behind: true,
    draw: (c, c2) => tree(c, c2),
  },
};

export const ORNAMENT_IDS = Object.keys(ORNAMENTS) as OrnamentId[];
