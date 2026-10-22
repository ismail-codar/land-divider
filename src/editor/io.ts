// Land import / export as a PDF sheet that also carries the project data (embedded JSON file), so it round-trips losslessly.
import { ACC, FILLS, INK, INK2 } from './constants';
import { fA, fDn } from './format';
import { cen, pts, sArea, validate } from './geometry';
import type { BgImage, LandModel, Parcel, VertexConstraint, Verts } from './types';

const FORMAT = 'land-divider';
const VERSION = 1;
export const PROJECT_EXT = '.arazi.json';

interface ProjectFile { format: typeof FORMAT; version: number; name: string; land: LandModel }

/** Serializes the land (with its background image) as a project file. */
export function toProject(name: string, land: LandModel): string {
  const f: ProjectFile = { format: FORMAT, version: VERSION, name, land: { ...land, bg: land.bg ?? null } };
  return JSON.stringify(f, null, 1);
}

class ImportError extends Error {}
function fail(msg: string): never {
  throw new ImportError(msg);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, what: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(what + ' sayı değil'));
const str = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def);

function readVerts(raw: unknown): Verts {
  if (!isObj(raw)) fail('Köşe listesi eksik');
  const V: Verts = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isObj(v)) fail('Köşe ' + id + ' geçersiz');
    const o = v as Record<string, unknown>;
    let c: VertexConstraint = null;
    if (o.c === 'fixed') c = 'fixed';
    else if (Array.isArray(o.c) && o.c.length === 2 && o.c.every((x) => typeof x === 'string')) c = [o.c[0], o.c[1]];
    else if (o.c != null) fail('Köşe ' + id + ' kısıtı geçersiz');
    V[id] = { x: num(o.x, 'Köşe ' + id + ' x'), y: num(o.y, 'Köşe ' + id + ' y'), c };
  }
  return V;
}

function readRing(raw: unknown, V: Verts, what: string): string[] {
  if (!Array.isArray(raw) || raw.length < 3) fail(what + ' en az 3 köşe içermeli');
  const r = raw as unknown[];
  if (!r.every((id) => typeof id === 'string' && V[id])) fail(what + ' tanımsız köşeye başvuruyor');
  if (new Set(r).size !== r.length) fail(what + ' aynı köşeyi iki kez içeriyor');
  return r as string[];
}

function readParcels(raw: unknown, V: Verts): Parcel[] {
  if (!Array.isArray(raw) || !raw.length) fail('Parsel listesi boş');
  const ids = new Set<string>();
  return (raw as unknown[]).map((p, i) => {
    if (!isObj(p)) fail((i + 1) + '. parsel geçersiz');
    const o = p as Record<string, unknown>, id = str(o.id);
    if (!id || ids.has(id)) fail((i + 1) + '. parselin kimliği eksik veya tekrarlı');
    ids.add(id);
    const n = typeof o.num === 'number' && Number.isInteger(o.num) ? o.num : i + 1;
    return {
      id, num: n, name: str(o.name, 'Parsel ' + n), ring: readRing(o.ring, V, str(o.name, id)),
      owner: str(o.owner), share: typeof o.share === 'number' && Number.isFinite(o.share) ? o.share : 0,
      use: str(o.use, '—'), h: typeof o.h === 'number' && Number.isFinite(o.h) && o.h >= 0 ? o.h : 4,
    };
  });
}

function readBg(raw: unknown): BgImage | null {
  if (raw == null || !isObj(raw)) return null;
  const o = raw as Record<string, unknown>;
  // Only embedded images: a remote URL would leak where the file is opened.
  if (typeof o.src !== 'string' || !o.src.startsWith('data:image/')) return null;
  const c = isObj(o.crop) ? (o.crop as Record<string, unknown>) : {};
  const f = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  const crop = { l: f(c.l, 0), t: f(c.t, 0), r: f(c.r, 1), b: f(c.b, 1) };
  if (crop.r <= crop.l || crop.b <= crop.t) Object.assign(crop, { l: 0, t: 0, r: 1, b: 1 });
  try {
    const w = num(o.w, 'w'), iw = num(o.iw, 'iw'), ih = num(o.ih, 'ih');
    if (w <= 0 || iw <= 0 || ih <= 0) return null;
    return {
      src: o.src, iw, ih, w, x: num(o.x, 'x'), y: num(o.y, 'y'), rot: typeof o.rot === 'number' && Number.isFinite(o.rot) ? o.rot : 0,
      crop, opacity: f(o.opacity, 0.7) || 0.7, hidden: o.hidden === true,
    };
  } catch {
    return null;
  }
}

