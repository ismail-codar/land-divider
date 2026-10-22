import { ACC, BG, INK, INK2, LINE } from '../constants';
import Icon from './Icon';

/** "New land" card shown on the empty canvas. */
export default function EmptyState({ onDraw, onImport }: { onDraw: () => void; onImport: () => void }) {
  const btn = { display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px', fontWeight: 800, cursor: 'pointer' } as const;
  return (
    <div style={{ position: 'absolute', left: 24, right: 24, top: '50%', transform: 'translateY(-60%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 24, background: BG, borderTop: '2px solid ' + INK, maxWidth: 420, margin: '0 auto' }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK2 }}>Yeni arazi</div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, textWrap: 'pretty' }}>Arazi sınırı oluşturun veya içe aktarın</div>
      <div style={{ fontSize: 14, color: INK2, textWrap: 'pretty' }}>Köşelere dokunarak dış sınırı çizin ya da tapu / KML / DXF dosyası yükleyin.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div onClick={onDraw} className="ac-accent" style={{ ...btn, background: ACC, color: BG }}>
          <Icon name="icon-pen-tool" size={18} />Arazi Çiz
        </div>
        <div onClick={onImport} className="ac-ink08" style={{ ...btn, border: '1px solid ' + LINE }}>
          <Icon name="icon-upload" size={18} />Dosyadan İçe Aktar
        </div>
      </div>
    </div>
  );
}
