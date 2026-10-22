import type { ReactNode } from 'react';
import { colors, misc, spacing, typeScale } from '../data';
import { DIVIDER, MONO, MUTED_TEXT, OVERLINE, ROW_LINE, RuledList, Section, SectionHead, SubHead } from '../ui';

const COLOR_COLS = '180px minmax(0,1.2fr) 140px 140px minmax(0,1.6fr)';
const monoSmall = { ...MONO, fontSize: 12 };

function Swatch({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 28, height: 28, flex: 'none', background: color, border: '1px solid rgba(32,30,29,0.4)' }} />
      <span style={monoSmall}>{text}</span>
    </span>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SubHead>{title}</SubHead>
      <RuledList>{children}</RuledList>
    </div>
  );
}

export default function TokensSection() {
  return (
    <Section id="s7" style={{ gap: 40 }}>
      <SectionHead
        n="07"
        title="Tasarım tokenları"
        maxWidth={760}
        intro={<>Değerler Modernist sisteminden (Archivo, tek vurgu #ec3013, 0 radius, 2px çizgiler). Rol adları Astryx konvansiyonunu izler; her renk açık/koyu çift olarak tanımlanır (<code>light-dark()</code>), böylece koyu tema yalnızca token değişimidir.</>}
      />
      <RuledList>
        <div style={{ display: 'grid', gridTemplateColumns: COLOR_COLS, gap: 16, padding: '8px 0', borderBottom: DIVIDER, ...OVERLINE, color: MUTED_TEXT }}>
          <span>Token</span><span>Astryx rolü</span><span>Açık</span><span>Koyu</span><span>Kullanım</span>
        </div>
        {colors.map((c) => (
          <div key={c.name} style={{ display: 'grid', gridTemplateColumns: COLOR_COLS, gap: 16, padding: '10px 0', borderBottom: ROW_LINE, alignItems: 'center', fontSize: 14 }}>
            <span style={{ fontWeight: 800 }}>{c.name}</span>
            <span style={{ ...monoSmall, color: MUTED_TEXT }}>{c.role}</span>
            <Swatch color={c.light} text={c.lightT} />
            <Swatch color={c.dark} text={c.darkT} />
            <span style={{ fontSize: 13, color: MUTED_TEXT, textWrap: 'pretty' }}>{c.use}</span>
          </div>
        ))}
      </RuledList>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 40 }}>
        <Block title="Boşluk">
          {spacing.map((s) => (
            <div key={s.t} style={{ display: 'grid', gridTemplateColumns: '80px 40px 1fr', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: ROW_LINE, fontSize: 14 }}>
              <span style={monoSmall}>{s.t}</span>
              <span style={{ fontWeight: 800 }}>{s.v}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ height: 12, width: s.v, background: '#ec3013', flex: 'none' }} />
                <span style={{ fontSize: 13, color: MUTED_TEXT }}>{s.use}</span>
              </span>
            </div>
          ))}
        </Block>
        <Block title="Radius, çizgi, hareket">
          {misc.map((m) => (
            <div key={m.k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, padding: '8px 0', borderBottom: ROW_LINE, fontSize: 14 }}>
              <span>{m.k}</span>
              <span style={{ fontWeight: 800, textAlign: 'right' }}>{m.v}</span>
            </div>
          ))}
        </Block>
        <Block title="Tipografi · Archivo">
          {typeScale.map((t) => (
            <div key={t.spec} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'baseline', padding: '8px 0', borderBottom: ROW_LINE }}>
              <span style={{ fontSize: t.size, fontWeight: t.w, lineHeight: 1.2 }}>{t.sample}</span>
              <span style={{ fontSize: 12, color: MUTED_TEXT, whiteSpace: 'nowrap' }}>{t.spec}</span>
            </div>
          ))}
        </Block>
      </div>
    </Section>
  );
}
