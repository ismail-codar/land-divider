import type { ReactNode } from 'react';
import { errors, gestures, thresholds } from '../data';
import { MONO, MUTED_TEXT, ROW_LINE, RuledList, Section, SectionHead, SubHead } from '../ui';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SubHead>{title}</SubHead>
      <RuledList>{children}</RuledList>
    </div>
  );
}

const row = (cols: string) => ({ display: 'grid', gridTemplateColumns: cols, gap: 16, padding: '10px 0', borderBottom: ROW_LINE, fontSize: 14 }) as const;

export default function RulesSection() {
  return (
    <Section id="s6" style={{ gap: 40 }}>
      <SectionHead n="06" title="Etkileşim kuralları" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 40 }}>
        <Block title="Hareket durum makinesi">
          {gestures.map((g) => (
            <div key={g.from} style={row('minmax(0,1fr) minmax(0,1.4fr)')}>
              <span style={{ fontWeight: 800 }}>{g.from}</span>
              <span style={{ textWrap: 'pretty' }}>{g.to}</span>
            </div>
          ))}
        </Block>
        <Block title="Ölçüler ve eşikler">
          {thresholds.map((t) => (
            <div key={t.k} style={row('minmax(0,1.3fr) auto')}>
              <span>{t.k}</span>
              <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{t.v}</span>
            </div>
          ))}
        </Block>
        <Block title="Hata dili">
          {errors.map((e) => (
            <div key={e.bad} style={row('minmax(0,1fr) minmax(0,1.3fr)')}>
              <span style={{ color: MUTED_TEXT, textDecoration: 'line-through', ...MONO, fontSize: 13 }}>{e.bad}</span>
              <span style={{ fontWeight: 600 }}>{e.good}</span>
            </div>
          ))}
        </Block>
      </div>
    </Section>
  );
}
