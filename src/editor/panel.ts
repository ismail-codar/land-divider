// Content of the detail panel (bottom sheet on phones, right panel on wide screens).
import { ACC, ACC7, BAD, BG, INK, INK2, LINE, MUTED, POS, POSB, WRN, WRNB } from './constants';
import { fA, fD, fDn, fL } from './format';
import { hyp, sArea } from './geometry';
import type { SplitCheck } from './model';
import { diffStyle, edgeDraggable, edgeInfo, edgeName, neighborsOfV, vLocked, vName } from './model';
import type { EdgeMap, EditorActions, EditorState, PanelKind } from './types';

export interface PanelAction { icon: string; label: string; onClick: () => void; flex: number; bg: string; fg: string; bd: string; op: number }
export interface PanelBanner { icon: string; title: string; text: string; fg: string; bg: string }
export interface PanelTarget { cur: string; tgt: string; diff: string; fg: string; icon: string; pct: number; mark: number; bar: string }
export interface PanelSide { short: string; owner: string; area: string; delta: string; dfg: string; dbg: string; onClick: () => void }
export interface PanelStep { n: string; label: string; bar: string; fg: string }
export interface PanelNote { icon: string; fg: string; text: string }
export interface PanelRow { k: string; v: string }
export interface PanelListItem { short: string; owner: string; area: string; diff: string; dfg: string; dbg: string; onClick: () => void }

export interface PanelContent {
  kicker: string;
  kc: string;
  title: string;
  value: string;
  valueSub: string;
  banner: PanelBanner | null;
  target: PanelTarget | null;
  sides: PanelSide[] | null;
  steps: PanelStep[] | null;
  note: PanelNote | null;
  actions: PanelAction[] | null;
  rows: PanelRow[] | null;
  rowsTitle: string;
  list: PanelListItem[] | null;
}

const primary = (icon: string, label: string, onClick: () => void, flex?: number): PanelAction =>
  ({ icon, label, onClick, flex: flex || 1, bg: ACC, fg: BG, bd: ACC, op: 1 });
const secondary = (icon: string, label: string, onClick: () => void, flex?: number, disabled?: boolean): PanelAction =>
  ({ icon, label, onClick: disabled ? () => {} : onClick, flex: flex || 1, bg: 'transparent', fg: INK, bd: LINE, op: disabled ? 0.45 : 1 });

const lockBanner = (title: string, text: string): PanelBanner => ({ icon: 'icon-lock', title, text, fg: INK, bg: MUTED });

