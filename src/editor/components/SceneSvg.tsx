import { BAD } from '../constants';
import type { Scene } from '../scene';

/** Map geometry layer: 3D faces, parcel fills, edges, vertex handles, arrows. */
export default function SceneSvg({ sc }: { sc: Scene }) {
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2" height="6" fill={BAD} opacity="0.35" />
        </pattern>
      </defs>
      {sc.faces.map((f, i) => (
        <polygon key={i} points={f.pts} fill={f.fill} fillOpacity={f.op ?? 1} stroke={f.stroke} style={{ strokeWidth: f.sw + 'px', strokeLinejoin: 'round' }} />
      ))}
      {sc.polys.map((p, i) => <polygon key={i} points={p.pts} fill={p.fill} fillOpacity={p.op ?? 1} />)}
      {sc.lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.c}
          style={{ strokeWidth: l.w + 'px', strokeDasharray: l.dash, strokeLinecap: l.cap as 'round' | 'butt' }} />
      ))}
      {sc.dots.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={d.s} height={d.s} rx={d.rx} fill={d.fill} stroke={d.stroke}
          style={{ strokeWidth: d.sw + 'px', strokeDasharray: d.dash }} />
      ))}
      {sc.tris.map((t, i) => <polygon key={i} points={t.pts} fill={t.fill} />)}
    </svg>
  );
}