/** Parses and checks a project file; derived fields (area, center, orientation, id counters) are recomputed. Throws with a user-facing message. */
export function fromProject(text: string): { name: string; land: LandModel } {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      fail('Dosya okunamadı (JSON değil)');
    }
    if (!isObj(raw)) fail('Dosya biçimi tanınmadı');
    const f = raw as Record<string, unknown>;
    if (f.format !== FORMAT || !isObj(f.land)) fail('Bu bir arazi proje dosyası değil');
    if (typeof f.version !== 'number' || f.version > VERSION) fail('Dosya bu sürümden daha yeni bir uygulamayla kaydedilmiş');
    const L = f.land as Record<string, unknown>;
    const verts = readVerts(L.verts);
    const land = readRing(L.land, verts, 'Arazi sınırı');
    if (!land.every((id) => verts[id].c === 'fixed')) fail('Arazi sınırındaki köşeler arazi köşesi olmalı');
    for (const [id, v] of Object.entries(verts))
      if (Array.isArray(v.c) && !v.c.every((a) => land.includes(a))) fail('Köşe ' + id + ' tanımsız bir dış sınıra bağlı');
    const parcels = readParcels(L.parcels, verts);
    const la = sArea(pts(verts, land));
    if (!la) fail('Arazi alanı sıfır');
    const orient = Math.sign(la);
    const m = validate(verts, parcels, orient);
    if (m) fail('Geometri geçersiz: ' + m);
    const c = cen(pts(verts, land));
    const maxN = Math.max(0, ...Object.keys(verts).map((id) => (/^N(\d+)$/.exec(id) ? +id.slice(1) : 0)));
    const nextV = Math.max(typeof L.nextV === 'number' && Number.isInteger(L.nextV) ? L.nextV : 1, maxN + 1);
    const nextNum = Math.max(typeof L.nextNum === 'number' && Number.isInteger(L.nextNum) ? L.nextNum : 1, ...parcels.map((p) => p.num + 1));
    return {
      name: str(f.name).trim() || 'İçe aktarılan arazi',
      land: { verts, parcels, land, orient, landArea: Math.abs(la), cx: c.x, cy: c.y, nextNum, nextV, bg: readBg(L.bg) },
    };
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError('Dosya okunamadı');
  }
}

/** File-name-safe slug of a land name. */
export function fileBase(name: string): string {
  const s = name.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || 'arazi';
}

/** Hands a file to the browser as a download. */
export function download(data: Blob, fileName: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- PDF ----------
// A4 landscape in pt; the sheet is drawn on a canvas at PX px/pt and placed as one JPEG.
const PW = 842, PH = 595, PX = 3;
/** Marks our embedded project stream; it is written first so the first match in the file is ours. */
const MARK = '/LandDividerProject 1 /Length ';

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = no;
    im.src = src;
  });

const ellipsis = (ctx: CanvasRenderingContext2D, t: string, w: number) => {
  if (ctx.measureText(t).width <= w) return t;
  while (t && ctx.measureText(t + '…').width > w) t = t.slice(0, -1);
  return t + '…';
};

