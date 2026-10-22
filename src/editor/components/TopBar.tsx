import { BG, INK2, LINE } from '../constants';
import Icon from './Icon';
import type { SegItem, ToolItem } from './types';
import ViewModeSwitch from './ViewModeSwitch';

interface Props {
  top: number;
  title: string;
  height: number;
  subtitle: string;
  /** Desktop only: inline tools and 2D/3D switch. */
  desktop: boolean;
  tools: ToolItem[];
  seg: SegItem[];
  undoColor: string;
  redoColor: string;
  onUndo: () => void;
  onRedo: () => void;
  onMenu: () => void;
  onBack?: () => void;
}

const iconBtn = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export default function TopBar({ top, title, height, subtitle, desktop, tools, seg, undoColor, redoColor, onUndo, onRedo, onMenu, onBack }: Props) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, height, display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px', background: BG, borderBottom: '2px solid ' + LINE }}>
      <div onClick={onBack} title="Geri" className="hv-ink07" style={iconBtn}><Icon name="icon-arrow-left" size={22} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, ...ellipsis }}>{title}</div>
        <div style={{ fontSize: 12, color: INK2, ...ellipsis }}>{subtitle}</div>
      </div>
      {desktop && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 24, paddingLeft: 16, borderLeft: '2px solid ' + LINE, height: 36, alignItems: 'center' }}>
          {tools.map((t) => (
            <div key={t.id} onClick={t.onClick} title={t.label} className="hv-outline" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: t.bg, color: t.fg }}>
              <Icon name={t.icon} size={17} />{t.label}
            </div>
          ))}
        </div>
      )}
      <div style={{ flex: 1 }} />
      <div onClick={onUndo} title="Geri al" className="hv-ink07" style={{ ...iconBtn, color: undoColor }}><Icon name="icon-undo-2" size={21} /></div>
      <div onClick={onRedo} title="İleri al" className="hv-ink07" style={{ ...iconBtn, color: redoColor }}><Icon name="icon-redo-2" size={21} /></div>
      {desktop && (
        <div style={{ display: 'flex', border: '1px solid ' + LINE, margin: '0 8px' }}>
          <ViewModeSwitch items={seg} compact />
        </div>
      )}
      <div onClick={onMenu} title="Daha fazla" className="hv-ink07" style={iconBtn}><Icon name="icon-ellipsis-vertical" size={21} /></div>
    </div>
  );
}
