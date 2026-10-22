import { ACCENT_DARK, DIVIDER, OVERLINE } from '../ui';

const NAV = [
  ['#s1', '01 Etkileşimli prototip'],
  ['#s2', '02 Ekranlar ve durumlar'],
  ['#s3', '03 Kullanıcı akışları'],
  ['#s4', '04 Tablet ve masaüstü'],
  ['#s5', '05 Bilgi mimarisi'],
  ['#s6', '06 Etkileşim kuralları'],
  ['#s7', '07 Tasarım tokenları'],
  ['#s8', '08 Kritik UX kararları'],
];

export default function Header() {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 0, borderBottom: DIVIDER }}>
      <div style={{ padding: '40px 40px 32px', display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
        <div style={{ ...OVERLINE, color: ACCENT_DARK }}>Ürün tasarımı · v1 · mobil öncelikli</div>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.015em' }}>Arazi Parsel Editörü</h1>
        <p style={{ margin: 0, maxWidth: 640, textWrap: 'pretty' }}>
          Bir ana arazi sınırı içinde parselleri oluşturmak ve sınırlarını dokunarak düzenlemek için harita merkezli editör. Aşağıdaki telefon çerçeveleri gerçek etkileşimlidir: köşe ve sınır sürükleme, bölme, birleştirme, geri alma ve 2D/3D geçişi çalışır.
        </p>
      </div>
      <nav style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 0, borderLeft: DIVIDER, fontSize: 14 }}>
        {NAV.map(([href, label], i) => (
          <a key={href} href={href} style={{ padding: '6px 0', borderBottom: i < NAV.length - 1 ? '1px solid rgba(32,30,29,0.25)' : undefined, textDecoration: 'none', color: '#201e1d' }}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
