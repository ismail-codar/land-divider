// Pure, state-derived queries about the parcel topology. No React here.
import { INK2, MIN_AREA, POS, POSB, WRN, WRNB } from './constants';
import { fD } from './format';
import { cen, clamp, edgesOf, hyp, insertOnEdge, pip, pts, sArea, segD, segX } from './geometry';
import type {
  EdgeInfo, EditorState, PanelKind, Parcel, Projector, Pt, Selection, SplitPoint, Verts,
} from './types';

type Topo = Pick<EditorState, 'parcels' | 'verts'>;

export const edgeMap = (st: Pick<EditorState, 'parcels'>) => edgesOf(st.parcels);

export function edgeInfo(st: Topo, key: string): EdgeInfo | null {
  const e = edgeMap(st)[key];
  if (!e) return null;
  const V = st.verts, a = V[e.a], b = V[e.b], l = hyp(a, b);
  return { ...e, len: l, n: { x: -(b.y - a.y) / l, y: (b.x - a.x) / l }, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

/** Only user-locked edges cannot be moved. */
export function isLockedEdge(st: Pick<EditorState, 'parcels' | 'locked'>, key: string) {
  const e = edgeMap(st)[key];
  return !e || st.locked.includes(key);
}

const onLocked = (st: Pick<EditorState, 'locked'>, id: string) => st.locked.some((k) => k.split('|').includes(id));

/** Land corners and the vertices sliding along their sides (they move with the corners). */
function landDeps(V: Verts, corners: string[]) {
  return [...corners, ...Object.keys(V).filter((id) => {
    const c = V[id].c;
    return Array.isArray(c) && (corners.includes(c[0]) || corners.includes(c[1]));
  })];
}

/** A land corner is locked if it or any vertex on its sides touches a locked edge. */
export function vLocked(st: Pick<EditorState, 'verts' | 'locked'>, id: string) {
  const v = st.verts[id];
  if (!v) return true;
  return (v.c === 'fixed' ? landDeps(st.verts, [id]) : [id]).some((k) => onLocked(st, k));
}

/** Re-places vertices sliding along land sides after corners moved V0 -> V (keeps their ratio t). */
export function followLand(V0: Verts, V: Verts): Verts {
  const o: Verts = { ...V };
  for (const id in o) {
    const c = o[id].c;
    if (!Array.isArray(c)) continue;
    const a0 = V0[c[0]], b0 = V0[c[1]], a = o[c[0]], b = o[c[1]];
    if (a === a0 && b === b0) continue;
    const t = segD(V0[id], a0, b0).t;
    o[id] = { ...o[id], x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return o;
}

/** The land side [a, b] an outer edge lies on. */
function landSide(V: Verts, e: Pick<EdgeInfo, 'a' | 'b'>): [string, string] {
  const ca = V[e.a].c, cb = V[e.b].c;
  if (Array.isArray(ca)) return ca;
  if (Array.isArray(cb)) return cb;
  return [e.a, e.b];
}

type LandTopo = Pick<EditorState, 'verts' | 'land'>;

/** Turns sliding vertex `id` into a land corner, splitting its side; other sliders keep their sub-side. */
export function addCorner(st: LandTopo, id: string): { verts: Verts; land: string[] } | null {
  const V = st.verts, c = V[id].c;
  if (!Array.isArray(c)) return null;
  const [a, b] = c, A = V[a], B = V[b], t0 = segD(V[id], A, B).t;
  const verts: Verts = { ...V, [id]: { ...V[id], c: 'fixed' } };
  for (const k in V) {
    const ck = V[k].c;
    if (k === id || !Array.isArray(ck) || !ck.includes(a) || !ck.includes(b)) continue;
    verts[k] = { ...V[k], c: segD(V[k], A, B).t < t0 ? [a, id] : [id, b] };
  }
  const i = st.land.indexOf(a), n = st.land.length, land = st.land.slice();
  land.splice(st.land[(i + 1) % n] === b ? i + 1 : i, 0, id);
  return { verts, land };
}

/** Removes land corner `id`; sliders on its two sides move onto the new side prev→next. */
export function removeCorner(st: LandTopo, id: string): { verts: Verts; land: string[] } | null {
  const L = st.land, n = L.length, i = L.indexOf(id);
  if (i < 0 || n <= 3) return null;
  const p = L[(i + n - 1) % n], q = L[(i + 1) % n], V = st.verts, verts: Verts = { ...V };
  for (const k in V) {
    const ck = V[k].c;
    if (!Array.isArray(ck) || !ck.includes(id)) continue;
    const r = segD(V[k], V[p], V[q]), t = clamp(r.t, 0.02, 0.98);
    verts[k] = { x: V[p].x + (V[q].x - V[p].x) * t, y: V[p].y + (V[q].y - V[p].y) * t, c: [p, q] };
  }
  return { verts, land: L.filter((x) => x !== id) };
}

/** Moves vertex `id` from p0 by d along normal n, respecting its outer-edge constraint. */
export function moveAlong(V: Verts, id: string, p0: Pt, n: Pt, d: number): Pt | null {
  const c = V[id].c;
  if (c === 'fixed') return null;
  if (!c) return { x: p0.x + n.x * d, y: p0.y + n.y * d };
  const A = V[c[0]], B = V[c[1]], l = hyp(A, B), ux = (B.x - A.x) / l, uy = (B.y - A.y) / l, dn = ux * n.x + uy * n.y;
  if (Math.abs(dn) < 0.15) return null;
  const s = d / dn;
  const x = p0.x + ux * s, y = p0.y + uy * s;
  const t = clamp(((x - A.x) * ux + (y - A.y) * uy) / l, 0.02, 0.98);
  return { x: A.x + ux * t * l, y: A.y + uy * t * l };
}

export function edgeDraggable(st: Pick<EditorState, 'parcels' | 'verts' | 'locked'>, key: string) {
  if (isLockedEdge(st, key)) return false;
  const e = edgeInfo(st, key)!;
  const V = st.verts;
  if (e.ps.length < 2) return !landDeps(V, landSide(V, e)).some((id) => onLocked(st, id));
  return !!(moveAlong(V, e.a, V[e.a], e.n, 0.001) && moveAlong(V, e.b, V[e.b], e.n, 0.001)) && !vLocked(st, e.a) && !vLocked(st, e.b);
}

/** Inner edges move their endpoints; outer edges move their whole land side in parallel. */
export function shiftEdge(V0: Verts, e: EdgeInfo, d: number): Verts | null {
  if (e.ps.length < 2) {
    const V = { ...V0 };
    for (const id of landSide(V0, e)) V[id] = { ...V0[id], x: V0[id].x + e.n.x * d, y: V0[id].y + e.n.y * d };
    return followLand(V0, V);
  }
  const a = moveAlong(V0, e.a, V0[e.a], e.n, d), b = moveAlong(V0, e.b, V0[e.b], e.n, d);
  if (!a || !b) return null;
  return { ...V0, [e.a]: { ...V0[e.a], ...a }, [e.b]: { ...V0[e.b], ...b } };
}

/** Projects p onto the vertex's outer edge (2–98 %), or returns it unchanged for free vertices. */
export function constrainV(V: Verts, id: string, p: Pt): Pt {
  const c = V[id].c;
  if (!c || c === 'fixed') return p;
  const A = V[c[0]], B = V[c[1]], r = segD(p, A, B), t = clamp(r.t, 0.02, 0.98);
  return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
}

/** Constraint for a new vertex placed on edge `key`: the land side it lies on, if outer. */
export function constraintFor(st: Pick<EditorState, 'parcels' | 'verts' | 'land'>, key: string, pt: Pt): [string, string] | null {
  const e = edgeMap(st)[key];
  if (!e || e.ps.length > 1) return null;
  const Ld = st.land, V = st.verts;
  for (let i = 0; i < Ld.length; i++) {
    const a = V[Ld[i]], b = V[Ld[(i + 1) % Ld.length]];
    if (segD(pt, a, b).d < 0.6) return [Ld[i], Ld[(i + 1) % Ld.length]];
  }
  return null;
}

export function neighborsOfV(st: Pick<EditorState, 'parcels'>, id: string) {
  const n = new Set<string>();
  Object.values(edgeMap(st)).forEach((e) => {
    if (e.a === id) n.add(e.b);
    if (e.b === id) n.add(e.a);
  });
  return [...n];
}

export function keepSel(sel: Selection | null, ps: Parcel[]): Selection | null {
  if (!sel) return null;
  if (sel.type === 'parcel') return ps.some((p) => p.id === sel.id) ? sel : null;
  if (sel.type === 'edge') return edgesOf(ps)[sel.id] ? sel : null;
  return ps.some((p) => p.ring.includes(sel.id)) ? sel : null;
}

type SplitSrc = Pick<EditorState, 'split' | 'verts' | 'parcels' | 'nextV' | 'land'>;

/** Builds the topology after splitting along split.p1–p2 (new vertices inserted on edges). */
export function buildSplit(st: SplitSrc) {
  const sp = st.split;
  if (!sp || !sp.p1 || !sp.p2) return null;
  const V: Verts = { ...st.verts };
  let ps = st.parcels, nv = st.nextV;
  const ids: string[] = [];
  const E = edgeMap(st);
  for (const q of [sp.p1, sp.p2]) {
    if (q.vid) {
      ids.push(q.vid);
      continue;
    }
    const e = E[q.edge!];
    const id = 'N' + nv++;
    V[id] = { x: q.x, y: q.y, c: constraintFor(st, q.edge!, q) };
    ps = insertOnEdge(ps, e.a, e.b, id);
    ids.push(id);
  }
  const P = ps.find((p) => p.id === sp.pid)!, r = P.ring, i1 = r.indexOf(ids[0]), i2 = r.indexOf(ids[1]);
  if (i1 < 0 || i2 < 0) return null;
  const cyc = (i: number, j: number) => {
    const o: string[] = [];
    let k = i;
    for (;;) {
      o.push(r[k]);
      if (k === j) break;
      k = (k + 1) % r.length;
    }
    return o;
  };
  const rA = cyc(i1, i2), rB = cyc(i2, i1);
  return { V, ps, rA, rB, ids, nv, P };
}

export interface SplitCheck { ok?: boolean; msg?: string; A1?: number; A2?: number }

export function splitCheck(st: SplitSrc): SplitCheck | null {
  const sp = st.split;
  if (!sp || !sp.p1 || !sp.p2) return null;
  const a = sp.p1, b = sp.p2;
  if (hyp(a, b) < 0.5) return { msg: 'Farklı iki nokta seçin.' };
  if (a.edge && b.edge && a.edge === b.edge) return { msg: 'Noktalar aynı sınır üzerinde olamaz.' };
  const onE = (q: SplitPoint, k: string) => q.edge === k || (!!q.vid && k.split('|').includes(q.vid));
  const E = Object.values(edgeMap(st)).filter((e) => e.ps.includes(sp.pid!));
  if (E.some((e) => onE(a, e.k) && onE(b, e.k))) return { msg: 'Noktalar aynı sınır üzerinde olamaz.' };
  const P = st.parcels.find((p) => p.id === sp.pid)!, poly = pts(st.verts, P.ring);
  if (!pip({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, poly)) return { msg: 'Bölme çizgisi parselin dışına taşıyor.' };
  const V = st.verts;
  for (const e of Object.values(edgeMap(st))) {
    if (onE(a, e.k) || onE(b, e.k)) continue;
    if (segX(a, b, V[e.a], V[e.b])) return { msg: 'Bölme çizgisi başka bir sınırı kesiyor.' };
  }
  const r = buildSplit(st);
  if (!r) return { msg: 'Bu bölme yapılamıyor.' };
  const A1 = Math.abs(sArea(pts(r.V, r.rA))), A2 = Math.abs(sArea(pts(r.V, r.rB)));
  if (Math.min(A1, A2) < MIN_AREA) return { msg: 'Parsellerden biri çok küçük kalıyor.', A1, A2 };
  return { ok: true, A1, A2 };
}

export function vName(st: Pick<EditorState, 'parcels'>, id: string) {
  const ids: string[] = [];
  st.parcels.forEach((p) => p.ring.forEach((x) => {
    if (!ids.includes(x)) ids.push(x);
  }));
  return 'Köşe K' + (ids.indexOf(id) + 1);
}

export function edgeName(st: Pick<EditorState, 'parcels'>, key: string) {
  return 'Sınır S' + (Object.keys(edgeMap(st)).indexOf(key) + 1);
}

/** Target area per parcel: share × land area, rounded to 5 m². */
export function targets(st: Pick<EditorState, 'parcels' | 'landArea'>) {
  const o: Record<string, number | null> = {};
  st.parcels.forEach((p) => (o[p.id] = p.share ? Math.round((p.share / 100) * st.landArea / 5) * 5 : null));
  return o;
}

export function diffStyle(d: number, tgt: number | null) {
  if (tgt == null) return { fg: INK2, bg: '#eae9e9', icon: 'icon-minus', text: '—' };
  const r = Math.round(d);
  if (Math.abs(r) <= Math.max(5, tgt * 0.005)) return { fg: POS, bg: POSB, icon: 'icon-check', text: 'Hedefte' };
  return r < 0
    ? { fg: WRN, bg: WRNB, icon: 'icon-arrow-down', text: fD(d) }
    : { fg: WRN, bg: WRNB, icon: 'icon-arrow-up', text: fD(d) };
}

export function panelKind(st: EditorState): PanelKind {
  if (st.tool === 'draw') return 'draw';
  if (st.tool === 'split' && st.split && st.split.pid) return 'split';
  if (st.addPrev) return 'addv';
  if (st.drag) return 'drag';
  return st.sel ? st.sel.type : 'none';
}

/** World → screen projection. t3d blends between flat 2D and the tilted/rotated 3D view. */
export function proj(st: Pick<EditorState, 't3d' | 'yaw' | 'tiltAmt' | 'cx' | 'cy' | 'view'>): Projector {
  const t = st.t3d, yw = st.yaw * t, c = Math.cos(yw), s = Math.sin(yw), tilt = 1 - st.tiltAmt * t;
  const cx = st.cx, cy = st.cy, k = st.view.k, ox = st.view.x, oy = st.view.y;
  return (x, y, z) => {
    const dx = x - cx, dy = y - cy, rx = dx * c - dy * s, ry = dx * s + dy * c;
    return { x: (cx + rx) * k + ox, y: (cy + ry * tilt) * k + oy - (z || 0) * k * t * 0.8, d: ry };
  };
}

/** Parcels sorted back-to-front for 3D painting. */
export function order3d(st: Pick<EditorState, 'parcels' | 'verts'>, P: Projector) {
  const V = st.verts;
  return st.parcels
    .map((p) => {
      const c = cen(pts(V, p.ring));
      return { ...p, dd: P(c.x, c.y).d };
    })
    .sort((a, b) => a.dd - b.dd);
}

export function addPrevPt(st: EditorState): Pt {
  const e = edgeInfo(st, st.addPrev!.key)!, V = st.verts, t = st.addPrev!.t;
  return { x: V[e.a].x + (V[e.b].x - V[e.a].x) * t, y: V[e.a].y + (V[e.b].y - V[e.a].y) * t };
}
