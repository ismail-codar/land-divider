// Transient layers above the canvas: snackbar, action menu, merge confirmation.
import { ACC, BG, INK, INK2, LINE, SHADOW_LG } from '../constants';
import type { MenuContent } from '../menu';
import Icon from './Icon';

export interface SnackView { msg: string; action: string; x: number; y: number; w: number }

export function Snackbar({ s, onAction }: { s: SnackView; onAction: () => void }) {
  return (
    <div style={{ position: 'absolute', left: s.x, width: s.w, top: s.y, display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 4px 0 16px', background: INK, color: BG, boxShadow: SHADOW_LG }}>
      <Icon name="icon-check" size={16} />
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, padding: '10px 0', textWrap: 'pretty' }}>{s.msg}</div>
      <div onClick={onAction} style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 800, color: '#ff9783', cursor: 'pointer' }}>{s.action}</div>
    </div>
  );
}

export interface MenuView extends MenuContent { x: number; y: number; w: number; pb: number; rowH: number; scrim: string }

export function ActionMenu({ m, onClose }: { m: MenuView; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: m.scrim }} />
      <div style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, display: 'flex', flexDirection: 'column', background: BG, borderTop: '2px solid ' + INK, boxShadow: SHADOW_LG, paddingBottom: m.pb }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px 10px', borderBottom: '2px solid ' + LINE }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK2 }}>{m.kicker}</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{m.title}</div>
        </div>
        {m.items.map((mi, i) => (
          <div key={i} onClick={mi.onClick} className="hv-ink06" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: m.rowH, padding: '6px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(32,30,29,0.2)', color: mi.fg, opacity: mi.op }}>
            <Icon name={mi.icon} size={19} style={{ width: 20, flex: 'none' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{mi.label}</div>
              {mi.sub && <div style={{ fontSize: 12, color: INK2, textWrap: 'pretty' }}>{mi.sub}</div>}
            </div>
            {mi.checked && <Icon name="icon-check" size={18} style={{ color: ACC }} />}
            {mi.chev && <Icon name="icon-chevron-right" size={18} style={{ color: INK2 }} />}
          </div>
        ))}
      </div>
    </>
  );
}

export interface ConfirmView { text: string; sub: string; x: number; y: number; w: number; pb: number }

export function MergeConfirm({ c, onCancel, onConfirm }: { c: ConfirmView; onCancel: () => void; onConfirm: () => void }) {
  const btn = { flex: 1, display: 'flex', alignItems: 'center', height: 48, padding: '0 14px', fontWeight: 800, cursor: 'pointer' } as const;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(45,43,43,0.28)' }} />
      <div style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, display: 'flex', flexDirection: 'column', gap: 12, padding: `20px 16px ${c.pb}px`, background: BG, borderTop: '2px solid ' + ACC, boxShadow: SHADOW_LG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="icon-merge" size={20} style={{ color: ACC }} />
          <div style={{ fontSize: 18, fontWeight: 800 }}>Parselleri birleştir</div>
        </div>
        <div style={{ fontSize: 15, textWrap: 'pretty' }}>{c.text}</div>
        <div style={{ fontSize: 13, color: INK2, fontVariantNumeric: 'tabular-nums' }}>{c.sub}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div onClick={onCancel} style={{ ...btn, border: '1px solid ' + LINE }}>İptal</div>
          <div onClick={onConfirm} className="ac-accent" style={{ ...btn, gap: 8, background: ACC, color: BG }}>
            <Icon name="icon-merge" size={18} />Birleştir
          </div>
        </div>
      </div>
    </>
  );
}
