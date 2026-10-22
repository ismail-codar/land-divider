// Builds the drawable map scene (SVG primitives + HTML overlays) from editor state.
import { ACC, ACC1, ACC7, BAD, BG, FILLS, INK, INK2, LINE, LOCKED, POS, POSB, WRN, WRNB } from './constants';
import { fA, fD, fL, initials } from './format';
import { cen, hyp, pts, sArea } from './geometry';
import {
  addPrevPt, buildSplit, edgeDraggable, edgeInfo, isLockedEdge, neighborsOfV, order3d, proj, splitCheck,
} from './model';
import type { EdgeMap, EditorState, Parcel, Projector, Pt } from './types';

export interface SceneFace { pts: string; fill: string; stroke: string; sw: number; op?: number }
export interface ScenePoly { pts: string; fill: string; op?: number }
export interface SceneLine { x1: number; y1: number; x2: number; y2: number; c: string; w: number; dash: string; cap: string }
export interface SceneDot { x: number; y: number; s: number; rx: number; fill: string; stroke: string; sw: number; dash: string }
export interface SceneLabel {
  x: number; y: number; name: string; c: string;
  showArea: boolean; area: string;
  hasDelta: boolean; delta: string; dfg: string; dbg: string;
}
export interface SceneChip { x: number; y: number; text: string; icon: string; fg: string; bg: string; bd: string }

export interface Scene {
  faces: SceneFace[];
  polys: ScenePoly[];
  lines: SceneLine[];
  dots: SceneDot[];
  tris: ScenePoly[];
  labels: SceneLabel[];
  chips: SceneChip[];
}

const pstr = (a: Pt[]) => a.map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ');

