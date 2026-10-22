// Static content of the design document page.
import type { Scenario } from '../editor/types';

export interface ScreenSpec { id: string; n: string; label: string; sc: Scenario; title: string; note: string }

const SCREENS: [Scenario, string, string][] = [
  ['idle', 'Ana editör', 'Canvas tam ekran; alt sayfa kapalı durumda arazi özetini gösterir.'],
  ['parcel', 'Parsel seçili', 'Hafif dolgu + vurgu çizgisi. Alt sayfa yarım: mevcut / hedef / fark.'],
  ['edge', 'Sınır seçili', 'Kalın çizgi, ortada tutamaç ve dik yön okları. İki taraftaki parseller listelenir.'],
  ['vertex', 'Köşe seçili', 'Tutamaç büyür; bağlı sınırlar ve parseller alt sayfada.'],
  ['vdrag', 'Köşe sürükleme', 'Bağlı sınırlar vurgulu, parmak üstünde yer değiştirme göstergesi, alan farkları canlı.'],
  ['invalid', 'Geçersiz köşe sürükleme', 'Gerçek köşe son geçerli yerde; taralı hayalet köşe ve kısa uyarı.'],
  ['edrag', 'Sınır sürükleme', 'Eksene dik kılavuz, iki parselin alan değişimi etiketlerde ve alt sayfada.'],
  ['split1', 'Bölme modu', 'Mod çubuğu adım gösterir; parsel sınırındaki köşeler yapışma hedefi.'],
  ['split2', 'Bölme önizleme', 'Kesikli önizleme, yeni alanlar, İptal / Parseli Böl.'],
  ['sheetFull', 'Alt sayfa açık', 'Hissedar, pay, hedef, kullanım ve komşular; canvas üstte görünür kalır.'],
  ['3d', '3D görünüm', 'Aynı seçim, hafif yükseltilmiş parseller; sürükleme döndürür.'],
  ['more', 'Diğer işlemler', 'Alt sayfa listesi; silme boşluk bırakacağı için gerekçesiyle pasif.'],
  ['undo', 'Geri alma bildirimi', 'Kısa bildirim ve İleri Al; kalıcı modal yok.'],
  ['locked', 'Kilitli sınır', 'Kesikli çizgi, kilit etiketi, tutamaç yok, nedeni açık.'],
  ['merge', 'Birleştirme onayı', 'Hafif alt kart; yeni alan ve geri alınabilirlik belirtilir.'],
  ['addv', 'Sınıra köşe ekleme', 'Önizleme tutamacı sınır boyunca kayar, parça uzunlukları üstte.'],
  ['empty', 'Boş durum', 'Arazi Çiz ya da Dosyadan İçe Aktar.'],
  ['draw', 'Arazi çizme', 'Her köşe için dokunma; ilk noktaya dokununca kapanır.'],
];

export const screens: ScreenSpec[] = SCREENS.map(([sc, title, note], i) => {
  const n = String(i + 1).padStart(2, '0');
  return { id: 'e' + n, n, label: n + ' ' + title, sc, title, note };
});

export interface FlowStep { i: string; t: string; ref: string; href: string }
export interface Flow { n: string; title: string; steps: FlowStep[] }

const flow = (n: string, title: string, steps: [string, string][]): Flow => ({
  n, title, steps: steps.map(([t, r], i) => ({ i: String(i + 1), t, ref: r || '', href: r ? '#e' + r : '' })),
});

