import { screens } from '../data';
import { ACCENT_DARK, DIVIDER, MUTED_TEXT, PhoneFrame, Section, SectionHead } from '../ui';

export default function ScreensSection() {
  return (
    <Section id="s2" style={{ gap: 32 }}>
      <SectionHead n="02" title="Ekranlar ve durumlar" intro="Her çerçeve ilgili durumda açılır ve etkileşime devam edilebilir. Numaralar akışlarda referans olarak kullanılır." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '56px 40px' }}>
        {screens.map((s) => (
          <div key={s.id} id={s.id} data-screen-label={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 410 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', borderTop: DIVIDER, paddingTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT_DARK, minWidth: 24 }}>{s.n}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: MUTED_TEXT, textWrap: 'pretty' }}>{s.note}</div>
              </div>
            </div>
            <PhoneFrame scenario={s.sc} style={{ boxShadow: '0 0 0 10px #201e1d', margin: '0 10px 10px' }} />
          </div>
        ))}
      </div>
    </Section>
  );
}
