import { ia } from '../data';
import { Card, CardGrid, MUTED_TEXT, OVERLINE, ROW_LINE_LIGHT, Section, SectionHead } from '../ui';

export default function InfoArchSection() {
  return (
    <Section id="s5" style={{ gap: 32 }}>
      <SectionHead n="05" title="Bilgi mimarisi" intro="Tek ana yüzey: editör. Diğer her şey canvas’ın üstünde geçici katman olarak açılır ve kapandığında kullanıcıyı aynı görünüme bırakır." />
      <CardGrid min={240} fill="auto-fit">
        {ia.map((c) => (
          <Card key={c.title} gap={8}>
            <div style={{ ...OVERLINE, color: MUTED_TEXT }}>{c.level}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{c.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {c.items.map((i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: ROW_LINE_LIGHT, fontSize: 14, textWrap: 'pretty' }}>{i}</div>
              ))}
            </div>
          </Card>
        ))}
      </CardGrid>
    </Section>
  );
}