export const flows: Flow[] = [
  flow('Akış 1', 'Araziyi aç → parsel seç → alanını incele', [['Editör araziye sığdırılmış açılır; özet alt sayfada', '01'], ['Parsele dokun: vurgu + alt sayfa yarım', '02'], ['Hedef, mevcut ve fark okunur; çubuk hedef çizgisine göre', ''], ['Alt sayfayı yukarı çek: tüm bilgiler', '10']]),
  flow('Akış 2', 'Köşe seç → sürükle → izle → bırak → geri al', [['Köşeye dokun, tutamaç büyür', '04'], ['Tut ve sürükle; harita kaymaz, alanlar canlı', '05'], ['Geçersiz bölgeye girersen hayalet köşe ve uyarı', '06'], ['Bırak: son geçerli konum kaydedilir', ''], ['Üst çubuktan Geri Al → bildirim + İleri Al', '13']]),
  flow('Akış 3', 'Sınır seç → sürükle → iki parselin değişimini izle', [['Sınıra dokun: kalın çizgi + tutamaç', '03'], ['Tutamaçtan ya da çizgiden sürükle; dik yönde hareket', '07'], ['İki parselin alan farkı etiket ve alt sayfada', ''], ['Bırak; Geri Al her zaman üst çubukta', '']]),
  flow('Akış 4', 'Sınır seç → köşe ekle → yeni köşeyi sürükle', [['Sınırı seç', '03'], ['Alt sayfada Köşe ekle', '16'], ['Önizleme tutamacını sınır boyunca konumla, Ekle', ''], ['Yeni köşe seçili gelir; hemen sürüklenebilir', '04']]),
  flow('Akış 5', 'Parsel seç → Böl → başlangıç → bitiş → önizleme → onay', [['Parsel seç, Böl', '02'], ['“İlk sınır noktasını seç”', '08'], ['“İkinci sınır noktasını seç”', ''], ['Önizleme: geçerliyse vurgu rengi, değilse uyarı + neden', '09'], ['Parseli Böl; yeni parsel seçili gelir, bildirimde Geri Al', '']]),
  flow('Akış 6', 'Ortak sınır seç → Parselleri Birleştir → onay', [['İki parsel arasındaki sınırı seç', '03'], ['Parselleri Birleştir', '15'], ['Onay kartı: yeni alan, geri alınabilir', ''], ['Birleşik parsel seçili gelir; bildirimde Geri Al', '']]),
  flow('Akış 7', '2D → 3D → yörünge → tekrar 2D', [['Sağ üstte 3D; aynı kamera merkezi', '11'], ['Tek parmak sürükleme yörünge (yatay: dönüş, dikey: eğim)', ''], ['Parsele dokununca seçim ve alt sayfa aynı', ''], ['2D’ye dön; seçim korunur', '02']]),
  flow('Akış 8', 'Mobil: pinch zoom → pan → köşe düzenleme', [['İki parmak: pinch; odak parmakların ortası', ''], ['Bir parmak kalırsa sıçramadan pan’e devam', ''], ['Köşeye dokun ve sürükle', '05'], ['Sürüklerken ikinci parmak gelirse düzenleme iptal, köşe başlangıca döner, pinch başlar', '']]),
];

export const ia = [
  { level: 'Seviye 0', title: 'Projeler', items: ['Arazi listesi', 'Yeni arazi → Boş durum', 'Arazi Çiz / Dosyadan İçe Aktar'] },
  { level: 'Seviye 1', title: 'Editör (tek yüzey)', items: ['Üst çubuk: geri, arazi adı, Geri Al, İleri Al, proje menüsü', 'Canvas: parseller, sınırlar, köşeler, etiketler', 'Canvas kontrolleri: 2D/3D, Araziye sığdır, ölçek', 'Araç çubuğu: Seç, Köşe, Böl, Görünüm, Daha'] },
  { level: 'Seviye 2 · bağlamsal', title: 'Alt sayfa / detay paneli', items: ['Seçim yok: arazi özeti + parsel listesi', 'Parsel: alan, hedef, fark, hissedar, işlemler', 'Sınır: uzunluk, iki taraf, birleştir, köşe ekle', 'Köşe: bağlı parseller, kaldır', 'Mod: bölme adımları, köşe ekleme, arazi çizme'] },
  { level: 'Seviye 3 · geçici', title: 'Katmanlar', items: ['Diğer işlemler (alt sayfa liste / sağ tık menüsü)', 'Birleştirme onayı', 'Bildirim: Geri Al / İleri Al', 'Uyarı çipi: geçersiz hareket nedeni'] },
  { level: 'Veri', title: 'Parsel kaydı', items: ['No, ad, hissedar, pay %', 'Hedef alan (pay × arazi)', 'Mevcut alan m² + dönüm', 'Kullanım, yükseklik (3D)', 'Komşular, köşe sayısı, çevre'] },
];

