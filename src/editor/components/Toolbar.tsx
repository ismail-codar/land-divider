import { BG, LINE, SHADOW_MD } from '../constants';
import Icon from './Icon';
import type { ToolItem } from './types';

/** Phone / portrait-tablet bottom toolbar. */
export function BottomToolbar({ height, tools }: { height: number; tools: ToolItem[] }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, background: BG, borderTop: '2px solid ' + LINE, display: 'flex', justifyContent: 'center' }}>
      <div style={{ flex: 1, maxWidth: 560, display: 'flex', padding: '6px 4px 0', gap: 2, height: 62 }}>
        {tools.map((t) => (
          <div key={t.id} onClick={t.onClick} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, paddingLeft: 3, cursor: 'pointer', background: t.bg, color: t.fg, borderTop: '3px solid ' + t.bar }}>
            <Icon name={t.icon} size={21} />
            <span style={{ fontSize: 11, letterSpacing: '-0.01em', fontWeight: 600, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Landscape-tablet vertical tool rail on the left edge. */
export function ToolRail({ top, tools }: { top: number; tools: ToolItem[] }) {
  return (
    <div style={{ position: 'absolute', left: 16, top, display: 'flex', flexDirection: 'column', background: BG, border: '1px solid ' + LINE, boxShadow: SHADOW_MD }}>
      {tools.map((t) => (
        <div key={t.id} onClick={t.onClick} style={{ width: 92, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, paddingLeft: 12, cursor: 'pointer', background: t.bg, color: t.fg, borderLeft: '3px solid ' + t.bar }}>
          <Icon name={t.icon} size={20} />
          <span style={{ fontSize: 12, fontWeight: 600, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
