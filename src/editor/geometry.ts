import { MIN_AREA } from './constants';
import type { EdgeMap, Parcel, Pt, Verts } from './types';

/** Canonical (order independent) key for the edge between vertices a and b. */
export const K = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a);
export const hyp = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Signed polygon area (shoelace). */
export function sArea(p: Pt[]) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Polygon centroid (falls back to vertex mean for degenerate polygons). */
export function cen(p: Pt[]): Pt {
  let A = 0, x = 0, y = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], f = a.x * b.y - b.x * a.y;
    A += f;
    x += (a.x + b.x) * f;
    y += (a.y + b.y) * f;
  }
  if (Math.abs(A) < 1e-6) {
    return { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
  }
  return { x: x / (3 * A), y: y / (3 * A) };
}

function ori(a: Pt, b: Pt, c: Pt) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Proper intersection of segments ab and cd (touching endpoints do not count). */
export function segX(a: Pt, b: Pt, c: Pt, d: Pt) {
  const e = 1e-9, o1 = ori(a, b, c), o2 = ori(a, b, d), o3 = ori(c, d, a), o4 = ori(c, d, b);
  return ((o1 > e && o2 < -e) || (o1 < -e && o2 > e)) && ((o3 > e && o4 < -e) || (o3 < -e && o4 > e));
}

/** Point in polygon (even-odd). */
export function pip(p: Pt, q: Pt[]) {
  let c = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const a = q[i], b = q[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Distance from p to segment ab, with the clamped parameter t and the closest point. */
export function segD(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  let t = l ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l : 0;
  t = clamp(t, 0, 1);
  return { d: Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy), t, x: a.x + t * dx, y: a.y + t * dy };
}

/** All edges keyed by K(a, b), with the parcels that share each edge. */
export function edgesOf(ps: Parcel[]): EdgeMap {
  const m: EdgeMap = {};
  ps.forEach((p) => {
    const r = p.ring;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], k = K(a, b);
      (m[k] || (m[k] = { k, a: a < b ? a : b, b: a < b ? b : a, ps: [] })).ps.push(p.id);
    }
  });
  return m;
}

export const pts = (V: Verts, r: string[]) => r.map((id) => V[id]);

export function areasOf(V: Verts, ps: Parcel[]) {
  const o: Record<string, number> = {};
  ps.forEach((p) => (o[p.id] = Math.abs(sArea(pts(V, p.ring)))));
  return o;
}

/** Returns a user-facing error message if the geometry is invalid, otherwise null. */
export function validate(V: Verts, ps: Parcel[], sg: number): string | null {
  const E = Object.values(edgesOf(ps));
  for (let i = 0; i < E.length; i++)
    for (let j = i + 1; j < E.length; j++) {
      const e = E[i], f = E[j];
      if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue;
      if (segX(V[e.a], V[e.b], V[f.a], V[f.b])) return 'Sınırlar birbirini kesemez.';
    }
  for (const p of ps) {
    const a = sArea(pts(V, p.ring)) * sg;
    if (a <= 0) return 'Bu konum parseli geçersiz hale getiriyor.';
    if (a < MIN_AREA) return 'Parsel alanı çok küçüldü.';
  }
  return null;
}

/** Inserts vertex `id` between a and b in every ring that contains edge a–b. */
export function insertOnEdge(ps: Parcel[], a: string, b: string, id: string): Parcel[] {
  return ps.map((p) => {
    const r = p.ring.slice();
    for (let i = 0; i < r.length; i++) {
      const x = r[i], y = r[(i + 1) % r.length];
      if ((x === a && y === b) || (x === b && y === a)) {
        r.splice(i + 1, 0, id);
        break;
      }
    }
    return { ...p, ring: r };
  });
}

function rot(r: string[], s: string) {
  const i = r.indexOf(s);
  return r.slice(i).concat(r.slice(0, i));
}

/** Joins two rings across their shared edge a–b and removes the resulting spikes. */
export function mergeRings(rA: string[], rB: string[], a: string, b: string) {
  let s = '', t = '';
  for (let i = 0; i < rA.length; i++) {
    const x = rA[i], y = rA[(i + 1) % rA.length];
    if ((x === a && y === b) || (x === b && y === a)) {
      s = x;
      t = y;
      break;
    }
  }
  const pA = rot(rA, t), pB = rot(rB, s);
  const r = pA.concat(pB.slice(1, -1));
  let ch = true;
  while (ch && r.length > 3) {
    ch = false;
    const n = r.length;
    for (let i = 0; i < n; i++) {
      if (r[i] === r[(i + 1) % n]) {
        r.splice(i, 1);
        ch = true;
        break;
      }
      if (r[(i - 1 + n) % n] === r[(i + 1) % n]) {
        const j = [i, (i + 1) % n].sort((x, y) => y - x);
        j.forEach((q) => r.splice(q, 1));
        ch = true;
        break;
      }
    }
  }
  return r;
}
