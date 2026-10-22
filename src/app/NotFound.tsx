import { Link } from '@tanstack/react-router';
import { BG, INK, INK2 } from '../editor/constants';

export default function NotFound({ what = 'Sayfa' }: { what?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: 'Archivo,system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420, borderTop: '2px solid ' + INK, paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK2 }}>404</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{what} bulunamadı</div>
        <Link to="/lands" style={{ fontWeight: 800 }}>Arazi listesine dön</Link>
      </div>
    </div>
  );
}
