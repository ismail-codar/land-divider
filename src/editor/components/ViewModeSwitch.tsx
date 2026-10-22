import type { SegItem } from './types';

/** 2D / 3D segmented control. `compact` is the desktop top-bar variant. */
export default function ViewModeSwitch({ items, compact }: { items: SegItem[]; compact?: boolean }) {
  return (
    <>
      {items.map((s) => (
        <div
          key={s.label}
          onClick={s.onClick}
          style={{
            width: 48, height: compact ? 34 : 44, display: 'flex', alignItems: 'center',
            justifyContent: compact ? 'flex-start' : undefined, paddingLeft: 12,
            fontSize: compact ? 13 : 14, fontWeight: 800, cursor: 'pointer', background: s.bg, color: s.fg,
          }}
        >
          {s.label}
        </div>
      ))}
    </>
  );
}
