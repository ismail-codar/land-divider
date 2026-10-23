import { getRouteApi, Link, useRouter } from '@tanstack/react-router';
import { useRef, useState, type ChangeEvent } from 'react';
import { ACC, BG, INK, INK2, LINE } from '../editor/constants';
import Icon from '../editor/components/Icon';
import { fDn } from '../editor/format';
import { readImport } from '../editor/io';
import { createLand } from '../data/lands';

const landsApi = getRouteApi('/lands');
const overline = { fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK2 } as const;

/** Level 0 of the IA: the land (project) list. Uses the editor's visual language. */
export default function LandsPage() {
  const lands = landsApi.useLoaderData();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  // Adds each picked PDF to the list; bad files are reported, the rest still import.
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    const ok: string[] = [], bad: string[] = [];
    for (const f of files) {
      try {
        const r = await readImport(f);
        createLand(r.name, r.land);
        ok.push(r.name);
      } catch (err) {
        bad.push(f.name + ': ' + (err instanceof Error ? err.message : 'Dosya okunamadı'));
      }
    }
    if (ok.length) await router.invalidate();
    setMsg({ text: [ok.length ? ok.length + ' arazi içe aktarıldı' : '', ...bad].filter(Boolean).join(' · '), bad: bad.length > 0 });
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: 'Archivo,system-ui,sans-serif', fontSize: 14, lineHeight: 1.35 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '2px solid ' + LINE }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Araziler</div>
          <div style={{ fontSize: 12, color: INK2 }}>{lands.length} arazi</div>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...overline, paddingBottom: 6, borderBottom: '2px solid ' + LINE }}>Arazi listesi</div>
          {!lands.length && (
            <div style={{ padding: '16px 0', color: INK2, borderBottom: '1px solid rgba(32,30,29,0.25)' }}>Henüz arazi yok. Yeni bir arazi çizin veya dışa aktarılmış bir PDF'i içe aktarın.</div>
          )}
          {lands.map((l) => (
            <Link key={l.id} to="/lands/$landId" params={{ landId: l.id }} className="hv-ink05" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, borderBottom: '1px solid rgba(32,30,29,0.25)', textDecoration: 'none', color: INK }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: INK2, fontVariantNumeric: 'tabular-nums' }}>Ada 214 · {l.model.parcels.length} parsel · {fDn(l.model.landArea)}</div>
              </div>
              <Icon name="icon-chevron-right" size={18} style={{ color: INK2 }} />
            </Link>
          ))}
        </div>
        <Link to="/lands/new" className="ac-accent" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px', background: ACC, color: BG, fontWeight: 800, textDecoration: 'none' }}>
          <Icon name="icon-file-plus" size={18} />Yeni arazi
        </Link>
        <div onClick={() => fileRef.current?.click()} className="ac-ink08" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px', border: '1px solid ' + LINE, fontWeight: 800, cursor: 'pointer', marginTop: -16 }}>
          <Icon name="icon-upload" size={18} />İçe aktar
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: INK2 }}>Dışa aktarılmış PDF</span>
        </div>
        <input ref={fileRef} type="file" multiple accept=".pdf,application/pdf" onChange={onFiles} style={{ display: 'none' }} />
        {msg && <div role="status" style={{ fontSize: 13, color: msg.bad ? ACC : INK2, marginTop: -12 }}>{msg.text}</div>}
        <Link to="/design" style={{ fontSize: 13, color: INK2 }}>Tasarım dokümanı</Link>
      </div>
    </div>
  );
}