/** Draws the sheet: title, map (background image, parcels, labels, scale bar) and the parcel table. */
async function drawSheet(name: string, land: LandModel): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const cv = document.createElement('canvas');
  cv.width = PW * PX;
  cv.height = PH * PX;
  const ctx = cv.getContext('2d')!;
  ctx.scale(PX, PX);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, PW, PH);
  const F = (w: number, sz: number) => `${w} ${sz}px Archivo, system-ui, sans-serif`;
  const V = land.verts, M = 28;

  ctx.fillStyle = INK;
  ctx.font = F(800, 18);
  ctx.fillText(name, M, M + 14);
  ctx.fillStyle = INK2;
  ctx.font = F(400, 9);
  ctx.fillText(land.parcels.length + ' parsel · ' + fDn(land.landArea) + ' · ' + fA(land.landArea) + ' · ' + new Date().toLocaleDateString('tr-TR'), M, M + 30);

  // Map frame; world y points down like the canvas.
  const mx = M, my = 72, mw = 540, mh = PH - my - M;
  ctx.strokeStyle = INK2;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(mx, my, mw, mh);
  const LP = pts(V, land.land), xs = LP.map((p) => p.x), ys = LP.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0 || 1, bh = Math.max(...ys) - y0 || 1;
  const k = Math.min(mw / bw, mh / bh) * 0.86, ox = mx + (mw - bw * k) / 2 - x0 * k, oy = my + (mh - bh * k) / 2 - y0 * k;
  const X = (x: number) => ox + x * k, Y = (y: number) => oy + y * k;
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  const bg = land.bg, bgOn = !!bg && !bg.hidden;
  if (bg && bgOn) {
    try {
      const im = await loadImg(bg.src), w = bg.w, h = w * (bg.ih / bg.iw), c = bg.crop;
      ctx.save();
      ctx.globalAlpha = bg.opacity;
      ctx.translate(X(bg.x + w / 2), Y(bg.y + h / 2));
      ctx.scale(k, k);
      ctx.rotate(bg.rot);
      ctx.beginPath();
      ctx.rect(-w / 2 + c.l * w, -h / 2 + c.t * h, (c.r - c.l) * w, (c.b - c.t) * h);
      ctx.clip();
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
    } catch {
      /* unreadable image: sheet without it */
    }
  }
  const path = (ring: string[]) => {
    ctx.beginPath();
    ring.forEach((id, i) => (i ? ctx.lineTo(X(V[id].x), Y(V[id].y)) : ctx.moveTo(X(V[id].x), Y(V[id].y))));
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  land.parcels.forEach((p) => {
    path(p.ring);
    ctx.globalAlpha = bgOn ? 0.55 : 1;
    ctx.fillStyle = FILLS[p.num % 3];
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK2;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  path(land.land);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  land.parcels.forEach((p) => {
    const c = cen(pts(V, p.ring));
    ctx.fillStyle = INK;
    ctx.font = F(800, 9);
    ctx.fillText(p.name, X(c.x), Y(c.y) - 1);
    ctx.fillStyle = INK2;
    ctx.font = F(400, 8);
    ctx.fillText(fA(Math.abs(sArea(pts(V, p.ring)))), X(c.x), Y(c.y) + 9);
  });
  ctx.restore();

  // Scale bar: a round length near a fifth of the frame.
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const m = nice.filter((n) => n * k <= mw / 5).pop() ?? 1, sx = mx + 12, sy = my + mh - 14;
  ctx.fillStyle = INK;
  ctx.fillRect(sx, sy, m * k, 3);
  ctx.textAlign = 'left';
  ctx.font = F(600, 8);
  ctx.fillText(m + ' m', sx, sy - 4);

  // Parcel table.
  const tx = mx + mw + 20, tw = PW - M - tx, cols = [0, 0.3, 0.72];
  let ty = my + 10;
  ctx.font = F(600, 7.5);
  ctx.fillStyle = INK2;
  ['PARSEL', 'MALİK', 'ALAN'].forEach((h, i) => {
    ctx.textAlign = i === 2 ? 'right' : 'left';
    ctx.fillText(h, i === 2 ? tx + tw : tx + cols[i] * tw, ty);
  });
  ty += 5;
  ctx.fillStyle = INK;
  ctx.fillRect(tx, ty, tw, 1.2);
  const rows = Math.floor((PH - M - 30 - ty) / 14), list = land.parcels.slice().sort((a, b) => a.num - b.num);
  const shown = list.length > rows ? list.slice(0, rows - 1) : list;
  shown.forEach((p) => {
    ty += 14;
    ctx.font = F(700, 8.5);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(ellipsis(ctx, p.name, cols[1] * tw - 4), tx, ty - 3);
    ctx.font = F(400, 8.5);
    ctx.fillText(ellipsis(ctx, p.owner || '—', (cols[2] - cols[1]) * tw - 4), tx + cols[1] * tw, ty - 3);
    ctx.textAlign = 'right';
    ctx.fillText(fA(Math.abs(sArea(pts(V, p.ring)))), tx + tw, ty - 3);
    ctx.fillStyle = 'rgba(32,30,29,0.2)';
    ctx.fillRect(tx, ty + 1, tw, 0.5);
  });
  if (shown.length < list.length) {
    ty += 14;
    ctx.fillStyle = INK2;
    ctx.textAlign = 'left';
    ctx.fillText('+' + (list.length - shown.length) + ' parsel daha', tx, ty - 3);
  }
  ctx.textAlign = 'left';
  ctx.font = F(400, 7);
  ctx.fillStyle = ACC;
  ctx.fillText(ellipsis(ctx, 'Bu PDF arazi verisini içerir; uygulamada İçe aktar ile tekrar açılabilir.', tw), tx, PH - M);
  return cv;
}

const enc = new TextEncoder();
/** PDF text string as UTF-16BE hex (any characters). */
const pdfText = (t: string) => {
  const h = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
  let o = '<FEFF';
  for (let i = 0; i < t.length; i++) o += h(t.charCodeAt(i));
  return o + '>';
};

/** Single-page PDF: the rendered sheet as a JPEG, plus the project JSON as an attachment (also what import reads). */
export async function toPdf(name: string, land: LandModel): Promise<Blob> {
  const cv = await drawSheet(name, land);
  const jb = await new Promise<Blob>((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error('jpeg'))), 'image/jpeg', 0.9));
  const jpg = new Uint8Array(await jb.arrayBuffer());
  const json = enc.encode(toProject(name, land));
  const fn = fileBase(name) + PROJECT_EXT;
  const parts: Uint8Array[] = [], offs: number[] = [];
  let pos = 0;
  const put = (x: string | Uint8Array) => {
    const b = typeof x === 'string' ? enc.encode(x) : x;
    parts.push(b);
    pos += b.length;
  };
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offs[n] = pos;
    put(n + ' 0 obj\n' + body + '\n');
    if (stream) {
      put('stream\n');
      put(stream);
      put('\nendstream\n');
    }
    put('endobj\n');
  };
  put('%PDF-1.7\n');
  put(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(4, `<< /Type /EmbeddedFile /Subtype /application#2Fjson ${MARK}${json.length} /Params << /Size ${json.length} >> >>`, json);
  obj(1, `<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(${fn}) 5 0 R] >> >> >>`);
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im1 7 0 R >> >> /Contents 8 0 R >>`);
  obj(5, `<< /Type /Filespec /F (${fn}) /UF (${fn}) /EF << /F 4 0 R >> /Desc ${pdfText('Arazi proje verisi')} >>`);
  obj(6, `<< /Title ${pdfText(name)} /Producer (Land Divider) >>`);
  obj(7, `<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
  const content = enc.encode(`q ${PW} 0 0 ${PH} 0 0 cm /Im1 Do Q`);
  obj(8, `<< /Length ${content.length} >>`, content);
  const xref = pos;
  put('xref\n0 9\n0000000000 65535 f \n' + offs.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  put(`trailer\n<< /Size 9 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

/** Reads a land back from a PDF exported by toPdf. Throws with a user-facing message. */
export async function readImport(file: File): Promise<{ name: string; land: LandModel }> {
  if (file.size > 60 * 1024 * 1024) fail('Dosya çok büyük (en fazla 60 MB)');
  const b = new Uint8Array(await file.arrayBuffer());
  // latin1 maps one byte to one char, so string indexes are byte offsets.
  const s = new TextDecoder('latin1').decode(b);
  if (!s.startsWith('%PDF-')) fail('Dosya PDF değil');
  const i = s.indexOf(MARK);
  if (i < 0) fail('Bu PDF arazi verisi içermiyor; uygulamadan dışa aktarılmış bir PDF seçin');
  const n = parseInt(s.slice(i + MARK.length, i + MARK.length + 12), 10);
  const st = s.indexOf('stream', i);
  if (!(n > 0) || st < 0) fail('PDF içindeki arazi verisi bozuk');
  let d = st + 6;
  if (s[d] === '\r') d++;
  if (s[d] === '\n') d++;
  return fromProject(new TextDecoder('utf-8').decode(b.subarray(d, d + n)));
}

