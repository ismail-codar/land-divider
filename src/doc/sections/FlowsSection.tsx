import { flows } from '../data';
import { ACCENT_DARK, Card, CardGrid, MUTED_TEXT, OVERLINE, ROW_LINE_LIGHT, Section, SectionHead } from '../ui';

export default function FlowsSection() {
  return (
    <Section id="s3" style={{ gap: 32 }}>
      <SectionHead n="03" title="Kullanıcı akışları" />
      <CardGrid min={340}>
        {flows.map((f) => (
          <Card key={f.n} gap={12}>
            <div style={{ ...OVERLINE, color: ACCENT_DARK }}>{f.n}</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{f.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {f.steps.map((st) => (
                <div key={st.i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 8, alignItems: 'baseline', padding: '7px 0', borderBottom: ROW_LINE_LIGHT }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: MUTED_TEXT }}>{st.i}</span>
                  <span style={{ fontSize: 14, textWrap: 'pretty' }}>{st.t}</span>
                  {st.ref && (
                    <a href={st.href} style={{ fontSize: 12, fontWeight: 800, textDecoration: 'none', padding: '1px 6px', background: '#fff2ef', color: ACCENT_DARK }}>{st.ref}</a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </CardGrid>
    </Section>
  );
}