export const gestures = [
  { from: 'Boşta → basış', to: 'Bekleme. Hedef, basış noktasında isabet testiyle belirlenir (köşe → sınır → parsel).' },
  { from: 'Bekleme → bırak (< 8 px)', to: 'Dokunma: seçim. Boş alan seçimi kaldırır.' },
  { from: 'Bekleme → 500 ms sabit', to: 'Uzun basış: seçim + bağlam listesi alt sayfada (mobil).' },
  { from: 'Bekleme → hareket, hedef köşe', to: 'Köşe sürükleme. Tutma ofseti korunur, köşe parmağa zıplamaz. Pan kilitli.' },
  { from: 'Bekleme → hareket, hedef sınır', to: 'Sınır sürükleme, eksene dik. Pan kilitli.' },
  { from: 'Bekleme → hareket, diğer', to: 'Pan (3D’de yörünge).' },
  { from: 'Herhangi → 2. parmak', to: 'Pinch. Aktif düzenleme iptal edilir, geometri başlangıca döner.' },
  { from: 'Pinch → tek parmak kalır', to: 'Kalan parmağın konumundan pan; harita sıçramaz.' },
  { from: 'Sürükleme → geçersiz konum', to: 'Gerçek geometri son geçerli durumda kalır, hayalet parmağı izler; bırakınca hayalet kaybolur.' },
  { from: 'Sabit hedef → sürükleme', to: 'Hareket yok, kısa ipucu: “Arazi köşesi sabit”.' },
];

export const thresholds = [
  { k: 'Köşe isabet yarıçapı · parmak', v: '24 px (48 px alan)' },
  { k: 'Köşe isabet yarıçapı · fare / kalem', v: '12 px' },
  { k: 'Sınır isabet bandı · parmak / fare', v: '18 / 8 px' },
  { k: 'Sürükleme başlama eşiği · parmak / fare', v: '8 / 4 px' },
  { k: 'Uzun basış', v: '500 ms' },
  { k: 'Köşe görseli · normal / seçili / sürüklenen', v: '8 / 16 / 18 px' },
  { k: 'Sınır tutamacı', v: '18 px + 44 px isabet' },
  { k: 'Minimum dokunma hedefi', v: '44 × 44 px' },
  { k: 'Araç çubuğu öğesi', v: '≥ 56 × 58 px' },
  { k: 'Minimum parsel alanı', v: '60 m²' },
  { k: 'Dış sınır köşesi kayma sınırı', v: 'kenarın %2–98’i' },
  { k: 'Yakınlaştırma aralığı', v: '0,4 – 40 px/m' },
];

export const errors = [
  { bad: 'Face winding invalid', good: 'Bu konum parseli geçersiz hale getiriyor.' },
  { bad: 'Segment intersection detected', good: 'Sınırlar birbirini kesemez.' },
  { bad: 'Area <= EPSILON', good: 'Parsel alanı çok küçüldü.' },
  { bad: 'Split chord outside polygon', good: 'Bölme çizgisi parselin dışına taşıyor.' },
  { bad: 'Collinear split endpoints', good: 'Noktalar aynı sınır üzerinde olamaz.' },
  { bad: 'Vertex degree > 2', good: 'Birden fazla sınırı bağlayan köşe kaldırılamaz.' },
  { bad: 'Delete creates hole', good: 'Silmek boşluk bırakır — komşu parselle birleştirin.' },
];

export interface ColorToken { name: string; role: string; light: string; dark: string; use: string; lightT: string; darkT: string }

const color = (name: string, role: string, light: string, dark: string, use: string, lightT?: string, darkT?: string): ColorToken =>
  ({ name, role, light, dark, use, lightT: lightT || light, darkT: darkT || dark });