export function buildPanel(
  st: EditorState,
  E: EdgeMap,
  areas: Record<string, number>,
  tg: Record<string, number | null>,
  kind: PanelKind,
  chk: SplitCheck | null,
  act: EditorActions,
): PanelContent {
  const base: PanelContent = {
    kicker: '', kc: INK2, title: '', value: '', valueSub: '', banner: null, target: null, sides: null,
    steps: null, note: null, actions: null, rows: null, rowsTitle: '', list: null,
  };

  const tgtBlock = (pid: string): PanelTarget | null => {
    const a = areas[pid], t = tg[pid];
    if (t == null) return null;
    const ds = diffStyle(a - t, t);
    const mx = Math.max(a, t) * 1.08;
    return { cur: fA(a), tgt: fA(t), diff: ds.text, fg: ds.fg, icon: ds.icon, pct: Math.min(100, (a / mx) * 100), mark: (t / mx) * 100, bar: ds.fg === POS ? POS : INK };
  };

  const side = (pid: string): PanelSide => {
    const p = st.parcels.find((x) => x.id === pid)!;
    const dr = st.drag;
    let delta = '', dfg = INK, dbg = 'transparent';
    if (dr && dr.before[pid] != null) {
      const d = areas[pid] - dr.before[pid];
      if (Math.abs(d) >= 0.5) {
        delta = fD(d);
        dfg = d > 0 ? POS : WRN;
        dbg = d > 0 ? POSB : WRNB;
      }
    }
    return { short: 'P' + p.num, owner: p.owner || 'Atanmamış', area: fA(areas[pid]), delta, dfg, dbg, onClick: () => act.selectParcel(pid) };
  };

  if (kind === 'draw') {
    return {
      ...base,
      kicker: 'Arazi çiz',
      title: st.drawPts.length + ' köşe',
      value: st.drawPts.length >= 3 ? fA(Math.abs(sArea(st.drawPts))) : '—',
      note: { icon: 'icon-info', fg: INK2, text: 'Her köşe için haritaya dokunun. İlk noktaya dokunmak sınırı kapatır.' },
      actions: [
        secondary('icon-x', 'İptal', act.exitTool),
        { ...primary('icon-check', 'Araziyi Tamamla', act.finishDraw, 1.6), op: st.drawPts.length >= 3 ? 1 : 0.45 },
      ],
    };
  }

  if (kind === 'addv') {
    const e = edgeInfo(st, st.addPrev!.key)!;
    const t = st.addPrev!.t;
    return {
      ...base,
      kicker: 'Köşe ekle',
      title: edgeName(st, st.addPrev!.key),
      value: fL(e.len * t) + ' / ' + fL(e.len * (1 - t)),
      note: { icon: 'icon-move-horizontal', fg: INK2, text: 'Tutamacı sınır boyunca sürükleyerek konumlandırın.' },
      actions: [secondary('icon-x', 'İptal', act.cancelAddVertex), primary('icon-circle-plus', 'Ekle', act.confirmAddVertex, 1.6)],
    };
  }

  if (kind === 'split') {
    const sp = st.split!, p = st.parcels.find((x) => x.id === sp.pid)!;
    const stepN = !sp.p1 ? 1 : !sp.p2 ? 2 : 3;
    const steps = [['1', 'Parsel seç'], ['2', 'Başlangıç'], ['3', 'Bitiş'], ['4', 'Onayla']].map(([n, l], i) => {
      const done = i < stepN, cur = i === stepN;
      return { n, label: l, bar: done || cur ? ACC : 'transparent', fg: done || cur ? INK : INK2 };
    });
    const ok = !!(chk && chk.ok);
    return {
      ...base,
      kicker: 'Parseli böl',
      title: p.name,
      value: fA(areas[p.id]),
      valueSub: ok ? '≈ ' + fA(chk!.A1!) + ' + ' + fA(chk!.A2!) : '',
      steps,
      note: chk && !chk.ok
        ? { icon: 'icon-triangle-alert', fg: BAD, text: chk.msg! }
        : {
          icon: 'icon-info', fg: INK2,
          text: !sp.p1 ? 'Parsel sınırında bir noktaya dokunun; en yakın sınıra yapışır.' : !sp.p2 ? 'Karşı sınırda ikinci noktaya dokunun.' : 'Noktaları sürükleyerek ayarlayabilirsiniz.',
        },
      actions: [secondary('icon-x', 'İptal', act.exitTool), { ...primary('icon-scissors', 'Parseli Böl', act.doSplit, 1.6), op: ok ? 1 : 0.45 }],
    };
  }

  if (kind === 'drag') {
    const dr = st.drag!;
    const ids = Object.keys(dr.before).filter((id) => Math.abs(areas[id] - dr.before[id]) >= 0.5);
    return {
      ...base,
      kicker: dr.ghost ? 'Geçersiz konum' : dr.kind === 'vertex' ? 'Köşe taşınıyor' : 'Sınır taşınıyor',
      kc: dr.ghost ? BAD : ACC7,
      title: ids.length
        ? ids.map((id) => 'P' + st.parcels.find((x) => x.id === id)!.num + ' ' + fD(areas[id] - dr.before[id])).join('  ·  ')
        : '—',
      value: '',
    };
  }

  if (kind === 'parcel') {
    const p = st.parcels.find((x) => x.id === st.sel!.id);
    if (!p) return base;
    const a = areas[p.id], t = tg[p.id];
    const nb = [...new Set(Object.values(E).filter((e) => e.ps.length === 2 && e.ps.includes(p.id)).map((e) => e.ps.find((x) => x !== p.id)!))]
      .map((id) => 'P' + st.parcels.find((x) => x.id === id)!.num);
    const per = p.ring.reduce((s, id, i) => s + hyp(st.verts[id], st.verts[p.ring[(i + 1) % p.ring.length]]), 0);
    return {
      ...base,
      kicker: p.owner ? p.owner : 'Hissedar atanmamış',
      title: p.name,
      value: fA(a),
      valueSub: fDn(a),
      target: tgtBlock(p.id),
      actions: [
        primary('icon-scissors', 'Böl', () => act.setTool('split'), 1.2),
        secondary('icon-merge', 'Birleştir', () => act.openMenu('neighbors')),
        secondary('icon-ellipsis', 'Diğer', () => act.openMenu('parcel'), 0.8),
      ],
      rowsTitle: 'Parsel bilgileri',
      rows: [
        { k: 'Hissedar', v: p.owner || '—' },
        { k: 'Pay', v: p.share ? '%' + p.share : '—' },
        { k: 'Hedef alan', v: t ? fA(t) + ' · ' + fDn(t) : '—' },
        { k: 'Mevcut', v: fA(a) + ' · ' + fDn(a) },
        { k: 'Fark', v: t ? fD(a - t) : '—' },
        { k: 'Kullanım', v: p.use },
        { k: 'Çevre', v: fL(per) },
        { k: 'Köşe sayısı', v: String(p.ring.length) },
        { k: 'Komşu parseller', v: nb.join(', ') || '—' },
      ],
    };
  }

  if (kind === 'edge') {
    const e = edgeInfo(st, st.sel!.id);
    if (!e) return base;
    const outer = e.ps.length < 2, lk = st.locked.includes(e.k), drg = edgeDraggable(st, e.k);
    const banner = lk ? lockBanner('Kilitli sınır', 'Kilidi açılana kadar bu sınır ve köşeleri taşınamaz.') : null;
    const actions = lk
      ? [secondary('icon-lock-open', 'Kilidi aç', () => act.toggleLock(e.k)), secondary('icon-ellipsis', 'Diğer', () => act.openMenu('edge'), 0.7)]
      : outer
        ? [
          secondary('icon-circle-plus', 'Köşe ekle', () => act.startAddVertex(e.k)),
          secondary('icon-ruler', 'Uzunluklar', act.toggleLengths),
          secondary('icon-ellipsis', '', () => act.openMenu('edge'), 0.35),
        ]
        : [
          primary('icon-merge', 'Parselleri Birleştir', () => act.askMerge(e.k), 1.6),
          secondary('icon-circle-plus', 'Köşe ekle', () => act.startAddVertex(e.k)),
          secondary('icon-ellipsis', '', () => act.openMenu('edge'), 0.35),
        ];
    return {
      ...base,
      kicker: outer ? 'Dış sınır' : 'Ortak sınır',
      title: edgeName(st, e.k),
      value: fL(e.len),
      banner,
      sides: e.ps.map(side),
      note: drg ? { icon: 'icon-move-vertical', fg: INK2, text: outer ? 'Sınırı tutup sürükleyin; arazi kenarı paralel taşınır, üzerindeki köşeler birlikte kayar.' : 'Sınırı tutup sürükleyin; kendi eksenine dik yönde taşınır.' } : null,
      actions,
    };
  }

  if (kind === 'vertex') {
    const id = st.sel!.id, v = st.verts[id];
    if (!v) return base;
    const ps = st.parcels.filter((p) => p.ring.includes(id));
    const n = neighborsOfV(st, id).length;
    const lock = vLocked(st, id);
    const removable = n === 2 && (v.c !== 'fixed' || st.land.length > 3);
    const typ = v.c === 'fixed' ? 'Arazi köşesi' : Array.isArray(v.c) ? 'Dış sınır boyunca kayar' : 'Serbest';
    return {
      ...base,
      kicker: typ,
      title: vName(st, id),
      value: n + ' sınır',
      valueSub: ps.length + ' parsel',
      banner: null,
      sides: ps.map((p) => side(p.id)),
      note: lock ? null : {
        icon: 'icon-move', fg: INK2,
        text: v.c === 'fixed' ? 'Köşeyi sürükleyin; arazi sınırı ve üzerindeki köşeler birlikte güncellenir.' : Array.isArray(v.c) ? 'Köşeyi sürükleyin; dış sınırdan ayrılmadan kayar.' : 'Köşeyi sürükleyin; bağlı sınırlar ve alanlar canlı güncellenir.',
      },
      actions: [
        secondary('icon-circle-minus', 'Köşeyi kaldır', () => act.removeVertex(id), 1, !removable),
        secondary('icon-ellipsis', 'Diğer', () => act.openMenu('vertex'), 0.6),
      ],
    };
  }

  // Nothing selected: land summary + parcel list.
  const list = st.parcels.slice().sort((a, b) => a.num - b.num).map((p) => {
    const a = areas[p.id], t = tg[p.id], ds = diffStyle(t != null ? a - t : 0, t);
    return { short: 'P' + p.num, owner: p.owner || 'Atanmamış', area: fA(a), diff: ds.text, dfg: ds.fg, dbg: ds.bg, onClick: () => act.selectParcel(p.id) };
  });
  const off = st.parcels.filter((p) => tg[p.id] != null && diffStyle(areas[p.id] - tg[p.id]!, tg[p.id]).text !== 'Hedefte').length;
  return {
    ...base,
    kicker: 'Arazi özeti',
    title: st.parcels.length + ' parsel',
    value: fA(st.landArea),
    valueSub: fDn(st.landArea),
    note: { icon: off ? 'icon-triangle-alert' : 'icon-check', fg: off ? WRN : POS, text: off ? off + ' parsel hedef alandan sapıyor' : 'Tüm parseller hedefte' },
    list,
  };
}
