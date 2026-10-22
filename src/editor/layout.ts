// Device-dependent layout: canvas rect, sheet heights, fit-to-land insets.
import { panelKind, proj } from './model';
import type { Device, EditorState, SheetLevel, View } from './types';

export interface Layout {
  d: Device;
  phone: boolean;
  W: number;
  H: number;
  statusH: number;
  /** Top bar height. */
  tH: number;
  /** Bottom toolbar height (phone layouts only). */
  bH: number;
  /** Canvas rect. */
  cv: { l: number; t: number; w: number; h: number };
  /** Panel width and left offset. */
  pw: number;
  pl: number;
}

/** `statusBar` = draw the fake device status bar (design frames); off in the real app. */
export function lay(st: Pick<EditorState, 'W' | 'H'>, device: Device = 'phone', statusBar = true): Layout {
  const d = device, W = st.W || 390, H = st.H || 844;
  if (d === 'phone' || d === 'tabletPortrait') {
    const sH = !statusBar ? 0 : d === 'phone' ? 44 : 24, tH = 56, bH = d === 'phone' ? 84 : 70;
    const pw = d === 'phone' ? W : Math.min(W, 600);
    return { d, phone: true, W, H, statusH: sH, tH, bH, cv: { l: 0, t: sH + tH, w: W, h: H - sH - tH - bH }, pw, pl: (W - pw) / 2 };
  }
  const sH = statusBar && d === 'tablet' ? 24 : 0, tH = 56, pw = d === 'tablet' ? Math.round(W * 0.29) : 340;
  return { d, phone: false, W, H, statusH: sH, tH, bH: 0, cv: { l: 0, t: sH + tH, w: W - pw, h: H - sH - tH }, pw, pl: W - pw };
}

export function levels(L: Layout): Record<SheetLevel, number> {
  const full = Math.max(380, L.cv.h - 40);
  return { collapsed: 92, half: Math.min(348, Math.round(L.cv.h * 0.55)), full };
}

/** Current bottom-sheet height (phone) or full panel height (wide layouts). */
export function sheetH(st: EditorState, L: Layout) {
  if (!L.phone) return L.cv.h;
  if (st.empty && st.tool !== 'draw') return 0;
  const k = panelKind(st);
  if (k === 'split') return 250;
  if (k === 'addv' || k === 'draw') return 190;
  if (k === 'drag') return 92;
  if (st.sheetDrag != null) return st.sheetDrag;
  return levels(L)[st.sheet] || 92;
}

function insets(st: EditorState, L: Layout) {
  if (L.phone) return { l: 24, r: 24, t: 72, b: Math.min(sheetH(st, L), 260) + 24 };
  if (L.d === 'tablet') return { l: 110, r: 80, t: 64, b: 40 };
  return { l: 48, r: 88, t: 56, b: 48 };
}

/** View that fits the land (or the in-progress drawing) into the free canvas area at 3D amount t. */
export function fitView(st: EditorState, t: number, device?: Device, statusBar?: boolean): View {
  const L = lay(st, device, statusBar);
  const P = proj({ ...st, t3d: t, view: { x: 0, y: 0, k: 1 } });
  let a: { x: number; y: number }[] = [];
  const V = st.verts;
  if (st.empty && st.drawPts.length > 1) a = st.drawPts.map((p) => P(p.x, p.y));
  st.land.forEach((id) => {
    a.push(P(V[id].x, V[id].y, 0));
    if (t > 0) a.push(P(V[id].x, V[id].y, 14));
  });
  const x0 = Math.min(...a.map((p) => p.x)), x1 = Math.max(...a.map((p) => p.x));
  const y0 = Math.min(...a.map((p) => p.y)), y1 = Math.max(...a.map((p) => p.y));
  const I = insets(st, L), aw = L.cv.w - I.l - I.r, ah = L.cv.h - I.t - I.b;
  const k = Math.max(0.3, Math.min(aw / (x1 - x0), ah / (y1 - y0)));
  return { k, x: I.l + (aw - (x1 - x0) * k) / 2 - x0 * k, y: I.t + (ah - (y1 - y0) * k) / 2 - y0 * k };
}
