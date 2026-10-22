import type { PointerEventHandler, ReactNode } from 'react';
import { BG, INK, INK2, LINE } from '../constants';
import type {
  PanelAction, PanelBanner, PanelContent, PanelListItem, PanelNote, PanelRow, PanelSide, PanelStep, PanelTarget,
} from '../panel';
import Icon from './Icon';

/** Frame geometry for the panel: bottom sheet on phones, right column on wide layouts. */
export interface PanelFrame {
  l: number; t: number; w: number; h: number;
  borderTop: string; borderLeft: string; shadow: string; transition: string; headerPadding: string;
}

export interface SheetHandlers {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
}

const LINE25 = 'rgba(32,30,29,0.25)';
const overline = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' } as const;
const tabular = { fontVariantNumeric: 'tabular-nums' } as const;

export default function DetailPanel({ frame, pc, phone, sheet }: { frame: PanelFrame; pc: PanelContent; phone: boolean; sheet: SheetHandlers }) {
  const drag = { ...sheet, onPointerCancel: sheet.onPointerUp };
  return (
    <div style={{ position: 'absolute', left: frame.l, top: frame.t, width: frame.w, height: frame.h, display: 'flex', flexDirection: 'column', background: BG, borderTop: frame.borderTop, borderLeft: frame.borderLeft, boxShadow: frame.shadow, transition: frame.transition, overflow: 'hidden' }}>
      {phone && (
        <div {...drag} style={{ flex: 'none', height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', cursor: 'grab' }}>
          <div style={{ width: 40, height: 4, background: '#9b9797' }} />
        </div>
      )}
      <div {...drag} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: frame.headerPadding, minHeight: 52, touchAction: 'none' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ ...overline, color: pc.kc }}>{pc.kicker}</div>
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pc.title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, ...tabular }}>
          <div style={{ fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' }}>{pc.value}</div>
          {pc.valueSub && <div style={{ fontSize: 12, color: INK2, whiteSpace: 'nowrap' }}>{pc.valueSub}</div>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 16px 24px', touchAction: 'pan-y' }}>
        {pc.banner && <Banner b={pc.banner} />}
        {pc.target && <TargetBlock t={pc.target} />}
        {pc.sides && <SideList sides={pc.sides} />}
        {pc.steps && <StepBar steps={pc.steps} />}
        {pc.note && <Note n={pc.note} />}
        {pc.actions && <ActionRow actions={pc.actions} />}
        {pc.rows && <InfoRows title={pc.rowsTitle} rows={pc.rows} />}
        {pc.list && <ParcelList items={pc.list} />}
      </div>
    </div>
  );
}

function Banner({ b }: { b: PanelBanner }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, background: b.bg, color: b.fg, borderLeft: 0, borderTop: '2px solid ' + b.fg }}>
      <Icon name={b.icon} size={18} style={{ marginTop: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontWeight: 800 }}>{b.title}</div>
        <div style={{ fontSize: 13, textWrap: 'pretty' }}>{b.text}</div>
      </div>
    </div>
  );
}

function TargetBlock({ t }: { t: PanelTarget }) {
  const cell = (label: string, value: ReactNode, padding: string, divider: boolean, color?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding, borderLeft: divider ? '1px solid ' + LINE : undefined }}>
      <div style={{ fontSize: 12, color: INK2 }}>{label}</div>
      <div style={{ display: color ? 'flex' : undefined, alignItems: color ? 'center' : undefined, gap: color ? 4 : undefined, fontSize: 15, fontWeight: 800, color, ...tabular }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '2px solid ' + LINE }}>
        {cell('Mevcut', t.cur, '8px 8px 0 0', false)}
        {cell('Hedef', t.tgt, '8px 8px 0', true)}
        {cell('Fark', <><Icon name={t.icon} size={14} />{t.diff}</>, '8px 0 0 8px', true, t.fg)}
      </div>
      <div style={{ position: 'relative', height: 6, background: '#d7d3d3' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: t.pct + '%', background: t.bar }} />
        <div style={{ position: 'absolute', left: t.mark + '%', top: -4, bottom: -4, width: 2, background: INK }} />
      </div>
    </div>
  );
}

function SideList({ sides }: { sides: PanelSide[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid ' + LINE }}>
      {sides.map((sd) => (
        <div key={sd.short} onClick={sd.onClick} className="ac-ink07" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, borderBottom: '1px solid ' + LINE, cursor: 'pointer' }}>
          <div style={{ fontWeight: 800, minWidth: 40 }}>{sd.short}</div>
          <div style={{ flex: 1, color: INK2, fontSize: 13 }}>{sd.owner}</div>
          <div style={{ fontWeight: 600, ...tabular }}>{sd.area}</div>
          {sd.delta && <div style={{ fontSize: 12, fontWeight: 800, padding: '1px 6px', background: sd.dbg, color: sd.dfg }}>{sd.delta}</div>}
        </div>
      ))}
    </div>
  );
}

function StepBar({ steps }: { steps: PanelStep[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', borderTop: '2px solid ' + LINE }}>
      {steps.map((sp) => (
        <div key={sp.n} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 6px 0 0', borderTop: '3px solid ' + sp.bar, marginTop: -2 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: sp.fg }}>{sp.n}</div>
          <div style={{ fontSize: 12, lineHeight: 1.25, color: sp.fg }}>{sp.label}</div>
        </div>
      ))}
    </div>
  );
}

function Note({ n }: { n: PanelNote }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: n.fg }}>
      <Icon name={n.icon} size={16} />
      <span style={{ textWrap: 'pretty' }}>{n.text}</span>
    </div>
  );
}

function ActionRow({ actions }: { actions: PanelAction[] }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {actions.map((a, i) => (
        <div key={i} onClick={a.onClick} className="ac-dim" style={{ flex: a.flex, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 14px', cursor: 'pointer', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', background: a.bg, color: a.fg, border: '1px solid ' + a.bd, opacity: a.op }}>
          <Icon name={a.icon} size={18} style={{ flex: 'none' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</span>
        </div>
      ))}
    </div>
  );
}

function InfoRows({ title, rows }: { title: string; rows: PanelRow[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...overline, color: INK2, paddingBottom: 6, borderBottom: '2px solid ' + LINE }}>{title}</div>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, minHeight: 40, alignItems: 'center', borderBottom: '1px solid ' + LINE25 }}>
          <span style={{ color: INK2 }}>{r.k}</span>
          <span style={{ fontWeight: 600, textAlign: 'right', ...tabular }}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

const listCols = { display: 'grid', gridTemplateColumns: '48px minmax(0,1fr) auto 72px', gap: 8 } as const;

function ParcelList({ items }: { items: PanelListItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...listCols, ...overline, color: INK2, paddingBottom: 6, borderBottom: '2px solid ' + LINE }}>
        <span>No</span><span>Hissedar</span><span>Alan</span><span style={{ textAlign: 'right' }}>Fark</span>
      </div>
      {items.map((it) => (
        <div key={it.short} onClick={it.onClick} className="hv-ink05" style={{ ...listCols, alignItems: 'center', minHeight: 48, borderBottom: '1px solid ' + LINE25, cursor: 'pointer', ...tabular }}>
          <span style={{ fontWeight: 800 }}>{it.short}</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: INK2 }}>{it.owner}</span>
          <span style={{ fontWeight: 600 }}>{it.area}</span>
          <span style={{ justifySelf: 'end', fontSize: 12, fontWeight: 800, padding: '1px 6px', background: it.dbg, color: it.dfg }}>{it.diff}</span>
        </div>
      ))}
    </div>
  );
}