export const colors: ColorToken[] = [
  color('Background', '--color-wash', '#f3f2f2', '#151413', 'Uygulama zemini, çubuklar, paneller'),
  color('Canvas', '--map-canvas (domain)', '#e3e0e0', '#1c1b1a', 'Arazi dışı harita zemini + 10 m ızgara'),
  color('Surface', '--color-background-surface', '#f8f6f6', '#1f1d1c', 'Parsel dolgusu (3 ton dönüşümlü)'),
  color('SurfaceSecondary', '--color-muted', '#eae9e9', '#2a2827', 'Kilit bandı, pasif kutular'),
  color('TextPrimary', '--color-text-primary', '#201e1d', '#eeeaea', 'Metin, dış sınır, sabit köşe'),
  color('TextSecondary', '--color-text-secondary', '#605d5d', '#bab6b6', 'Etiket adları, açıklamalar'),
  color('Border', '--color-border', 'rgba(32,30,29,0.4)', 'rgba(238,234,234,0.35)', '2px bölücüler, iç sınırlar', 'ink 40%', 'on-dark 35%'),
  color('Primary', '--color-accent', '#ec3013', '#ff563c', 'Birincil aksiyon, aktif araç, seçim'),
  color('PrimaryHover', '--color-accent-600', '#dd2b0f', '#ff9783', 'Hover; basılı: accent-700 #ae1800'),
  color('Selected', '--color-accent-muted', '#fff2ef', 'rgba(255,86,60,0.16)', 'Seçili parsel dolgusu, aktif araç zemini', 'accent-100', 'accent 16%'),
  color('Valid', '--color-positive', '#1f6b43', '#5fbf8a', '“Hedefte”, alan artışı + işaret'),
  color('Warning', '--color-warning', '#8a5200', '#f2b25c', 'Hedeften sapma, alan azalışı + ok'),
  color('Danger', '--color-negative', '#7c1405', '#ff9783', 'Geçersiz: taralı hayalet + kesikli çizgi + ikon', 'accent-800', 'accent-400'),
  color('Locked', '--color-text-disabled', '#7d7979', '#7d7979', 'Kilitli / pasif; her zaman kilit ikonu + etiket'),
];

export const spacing = [
  { t: '--space-1', v: 4, use: 'İkon–metin' },
  { t: '--space-2', v: 8, use: 'Buton aralığı' },
  { t: '--space-3', v: 12, use: 'Canvas kenar boşluğu' },
  { t: '--space-4', v: 16, use: 'Panel iç boşluğu' },
  { t: '--space-6', v: 24, use: 'Blok arası' },
  { t: '--space-8', v: 32, use: 'Bölüm arası' },
];

export const misc = [
  { k: 'Radius · tüm UI (Modernist)', v: '0' },
  { k: 'Radius · harita tutamaçları', v: 'tam daire' },
  { k: 'Sabit köşe', v: 'kare (şekille ayrışır)' },
  { k: 'Bölücü', v: '2 px ink 40%' },
  { k: 'Dış sınır / iç sınır', v: '3 / 1,5 px' },
  { k: 'Seçili sınır', v: '4,5 px + 14 px hale' },
  { k: 'Kilitli sınır', v: '4 px, 8-5 kesikli' },
  { k: 'Hareket · hızlı (seçim, tutamaç)', v: '175 ms' },
  { k: 'Hareket · orta (alt sayfa, sığdır)', v: '410 ms' },
  { k: '2D ↔ 3D geçişi', v: '520 ms ease-out' },
  { k: 'Azaltılmış hareket', v: '0 ms' },
  { k: 'Gölge · kontroller / katmanlar', v: 'sm / lg' },
];

export const typeScale = [
  { size: 32, w: 800, sample: 'Karaağaç Arazisi', spec: 'Başlık 32 / 800' },
  { size: 18, w: 800, sample: 'Parsel 12 · 2.055 m²', spec: 'Panel başlığı 18 / 800' },
  { size: 15, w: 400, sample: 'Metin ve liste satırları', spec: 'Gövde 15 / 400' },
  { size: 14, w: 800, sample: 'Buton etiketi', spec: 'Aksiyon 14 / 800' },
  { size: 12, w: 800, sample: 'P12 · AY', spec: 'Harita etiketi 12 / 800' },
  { size: 12, w: 600, sample: 'HEDEF ALAN', spec: 'Üst etiket 12 / 600 · 0,08em' },
];