export function buildScene(st: EditorState, P: Projector, E: EdgeMap, areas: Record<string, number>): Scene {
  const o: Scene = { faces: [], polys: [], lines: [], dots: [], tris: [], labels: [], chips: [] };
  const ln = (a: Pt, b: Pt, c: string, w: number, dash?: string, cap?: string) =>
    o.lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, c, w, dash: dash || 'none', cap: cap || 'round' });
  const dot = (q: Pt, s: number, fill: string, stroke: string, sw: number, round?: boolean, dash?: string) =>
    o.dots.push({ x: q.x - s / 2, y: q.y - s / 2, s, rx: round === false ? 0 : s / 2, fill, stroke, sw, dash: dash || 'none' });
  const chip = (q: Pt, text: string, icon: string | null, fg?: string, bg?: string, bd?: string) =>
    o.chips.push({ x: q.x, y: q.y, text, icon: icon || '', fg: fg || INK, bg: bg || BG, bd: bd || LINE });
  const arrow = (c: Pt, u: Pt, s: number, fill: string) => {
    const px = -u.y, py = u.x;
    o.tris.push({
      pts: pstr([
        { x: c.x + u.x * s, y: c.y + u.y * s },
        { x: c.x - u.x * s * 0.1 + px * s * 0.7, y: c.y - u.y * s * 0.1 + py * s * 0.7 },
        { x: c.x - u.x * s * 0.1 - px * s * 0.7, y: c.y - u.y * s * 0.1 - py * s * 0.7 },
      ]),
      fill,
    });
  };

  // Empty land: only the in-progress drawing.
  if (st.empty) {
    if (st.tool === 'draw') {
      const q = st.drawPts.map((p) => P(p.x, p.y));
      for (let i = 0; i + 1 < q.length; i++) ln(q[i], q[i + 1], INK, 2.5);
      if (q.length >= 3) ln(q[q.length - 1], q[0], ACC, 2, '6 6');
      q.forEach((p, i) => {
        if (i === 0 && q.length >= 3) dot(p, 34, 'rgba(236,48,19,0.14)', 'none', 0);
        dot(p, i === 0 ? 14 : 10, i === 0 ? ACC : BG, i === 0 ? BG : INK, 2, false);
      });
      if (q.length >= 3) chip({ x: q[0].x, y: q[0].y - 30 }, 'Kapatmak için dokun', 'icon-circle-dot', ACC7, ACC1, ACC);
    }
    return o;
  }

  const V = st.verts, sel = st.sel, dr = st.drag, t = st.t3d, k = st.view.k;
  const num = (p: Parcel) => 'P' + p.num;
  const lab = (p: Parcel, q: Pt) => {
    const a = areas[p.id], r = Math.sqrt(a) * k;
    const isSel = sel && sel.type === 'parcel' && sel.id === p.id;
    const ini = initials(p.owner);
    let dl: number | null = null;
    if (dr && dr.before[p.id] != null) {
      const d = a - dr.before[p.id];
      if (Math.abs(d) >= 0.5) dl = d;
    }
    if (r < 26) return;
    o.labels.push({
      x: q.x, y: q.y, name: num(p) + (ini ? ' · ' + ini : ''), c: isSel ? ACC7 : INK2,
      showArea: st.showAreas && r > 64, area: fA(a),
      hasDelta: dl != null, delta: dl != null ? fD(dl) : '',
      dfg: dl! > 0 ? POS : WRN, dbg: dl! > 0 ? POSB : WRNB,
    });
  };

  // 3D: land base, extruded walls and roofs painted back-to-front; parcel solids are half see-through.
  if (t > 0) {
    const Ld = st.land.map((id) => P(V[id].x, V[id].y, 0)), SOLID = 0.5;
    o.faces.push({ pts: pstr(Ld), fill: '#d2cece', stroke: 'none', sw: 0, op: st.bg && !st.bg.hidden ? 0.35 : 1 });
    const yw = st.yaw * t, cs = Math.cos(yw), sn = Math.sin(yw);
    order3d(st, P).forEach((p) => {
      const isSel = sel && sel.type === 'parcel' && sel.id === p.id;
      const r = p.ring;
      const walls: (SceneFace & { d: number })[] = [];
      for (let j = 0; j < r.length; j++) {
        const a = V[r[j]], b = V[r[(j + 1) % r.length]];
        let nx = b.y - a.y, ny = -(b.x - a.x);
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        const rny = nx * sn + ny * cs, rnx = nx * cs - ny * sn;
        if (rny * st.orient <= 0.02) continue;
        const lum = 0.5 + 0.5 * (rnx * -0.6 + rny * 0.8) * st.orient;
        const g0 = isSel ? [255, 196, 184] : [186, 182, 182], g1 = isSel ? [255, 224, 217] : [224, 221, 221];
        const cc = g0.map((v, m) => Math.round(v + (g1[m] - v) * lum));
        walls.push({
          d: (P(a.x, a.y).d + P(b.x, b.y).d) / 2,
          pts: pstr([P(a.x, a.y, 0), P(b.x, b.y, 0), P(b.x, b.y, p.h), P(a.x, a.y, p.h)]),
          fill: 'rgb(' + cc.join(',') + ')', stroke: isSel ? ACC : LOCKED, sw: isSel ? 1.5 : 0.75, op: SOLID,
        });
      }
      walls.sort((x, y) => x.d - y.d).forEach((w) => o.faces.push(w));
      const top = r.map((id) => P(V[id].x, V[id].y, p.h));
      o.faces.push({ pts: pstr(top), fill: isSel ? ACC1 : FILLS[p.num % 3], stroke: isSel ? ACC : INK2, sw: isSel ? 2.5 : 1, op: SOLID });
      const c = cen(pts(V, r));
      lab(p, P(c.x, c.y, p.h));
    });
    return o;
  }

  // 2D: parcel fills (see-through over a background image).
  const op = st.bg && !st.bg.hidden ? 0.35 : 1;
  st.parcels.forEach((p) => {
    const isSel = (sel && sel.type === 'parcel' && sel.id === p.id) || (st.split && st.split.pid === p.id);
    o.polys.push({ pts: pstr(p.ring.map((id) => P(V[id].x, V[id].y))), fill: isSel ? ACC1 : FILLS[p.num % 3], op: isSel ? Math.max(op, 0.6) : op });
  });

  // Edges (vertices touched by the active drag are highlighted).
  const act = new Set<string>();
  if (dr) {
    for (const id in V) if (V[id] !== dr.v0[id]) act.add(id);
    if (dr.kind === 'vertex') act.add(dr.id);
    else {
      const e = E[dr.id];
      if (e) {
        act.add(e.a);
        act.add(e.b);
      }
    }
  }
  const hov = st.hover;
  const selEdge = sel && sel.type === 'edge' ? sel.id : null;
  Object.values(E).forEach((e) => {
    const a = P(V[e.a].x, V[e.a].y), b = P(V[e.b].x, V[e.b].y);
    const outer = e.ps.length < 2, lk = st.locked.includes(e.k);
    if (e.k === selEdge) return;
    let c = outer ? INK : LOCKED, w = outer ? 3 : 1.5;
    const dash = lk ? '6 4' : 'none';
    if (act.has(e.a) || act.has(e.b)) {
      c = ACC;
      w = 2.5;
    }
    if (hov && hov.type === 'edge' && hov.id === e.k && !dr) {
      w += 1.5;
      c = outer ? INK : INK2;
    }
    ln(a, b, c, w, dash, 'butt');
  });

  // Selected parcel outline.
  if (sel && sel.type === 'parcel') {
    const p = st.parcels.find((x) => x.id === sel.id);
    if (p) {
      const r = p.ring;
      for (let i = 0; i < r.length; i++) {
        const n = r[(i + 1) % r.length];
        ln(P(V[r[i]].x, V[r[i]].y), P(V[n].x, V[n].y), ACC, 2.5, 'none', 'round');
      }
    }
  }

  // Selected edge: halo, perpendicular arrows + handle, length chip.
  if (selEdge && E[selEdge]) {
    const e = edgeInfo(st, selEdge)!, a = P(V[e.a].x, V[e.a].y), b = P(V[e.b].x, V[e.b].y);
    const lk = isLockedEdge(st, selEdge);
    const drg = !lk && edgeDraggable(st, selEdge);
    if (lk) {
      ln(a, b, 'rgba(32,30,29,0.18)', 12, 'none', 'butt');
      ln(a, b, INK, 4, '8 5', 'butt');
    } else {
      ln(a, b, 'rgba(236,48,19,0.16)', 14, 'none', 'round');
      ln(a, b, ACC, 4.5, 'none', 'round');
    }
    const m = P(e.mid.x, e.mid.y);
    const sp = proj(st);
    const n2 = (() => {
      const q = sp(e.mid.x + e.n.x, e.mid.y + e.n.y);
      const dx = q.x - m.x, dy = q.y - m.y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    })();
    if (lk) chip({ x: m.x, y: m.y - 22 }, 'Kilitli sınır', 'icon-lock', INK, BG, INK);
    else if (drg && !st.addPrev) {
      const dragging = dr && dr.kind === 'edge';
      const gap = dragging ? 30 : 24;
      if (dragging) ln({ x: m.x - n2.x * 80, y: m.y - n2.y * 80 }, { x: m.x + n2.x * 80, y: m.y + n2.y * 80 }, 'rgba(236,48,19,0.45)', 1.5, '3 5');
      arrow({ x: m.x + n2.x * gap, y: m.y + n2.y * gap }, n2, dragging ? 11 : 8, ACC);
      arrow({ x: m.x - n2.x * gap, y: m.y - n2.y * gap }, { x: -n2.x, y: -n2.y }, dragging ? 11 : 8, ACC);
      dot(m, dragging ? 22 : 18, BG, ACC, 3);
    }
    const lpos = { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 };
    chip({ x: lpos.x + n2.x * 16, y: lpos.y + n2.y * 16 }, fL(e.len), null, INK, BG, LINE);
  }

  // Invalid-drag ghost.
  if (dr && dr.ghost) {
    if (dr.kind === 'vertex') {
      const q = P(dr.ghost.x, dr.ghost.y);
      neighborsOfV(st, dr.id).forEach((n) => ln(q, P(V[n].x, V[n].y), BAD, 2, '5 4'));
      dot(q, 34, 'url(#hatch)', 'none', 0);
      dot(q, 18, 'rgba(124,20,5,0.12)', BAD, 2, true, '3 2');
    } else {
      const a = P(dr.ghost.a.x, dr.ghost.a.y), b = P(dr.ghost.b.x, dr.ghost.b.y);
      ln(a, b, BAD, 3, '6 4');
    }
  }

  // Edge length chips.
  if (st.showLengths && k > 1.2)
    Object.values(E).forEach((e) => {
      if (e.k === selEdge) return;
      const a = V[e.a], b = V[e.b], l = hyp(a, b);
      if (l * k < 56) return;
      chip(P((a.x + b.x) / 2, (a.y + b.y) / 2), fL(l), null, INK2, BG, 'transparent');
    });

  // Vertices.
  const used = new Set<string>();
  st.parcels.forEach((p) => p.ring.forEach((id) => used.add(id)));
  const splitRing = st.split && st.split.pid ? new Set(st.parcels.find((p) => p.id === st.split!.pid)!.ring) : null;
  used.forEach((id) => {
    const v = V[id], q = P(v.x, v.y);
    const fixed = v.c === 'fixed';
    const isSel = sel && sel.type === 'vertex' && sel.id === id;
    const isDrag = dr && dr.kind === 'vertex' && dr.id === id;
    const isHov = hov && hov.type === 'vertex' && hov.id === id;
    if (isDrag) {
      dot(q, 48, 'rgba(236,48,19,0.14)', 'none', 0);
      dot(q, 18, ACC, BG, 3);
      return;
    }
    if (isSel) {
      dot(q, 40, 'rgba(236,48,19,0.12)', 'none', 0);
      dot(q, 16, ACC, BG, 2.5, !fixed);
      return;
    }
    if (selEdge && selEdge.split('|').includes(id)) {
      dot(q, 11, BG, ACC, 2.5, !fixed);
      return;
    }
    if (splitRing && splitRing.has(id)) {
      dot(q, 10, BG, ACC, 2, !fixed);
      return;
    }
    if (k < 0.9 && !fixed) return;
    dot(q, isHov ? 12 : fixed ? 9 : 8, fixed ? INK : BG, INK, 1.5, !fixed);
  });

  // Add-vertex preview handle.
  if (st.addPrev) {
    const h = addPrevPt(st), q = P(h.x, h.y);
    dot(q, 44, 'rgba(236,48,19,0.14)', 'none', 0);
    dot(q, 18, ACC, BG, 3);
    chip({ x: q.x, y: q.y - 32 }, 'Yeni köşe', 'icon-move-horizontal', ACC7, ACC1, ACC);
  }

  // Split preview.
  if (st.split && st.split.pid) {
    const sp = st.split, c = splitCheck(st);
    const ok = !!(c && c.ok);
    const col = !c ? ACC : ok ? ACC : BAD;
    const q1 = sp.p1 && P(sp.p1.x, sp.p1.y), q2 = sp.p2 && P(sp.p2.x, sp.p2.y);
    if (q1 && q2) {
      ln(q1, q2, ok ? BG : 'rgba(124,20,5,0.12)', 7, 'none', 'round');
      ln(q1, q2, col, 2.5, '8 6', 'round');
    }
    [q1, q2].forEach((q, i) => {
      if (!q) return;
      dot(q, 36, ok || !c ? 'rgba(236,48,19,0.12)' : 'rgba(124,20,5,0.12)', 'none', 0);
      dot(q, 16, col, BG, 2.5);
      chip({ x: q.x, y: q.y - 26 }, i ? 'Bitiş' : 'Başlangıç', null, col === BAD ? BAD : ACC7, col === BAD ? '#fbe5e0' : ACC1, col);
    });
    if (ok && q1 && q2) {
      const r = buildSplit(st)!;
      [r.rA, r.rB].forEach((ring) => {
        const c2 = cen(pts(r.V, ring)), q = P(c2.x, c2.y);
        chip({ x: q.x, y: q.y + 22 }, '≈ ' + fA(Math.abs(sArea(pts(r.V, ring)))), 'icon-square-dashed', ACC7, ACC1, ACC);
      });
    }
  }

  // Parcel labels on top.
  st.parcels.forEach((p) => {
    const c = cen(pts(V, p.ring));
    lab(p, P(c.x, c.y));
  });
  return o;
}
