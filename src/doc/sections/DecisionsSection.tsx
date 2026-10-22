import { decisions } from '../data';
import { ACCENT_DARK, Card, CardGrid, Section, SectionHead } from '../ui';

export default function DecisionsSection() {
  return (
    <Section id="s8" last style={{ gap: 32 }}>
      <SectionHead n="08" title="Kritik UX kararları" />
      <CardGrid min={340}>
        {decisions.map((d) => (
          <Card key={d.n} gap={8}>
            <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT_DARK }}>{d.n}</div>
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{d.title}</div>
            <div style={{ fontSize: 14, textWrap: 'pretty' }}>{d.why}</div>
          </Card>
        ))}
      </CardGrid>
    </Section>
  );
}
