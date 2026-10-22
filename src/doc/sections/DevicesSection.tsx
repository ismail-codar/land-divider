import type { ReactNode } from 'react';
import { ACCENT_DARK, DeviceFrame, DIVIDER, MUTED_TEXT, Section, SectionHead } from '../ui';

function Caption({ code, title, note, maxWidth }: { code: string; title: string; note: string; maxWidth?: number }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', borderTop: DIVIDER, paddingTop: 10, maxWidth }}>
      <strong style={{ color: ACCENT_DARK }}>{code}</strong>
      <strong>{title}</strong>
      <span style={{ color: MUTED_TEXT, fontSize: 14 }}>{note}</span>
    </div>
  );
}

function Column({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>;
}

export default function DevicesSection() {
  return (
    <Section id="s4" style={{ gap: 40 }}>
      <SectionHead
        n="04"
        title="Tablet ve masaüstü"
        maxWidth={760}
        intro="Aynı içerik, aynı bileşenler. Mobildeki alt sayfa geniş ekranda sağ detay paneline dönüşür; araçlar tablet yatayda başparmak erişimi için sol kenarda dikey şerit, masaüstünde üst çubukta. Dikey tablet mobil düzeni kullanır."
      />
      <Column>
        <Caption code="T1" title="Tablet yatay · 1180 × 820" note="Canvas %71 · panel %29 · sol araç şeridi · kalem hassas isabet alanı" maxWidth={1180} />
        <div style={{ overflowX: 'auto', padding: 12 }}>
          <DeviceFrame label="T1 Tablet yatay" device="tablet" scenario="parcel" width={1180} height={820} style={{ borderRadius: 28, boxShadow: '0 0 0 12px #201e1d' }} />
        </div>
      </Column>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
        <Column>
          <Caption code="T2" title="Tablet dikey · 820 × 1180" note="Mobil alt sayfa, 600 px genişlik" />
          <div style={{ padding: 12 }}>
            <DeviceFrame label="T2 Tablet dikey" device="tabletPortrait" scenario="edge" width={820} height={1180} style={{ borderRadius: 28, boxShadow: '0 0 0 12px #201e1d' }} />
          </div>
        </Column>
      </div>
      <Column>
        <Caption code="D1" title="Masaüstü · 1440 × 900" note="Üst araç çubuğu · sağ tık bağlam menüsü · tekerlek yakınlaştırma · hover imleçleri" maxWidth={1440} />
        <div style={{ overflowX: 'auto', padding: 4 }}>
          <DeviceFrame label="D1 Masaüstü" device="desktop" scenario="edge" width={1440} height={900} style={{ border: '2px solid #201e1d' }} />
        </div>
      </Column>
    </Section>
  );
}
