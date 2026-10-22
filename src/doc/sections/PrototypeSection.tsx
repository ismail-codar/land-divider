import { PhoneFrame, ROW_LINE, RuledList, Section, SectionHead } from '../ui';

const GUIDE = [
  ['Seç', 'Parsele, sınıra ya da köşeye dokunun. Öncelik köşe → sınır → parsel. Boş alanda sürükleme haritayı kaydırır.'],
  ['Köşe sürükle', 'İç köşeyi tutup taşıyın; komşu parsellerin alan farkı etiketlerde canlı görünür. Dış sınırdaki köşeler sınır boyunca kayar.'],
  ['Sınır sürükle', 'İç sınırı tutun; kendi eksenine dik yönde taşınır. Seçili sınırın ortasındaki tutamaç ince çizgiyi yakalamayı kolaylaştırır.'],
  ['Geçersiz hareket', 'Bir köşeyi karşı sınırın ötesine çekin: gerçek köşe son geçerli yerde kalır, parmağı hayalet köşe izler, kısa bir uyarı çıkar.'],
  ['Böl', 'Parsel seçin → Böl → iki sınır noktası. Noktalar en yakın sınıra yapışır ve sürüklenebilir. Önizleme yeni alanları gösterir.'],
  ['Birleştir', 'Ortak sınırı seçin → Parselleri Birleştir → onay. Geri alınabilir.'],
  ['Köşe ekle', 'Köşe aracında sınıra dokunun ya da sınır seçip "Köşe ekle" ile tutamacı konumlandırın.'],
  ['Alt sayfa', 'Tutamacı sürükleyin ya da başlığa dokunun: kapalı → yarım → açık.'],
  ['2D / 3D', 'Sağ üstteki anahtar. 3D’de sürükleme yörünge döndürür, seçim korunur; düzenleme 2D’de yapılır.'],
];

export default function PrototypeSection() {
  return (
    <Section id="s1" label="01 Prototip" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 56, alignItems: 'flex-start' }}>
      <PhoneFrame scenario="idle" style={{ flex: 'none', boxShadow: '0 0 0 10px #201e1d,0 24px 48px -16px rgba(45,43,43,0.4)', margin: 10 }} />
      <div style={{ flex: 1, minWidth: 300, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHead
          n="01"
          title="Etkileşimli mobil prototip"
          intro="9 parselli örnek arazi, 18.500 m². Fare ile tek parmak, trackpad pinch (ya da Ctrl + tekerlek) ile iki parmak davranışı denenebilir. Dokunmatik cihazda gerçek pinch çalışır."
        />
        <RuledList>
          {GUIDE.map(([k, v], i) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, padding: '12px 0', borderBottom: i < GUIDE.length - 1 ? ROW_LINE : undefined }}>
              <strong>{k}</strong>
              <span>{v}</span>
            </div>
          ))}
        </RuledList>
      </div>
    </Section>
  );
}
