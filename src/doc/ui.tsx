// Shared building blocks for the design document page.
import type { CSSProperties, ReactNode } from 'react';
import ParselEditor from '../editor/ParselEditor';
import type { Device, Scenario } from '../editor/types';

export const ACCENT_DARK = '#ae1800';
export const MUTED_TEXT = '#605d5d';
export const DIVIDER = '2px solid rgba(32,30,29,0.4)';
export const ROW_LINE = '1px solid rgba(32,30,29,0.25)';
export const ROW_LINE_LIGHT = '1px solid rgba(32,30,29,0.2)';
export const MONO: CSSProperties = { fontFamily: 'ui-monospace,Menlo,monospace' };
export const OVERLINE: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' };

export function Section({ id, label, last, style, children }: { id: string; label?: string; last?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <section id={id} data-screen-label={label} style={{ padding: '48px 40px', borderBottom: last ? undefined : DIVIDER, display: 'flex', flexDirection: 'column', ...style }}>
      {children}
    </section>
  );
}

export function SectionHead({ n, title, intro, maxWidth = 720 }: { n: string; title: string; intro?: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth }}>
      <div style={{ ...OVERLINE, color: ACCENT_DARK }}>{n}</div>
      <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{title}</h2>
      {intro && <p style={{ margin: 0, textWrap: 'pretty' }}>{intro}</p>}
    </div>
  );
}

export function SubHead({ children }: { children: ReactNode }) {
  return <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{children}</h3>;
}

/** Bordered card grid: the container draws top/left lines, each card right/bottom. */
export function CardGrid({ min, fill = 'auto-fill', children }: { min: number; fill?: 'auto-fill' | 'auto-fit'; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fill},minmax(${min}px,1fr))`, borderTop: DIVIDER, borderLeft: DIVIDER }}>
      {children}
    </div>
  );
}

export function Card({ gap, children }: { gap: number; children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, padding: 20, borderRight: DIVIDER, borderBottom: DIVIDER }}>{children}</div>;
}

/** Ruled list: a top divider followed by rows. */
export function RuledList({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', borderTop: DIVIDER }}>{children}</div>;
}

/** A device frame hosting a live editor instance. */
export function DeviceFrame({ device, scenario, width, height, style, label }: {
  device: Device; scenario: Scenario; width: number; height: number; style: CSSProperties; label?: string;
}) {
  return (
    <div data-screen-label={label} style={{ position: 'relative', width, height, overflow: 'hidden', ...style }}>
      <ParselEditor device={device} scenario={scenario} />
    </div>
  );
}

/** 390×844 phone frame. */
export function PhoneFrame({ scenario, style }: { scenario: Scenario; style: CSSProperties }) {
  return <DeviceFrame device="phone" scenario={scenario} width={390} height={844} style={{ borderRadius: 48, ...style }} />;
}
