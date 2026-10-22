import { cen, pts, sArea } from './geometry';
import type { LandModel, Parcel, Pt, VertexConstraint, Verts } from './types';

/** Sample land: "Karaağaç Arazisi", 9 parcels on a 3×3 grid. */
export function sample(): LandModel {
  const A = { x: 0, y: 0 }, B = { x: 150, y: -8 }, C = { x: 160, y: 110 }, D = { x: -6, y: 116 };
  const L = (p: Pt, q: Pt, t: number, c: VertexConstraint) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, c });
  const V: Verts = {
    A: { ...A, c: 'fixed' }, B: { ...B, c: 'fixed' }, C: { ...C, c: 'fixed' }, D: { ...D, c: 'fixed' },
    T1: L(A, B, 0.33, ['A', 'B']), T2: L(A, B, 0.67, ['A', 'B']),
    R1: L(B, C, 0.33, ['B', 'C']), R2: L(B, C, 0.67, ['B', 'C']),
    U1: L(D, C, 0.33, ['D', 'C']), U2: L(D, C, 0.67, ['D', 'C']),
    L1: L(A, D, 0.33, ['A', 'D']), L2: L(A, D, 0.67, ['A', 'D']),
    M11: { x: 49, y: 37, c: null }, M12: { x: 102, y: 34, c: null },
    M21: { x: 48, y: 76, c: null }, M22: { x: 104, y: 73, c: null },
  };
  const P = (n: number, ring: string[], owner: string, share: number, use: string, h: number): Parcel => ({
    id: 'p' + n, num: n, name: 'Parsel ' + n, ring, owner, share, use, h,
  });
  const parcels = [
    P(11, ['A', 'T1', 'M11', 'L1'], 'Mehmet Kaya', 12, 'Konut', 7),
    P(12, ['T1', 'T2', 'M12', 'M11'], 'Ahmet Yılmaz', 11, 'Konut', 9),
    P(13, ['T2', 'B', 'R1', 'M12'], 'Ayşe Demir', 11, 'Ticari', 13),
    P(14, ['L1', 'M11', 'M21', 'L2'], 'Fatma Şahin', 11, 'Konut', 6),
    P(15, ['M11', 'M12', 'M22', 'M21'], 'Ali Öztürk', 11, 'Tarım', 3),
    P(16, ['M12', 'R1', 'R2', 'M22'], 'Zeynep Arslan', 11, 'Konut', 8),
    P(17, ['L2', 'M21', 'U1', 'D'], 'Hasan Çelik', 11, 'Yeşil alan', 2),
    P(18, ['M21', 'M22', 'U2', 'U1'], 'Elif Koç', 11, 'Tarım', 3),
    P(19, ['M22', 'R2', 'C', 'U2'], 'Murat Aydın', 11, 'Ticari', 11),
  ];
  const land = ['A', 'B', 'C', 'D'];
  const la = sArea(pts(V, land));
  const c = cen(pts(V, land));
  return { verts: V, parcels, land, orient: Math.sign(la), landArea: Math.abs(la), cx: c.x, cy: c.y, nextNum: 20, nextV: 1 };
}