const decision = (n: string, title: string, why: string) => ({ n, title, why });

export const decisions = [
  decision('K1', 'Geçersiz hareket durdurulur, geri sarılmaz', 'Gerçek geometri her karede geçerli kalır; parmak geçersiz bölgeye girince yalnızca hayalet köşe onu izler. Bırakıldığında hiçbir şey zıplamaz, çünkü ekrandaki son geçerli durum zaten kayıtlı durumdur.'),
  decision('K2', 'Topoloji paylaşılan köşelerle kurulur', 'Her köşe tek kayıttır ve komşu parseller onu paylaşır. Boşluk ve üst üste binme bu yüzden yapısal olarak oluşamaz; kullanıcı kural görmez, yalnızca doğal olarak engellenen hareket görür.'),
  decision('K3', 'Dış sınırdaki köşeler sınır boyunca kayar', 'İç bölme çizgisini dış kenar üzerinde kaydırmak en sık düzeltmedir. Köşeyi kenara bağlamak, dış sınırı bozmadan bunu tek hareketle yapar.'),
  decision('K4', 'Alt sayfa, geniş ekranda sağ panel', 'Aynı içerik ve sıra iki yerde de geçerli; kullanıcı cihaz değiştirdiğinde yeniden öğrenmez. Alt sayfa en fazla canvas’ın alt kısmını kaplar, geometri üstte görünür kalır.'),
  decision('K5', 'Görsel küçük, isabet alanı büyük', 'Köşe 8 px çizilir ama 48 px alandan yakalanır; sınır ince çizilir ama 36 px bantta seçilir. Kalem ve fare daha dar alan kullanır.'),
  decision('K6', 'Sürükleme doğrudan başlar', 'Önce seçip sonra sürükleme zorunlu değil; köşeyi ya da sınırı tutup hareket ettirmek yeterli. Seçim, sürüklemenin yan etkisi olarak gelir.'),
  decision('K7', 'Kalıcı modal yerine bildirim + Geri Al', 'Tüm düzenleme işlemleri geri alınabilir olduğu için yalnızca birleştirmede hafif bir onay kartı var. Geri Al üst çubukta ve bildirimde.'),
  decision('K8', 'Bölme noktaları en yakın sınıra yapışır', 'Kullanıcı sınıra tam isabet etmek zorunda değil; parsel içinde herhangi bir yere dokunmak en yakın sınır noktasını seçer. Mevcut köşeler 22 px içinde önceliklidir.'),
  decision('K9', 'Renk tek başına anlam taşımaz', 'Seçim: dolgu + çizgi + büyüyen tutamaç. Geçersiz: tarama + kesikli çizgi + uyarı ikonu + metin. Kilit: kesikli çizgi + kilit ikonu + “Sabit sınır”. Hedef farkı: işaret ve ok.'),
  decision('K10', '3D görselleştirmedir, düzenleme 2D’de', '3D’de düzenleme araçları kilitlenir ve nedeni söylenir; seçim, kamera merkezi ve panel korunur. Geçiş ayrı bir ekran değil, aynı sahnenin eğilmesidir.'),
  decision('K11', 'Tek vurgu rengi: seçim ve birincil aksiyon', 'Modernist sistem tek vurgu kullanır. Geçersiz durum ayrı bir kırmızı yerine koyu vurgu tonu (accent-800) ve tarama deseni kullanır, böylece seçimle karışmaz.'),
  decision('K12', 'Etiketlerde yalnızca no + baş harf', '“P12 · AY” ve alan haritada yeterli. Tam isim, pay ve hedef detay panelinde; küçük parsellerde önce alan, sonra ad gizlenir.'),
];
