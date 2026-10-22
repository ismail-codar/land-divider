import { SHADOW_MD } from '../constants';
import type { Scene } from '../scene';
import Icon from './Icon';

export interface Readout { show: boolean; x?: number; y?: number; text?: string; icon?: string; fg?: string; bg?: string }

/** HTML overlays positioned in canvas space: parcel labels, chips and the drag readout. */
export default function MapOverlays({ sc, ro }: { sc: Scene; ro: Readout }) {
  return (
    <>
      {sc.labels.map((lb, i) => (
        <div key={i} style={{ position: 'absolute', left: lb.x, top: lb.y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', color: lb.c }}>{lb.name}</div>
          {lb.showArea && <div style={{ fontSize: 12, fontWeight: 600, color: '#201e1d' }}>{lb.area}</div>}
          {lb.hasDelta && <div style={{ fontSize: 12, fontWeight: 800, padding: '1px 6px', background: lb.dbg, color: lb.dfg }}>{lb.delta}</div>}
        </div>
      ))}
      {sc.chips.map((cp, i) => (
        <div key={i} style={{ position: 'absolute', left: cp.x, top: cp.y, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', background: cp.bg, color: cp.fg, border: '1px solid ' + cp.bd, fontVariantNumeric: 'tabular-nums' }}>
          <Icon name={cp.icon} size={12} style={{ lineHeight: 1 }} />
          <span>{cp.text}</span>
        </div>
      ))}
      {ro.show && (
        <div style={{ position: 'absolute', left: ro.x, top: ro.y, transform: 'translate(-50%,-100%)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', background: ro.bg, color: ro.fg, boxShadow: SHADOW_MD, fontVariantNumeric: 'tabular-nums' }}>
          <Icon name={ro.icon!} size={14} style={{ lineHeight: 1 }} />
          {ro.text}
        </div>
      )}
    </>
  );
}
