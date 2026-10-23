// Context / overflow menu content (bottom list on phones, popover on wide screens).
import { INK } from './constants';
import { edgeMap, edgeName, neighborsOfV, vName } from './model';
import type { EditorActions, EditorState, MenuKind } from './types';

export interface MenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  sub: string;
  checked: boolean;
  chev: boolean;
  fg: string;
  op: number;
}

export interface MenuContent { kicker: string; title: string; items: MenuItem[] }

export function buildMenu(st: EditorState, kind: MenuKind, act: EditorActions, landName: string): MenuContent | null {
  const sel = st.sel;
  const M = (icon: string, label: string, run: (() => void) | null, o?: Partial<MenuItem>): MenuItem => ({
    icon,
    label,
    onClick: () => {
      act.closeMenu();
      if (run) run();
    },
    sub: '', checked: false, chev: false, fg: INK, op: 1,
    ...o,
  });
  const par = sel && sel.type === 'parcel' ? st.parcels.find((p) => p.id === sel.id) : null;
  const sharedEdges = (pid: string) => Object.values(edgeMap(st)).filter((e) => e.ps.length === 2 && e.ps.includes(pid));

  if (kind === 'parcel' && par) {
    const E = sharedEdges(par.id);
    return {
      kicker: 'Parsel',
      title: par.name,
      items: [
        M('icon-pencil', 'Bilgileri düzenle', () => act.setSheet('full'), { sub: 'Ad, kullanım, notlar' }),
        M('icon-user-round', 'Hissedar ata', () => act.setSheet('full'), { sub: par.owner || 'Atanmamış' }),
        M('icon-scissors', 'Böl', () => act.setTool('split')),
        M('icon-merge', 'Komşuyla birleştir', () => act.openMenu('neighbors'), { chev: true, sub: E.length + ' komşu parsel', op: E.length ? 1 : 0.45 }),
        M('icon-trash-2', 'Sil', null, { sub: 'Silmek boşluk bırakır — komşu parselle birleştirin', op: 0.45 }),
      ],
    };
  }

  if (kind === 'neighbors' && par) {
    const seen: Record<string, boolean> = {};
    const items: MenuItem[] = [];
    sharedEdges(par.id).forEach((e) => {
      const o = e.ps.find((x) => x !== par.id)!;
      if (seen[o]) return;
      seen[o] = true;
      const q = st.parcels.find((p) => p.id === o)!;
      items.push(M('icon-merge', q.name, () => act.askMerge(e.k), { sub: q.owner || 'Atanmamış' }));
    });
    return { kicker: par.name + ' ile birleştir', title: 'Komşu parsel seçin', items };
  }

  if (kind === 'edge' && sel) {
    const e = edgeMap(st)[sel.id];
    if (!e) return null;
    const lk = st.locked.includes(sel.id), outer = e.ps.length < 2;
    return {
      kicker: 'Sınır',
      title: edgeName(st, sel.id),
      items: [
        M('icon-circle-plus', 'Köşe ekle', () => act.startAddVertex(sel.id), { op: lk ? 0.45 : 1 }),
        M('icon-trash-2', 'Sınırı sil', () => act.deleteEdge(sel.id), { op: outer || lk ? 0.45 : 1, sub: outer ? 'Dış sınır silinemez' : lk ? 'Kilitli sınır silinemez' : 'İki parsel birleşir · Delete' }),
        M('icon-ruler', 'Sınır uzunlukları', act.toggleLengths, { checked: st.showLengths }),
        M(lk ? 'icon-lock-open' : 'icon-lock', lk ? 'Kilidi aç' : 'Kilitle', () => act.toggleLock(sel.id)),
      ],
    };
  }

  if (kind === 'vertex' && sel) {
    const n = neighborsOfV(st, sel.id).length, v = st.verts[sel.id], minLand = v.c === 'fixed' && st.land.length <= 3, ok = n === 2 && !minLand;
    return {
      kicker: 'Köşe',
      title: vName(st, sel.id),
      items: [
        M('icon-circle-minus', 'Köşeyi kaldır', () => ok && act.removeVertex(sel.id), { op: ok ? 1 : 0.45, sub: ok ? '' : minLand ? 'Arazinin en az 3 köşesi olmalı' : 'Birden fazla sınırı bağlayan köşe kaldırılamaz' }),
        M('icon-scan', 'Köşeye odaklan', () => act.focusVertex(sel.id)),
      ],
    };
  }

  /** Background image: add, or move / crop / fade / hide / replace / remove it. */
  const bgItems = (): MenuItem[] => {
    const bg = st.bg;
    if (!bg) return [M('icon-image-plus', 'Arkaplan resmi ekle', act.pickBg, { sub: 'Uydu görüntüsü, pafta, kroki' })];
    const ops = [1, 0.7, 0.5, 0.3], next = ops[(ops.indexOf(bg.opacity) + 1) % ops.length];
    return [
      M('icon-move', 'Arkaplanı taşı / boyutlandır', () => act.editBg('move'), { checked: st.bgEdit === 'move' }),
      M('icon-crop', 'Arkaplanı kırp', () => act.editBg('crop'), { checked: st.bgEdit === 'crop' }),
      M('icon-rotate-cw', '90° döndür', () => act.updateBg({ rot: Math.atan2(Math.cos(bg.rot), -Math.sin(bg.rot)) }, 'Arkaplan döndürme'), { sub: bg.rot ? 'Şu an ' + Math.round((bg.rot * 180) / Math.PI) + '°' : '' }),
      ...(bg.rot ? [M('icon-rotate-ccw', 'Döndürmeyi sıfırla', () => act.updateBg({ rot: 0 }, 'Arkaplan döndürme'))] : []),
      M('icon-blend', 'Saydamlık · %' + Math.round(bg.opacity * 100), () => act.updateBg({ opacity: next }, 'Arkaplan saydamlığı'), { sub: 'Sonraki: %' + Math.round(next * 100) }),
      M(bg.hidden ? 'icon-eye' : 'icon-eye-off', bg.hidden ? 'Arkaplanı göster' : 'Arkaplanı gizle', () => act.updateBg({ hidden: !bg.hidden }, 'Arkaplan görünürlüğü')),
      M('icon-image', 'Resmi değiştir', act.pickBg),
      M('icon-trash-2', 'Arkaplanı kaldır', act.removeBg),
    ];
  };

  if (kind === 'view') {
    return {
      kicker: 'Görünüm',
      title: 'Harita ayarları',
      items: [
        M('icon-square', '2D · düzenleme', () => act.set3d(false), { checked: st.t3d < 0.5 }),
        M('icon-box', '3D · görselleştirme', () => act.set3d(true), { checked: st.t3d >= 0.5 }),
        M('icon-tag', 'Alan etiketleri', act.toggleAreas, { checked: st.showAreas }),
        M('icon-ruler', 'Sınır uzunlukları', act.toggleLengths, { checked: st.showLengths }),
        M('icon-scan', 'Araziye sığdır', act.doFit),
        ...bgItems(),
      ],
    };
  }

  return {
    kicker: 'Proje',
    title: landName,
    items: [
      M('icon-scan', 'Araziye sığdır', act.doFit),
      M('icon-tag', 'Alan etiketleri', act.toggleAreas, { checked: st.showAreas }),
      M('icon-ruler', 'Sınır uzunlukları', act.toggleLengths, { checked: st.showLengths }),
      ...bgItems(),
      M('icon-file-down', 'Dışa aktar', act.exportPdf, { sub: 'PDF pafta · arazi verisini içerir' }),
      M('icon-file-up', 'İçe aktar', act.importFile, { sub: 'Dışa aktarılmış PDF · yeni arazi olarak açılır' }),
      M('icon-file-plus', 'Yeni arazi', act.newLand, { sub: 'Boş durumu göster' }),
    ],
  };
}
