import { BG, INK, LINE, SHADOW_SM } from '../constants';
import Icon from './Icon';
import type { SegItem } from './types';
import ViewModeSwitch from './ViewModeSwitch';

const box = { background: BG, border: '1px solid ' + LINE, boxShadow: SHADOW_SM } as const;
const iconBtn = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;

/** Floating 2D/3D switch (+ fit button on phones), top-right of the canvas. */
export function FloatingViewControls({ x, y, seg, showFit, onFit }: { x: number; y: number; seg: SegItem[]; showFit: boolean; onFit: () => void }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', ...box }}>
        <ViewModeSwitch items={seg} />
      </div>
      {showFit && (
        <div onClick={onFit} title="Araziye sığdır" className="ac-muted" style={{ ...iconBtn, ...box }}>
          <Icon name="icon-scan" size={20} />
        </div>
      )}
    </div>
  );
}

/** Zoom in / out / fit stack (tablet and desktop). */
export function ZoomControls({ x, y, onZoomIn, onZoomOut, onFit }: { x: number; y: number; onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', flexDirection: 'column', ...box }}>
      <div onClick={onZoomIn} title="Yakınlaş" className="hv-ink07" style={iconBtn}><Icon name="icon-plus" size={20} /></div>
      <div style={{ height: 1, background: LINE }} />
      <div onClick={onZoomOut} title="Uzaklaş" className="hv-ink07" style={iconBtn}><Icon name="icon-minus" size={20} /></div>
      <div style={{ height: 2, background: LINE }} />
      <div onClick={onFit} title="Araziye sığdır" className="hv-ink07" style={iconBtn}><Icon name="icon-scan" size={20} /></div>
    </div>
  );
}

export function ScaleBar({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{text}</div>
      <div style={{ width: w, height: 6, border: '2px solid ' + INK, borderTop: 0 }} />
    </div>
  );
}
