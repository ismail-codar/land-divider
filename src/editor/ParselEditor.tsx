// Map-centric parcel editor. This class owns editor state and pointer/gesture handling;
// geometry lives in ./geometry + ./model, view-models in ./scene, ./panel, ./menu,
// and rendering is delegated to ./components.
import { Component, createRef, type ChangeEvent, type MouseEvent, type PointerEvent } from 'react';
import { ACC, ACC1, ACC7, BAD, BG, DISABLED, INK, ZOOM_MAX, ZOOM_MIN } from './constants';
import { fA, fDn, fL } from './format';
import { K, areasOf, cen, clamp, ease, hyp, insertOnEdge, mergeRings, pip, pts, sArea, segD, validate } from './geometry';
import { fitView, lay, levels, sheetH, type Layout } from './layout';
import { buildMenu } from './menu';
import { navKey, type EditorNav } from './nav';
import {
  addCorner, addPrevPt, buildSplit, constrainV, constraintFor, edgeDraggable, edgeInfo, edgeMap, followLand, isLockedEdge, keepSel,
  order3d, panelKind, proj, removeCorner, shiftEdge, splitCheck, targets, vLocked,
} from './model';
import { buildPanel } from './panel';
import { sample } from './sample';
import { buildScene } from './scene';
import type {
  BgEditMode, BgImage, Device, EditorActions, EditorState, Hover, LandModel, MenuKind, Pt, Scenario, Selection, SheetLevel, Tool, ToolId, Verts, View,
} from './types';
import { BgHandles, BgLayer, bgHit } from './components/BgImage';
import { download, fileBase, readImport, toPdf } from './io';
import DetailPanel, { type PanelFrame } from './components/DetailPanel';
import EmptyState from './components/EmptyState';
import InstructionBar, { type Instruction } from './components/InstructionBar';
import { FloatingViewControls, ScaleBar, ZoomControls } from './components/MapControls';
import MapOverlays, { type Readout } from './components/MapOverlays';
import { ActionMenu, MergeConfirm, Snackbar, type ConfirmView, type MenuView, type SnackView } from './components/Overlays';
import SceneSvg from './components/SceneSvg';
import StatusBar from './components/StatusBar';
import { BottomToolbar, ToolRail } from './components/Toolbar';
import TopBar from './components/TopBar';
import type { SegItem, ToolItem } from './components/types';

export interface ParselEditorProps {
  device?: Device;
  /** Initial demo state (used by the design doc frames). */
  scenario?: Scenario;
  /** Draw the fake device status bar (design frames). Default true. */
  statusBar?: boolean;
  landName?: string;
  /** Enables in-place renaming of the land from the top bar. */
  onRename?: (name: string) => void;
  /** Initial land geometry; defaults to the sample land. */
  land?: LandModel;
  /** Snackbar message shown once after mount. */
  flash?: string;

  // Router integration (all optional; without them the editor is self-contained).
  /** URL-controlled navigation state. The editor follows it and reports its own changes via onNavChange. */
  nav?: EditorNav;
  onNavChange?: (nav: EditorNav, opts: { replace: boolean }) => void;
  onBack?: () => void;
  onNewLand?: () => void;
  /** Called instead of replacing the land in place when a land is drawn or imported (`name` comes from an imported file). */
  onLandCreated?: (land: LandModel, flash: string, name?: string) => void;
  /** Called whenever the land geometry changes (edit, undo, redo). */
  onLandChange?: (land: LandModel) => void;
}

/** In-flight pointer gesture (kept outside React state: it changes on every move). */
interface Gesture {
  type: 'pending' | 'done' | 'splitPlace' | 'addPrev' | 'blocked' | 'pan' | 'orbit' | 'vdrag' | 'edrag' | 'pinch';
  x0?: number;
  y0?: number;
  lx?: number;
  ly?: number;
  precise?: boolean;
  hit?: Selection | null;
  moved?: boolean;
  /** Vertex drag: grab offset so the vertex does not jump to the finger. */
  off?: Pt;
  /** Edge drag: world point where the drag started. */
  w0?: Pt;
  /** Split placement: which endpoint (1 / 2) is being placed. */
  slot?: number;
  /** Pinch: start distance, midpoint and view. */
  d0?: number;
  m0?: Pt;
  v0?: View;
}

/** Bottom-sheet drag in progress. */
interface SheetDrag { y0: number; h0: number; t0: number; moved: boolean }

const TOOLS: [ToolId, string, string][] = [
  ['select', 'icon-mouse-pointer-2', 'Seç'],
  ['addv', 'icon-circle-plus', 'Köşe'],
  ['split', 'icon-scissors', 'Böl'],
  ['view', 'icon-layers', 'Görünüm'],
  ['more', 'icon-ellipsis', 'Daha'],
];

const SHEET_ORDER: SheetLevel[] = ['collapsed', 'half', 'full'];
const landAreaOf = (st: Pick<EditorState, 'verts' | 'land'>) => Math.abs(sArea(pts(st.verts, st.land)));

export default class ParselEditor extends Component<ParselEditorProps, EditorState> {
  rootRef = createRef<HTMLDivElement>();
  cvRef = createRef<HTMLDivElement>();
  fileRef = createRef<HTMLInputElement>();
  importRef = createRef<HTMLInputElement>();
  ptrs = new Map<number, Pt>();
  g: Gesture | null = null;
  sd: SheetDrag | null = null;
  inited = false;
  ro?: ResizeObserver;
  raf = 0;
  snT?: ReturnType<typeof setTimeout>;
  hT?: ReturnType<typeof setTimeout>;
  lpT?: ReturnType<typeof setTimeout>;
  /** Target of the 2D/3D toggle (t3d itself animates). */
  want3d = false;
  /** URL sync: ready after the initial state is applied; key of the last URL nav seen. */
  navReady = false;
  applying = false;
  urlKey = '';
  /** Last nav reported to the router (avoids duplicate navigations before the URL catches up). */
  reportedKey = '';

  state: EditorState = {
    ...(this.props.land ?? sample()),
    sel: null, tool: 'select', split: null, addPrev: null, drawPts: [], empty: false,
    view: { x: 0, y: 0, k: 2 }, t3d: 0, yaw: -0.55, tiltAmt: 0.45,
    sheet: 'collapsed', sheetDrag: null, drag: null, undo: [], redo: [], snack: null, hint: null,
    menu: null, confirm: null, locked: [], showAreas: true, showLengths: false, hover: null, bgEdit: null, W: 0, H: 0,
  };

  get device(): Device {
    return this.props.device || 'phone';
  }

  // ---------- lifecycle ----------
  componentDidMount() {
    this.ro = new ResizeObserver((en) => {
      const r = en[0].contentRect;
      if (!r.width) return;
      if (Math.abs(r.width - this.state.W) < 1 && Math.abs(r.height - this.state.H) < 1) return;
      const first = !this.inited;
      this.inited = true;
      this.setState({ W: r.width, H: r.height }, () => {
        if (first) this.initScenario();
        else this.setState({ view: this.fit(this.state, this.state.t3d) });
      });
    });
    if (this.rootRef.current) this.ro.observe(this.rootRef.current);
    this.cvRef.current?.addEventListener('wheel', this.onWheel, { passive: false });
  }

  componentDidUpdate(_: ParselEditorProps, prev: EditorState) {
    const s = this.state;
    if (s.verts !== prev.verts && s.land.length && landAreaOf(s) !== s.landArea) this.setState({ landArea: landAreaOf(s) });
    if (this.navReady && (s.verts !== prev.verts || s.parcels !== prev.parcels || s.land !== prev.land || s.bg !== prev.bg)) this.props.onLandChange?.(this.landOf());
    const nav = this.props.nav;
    if (!nav || !this.navReady || this.applying) return;
    const urlKey = navKey(nav);
    const cur = this.navOf();
    if (urlKey !== this.urlKey) {
      // URL changed (back/forward, link, direct entry): follow it.
      this.urlKey = urlKey;
      this.reportedKey = '';
      if (urlKey !== navKey(cur)) this.applyNav(nav, false);
      return;
    }
    // Editor changed itself: report it.
    this.report(cur, false);
  }

  report(nav: EditorNav, replace: boolean) {
    const k = navKey(nav);
    if (k === this.urlKey || k === this.reportedKey) return;
    this.reportedKey = k;
    this.props.onNavChange?.(nav, { replace });
  }

  componentWillUnmount() {
    this.ro?.disconnect();
    this.cvRef.current?.removeEventListener('wheel', this.onWheel);
    clearTimeout(this.snT);
    clearTimeout(this.hT);
    clearTimeout(this.lpT);
    cancelAnimationFrame(this.raf);
  }

  // ---------- view ----------
  lay(st: EditorState = this.state): Layout {
    return lay(st, this.device, this.props.statusBar !== false);
  }

  fit(st: EditorState, t: number) {
    return fitView(st, t, this.device, this.props.statusBar !== false);
  }

  // ---------- URL sync ----------
  navOf(st: EditorState = this.state): EditorNav {
    return { sel: st.sel, view3d: this.want3d, sheet: st.sheet, tool: st.tool, menu: st.menu ? st.menu.kind : null, merge: st.confirm ? st.confirm.key : null };
  }

  landOf(st: EditorState = this.state): LandModel {
    const { verts, parcels, land, orient, cx, cy, nextNum, nextV } = st;
    return { verts, parcels, land, orient, landArea: landAreaOf(st), cx, cy, nextNum, nextV, bg: st.bg ?? null };
  }

  selValid(sel: Selection, st: EditorState) {
    if (sel.type === 'parcel') return st.parcels.some((p) => p.id === sel.id);
    if (sel.type === 'edge') return !!edgeMap(st)[sel.id];
    return st.parcels.some((p) => p.ring.includes(sel.id));
  }

  /** Brings editor state in line with a nav coming from the URL; invalid parts are dropped and reported back (replace). */
  applyNav(n: EditorNav, initial: boolean) {
    const s = this.state;
    const to3d = n.view3d && !s.empty;
    let sel = n.sel && !s.empty && this.selValid(n.sel, s) ? n.sel : null;
    let tool: Tool = n.tool;
    if (s.empty ? tool !== 'draw' : tool === 'draw') tool = 'select';
    if (to3d) {
      tool = 'select';
      if (sel && sel.type !== 'parcel') sel = null;
    }
    if (tool === 'addv' && sel && sel.type !== 'edge') sel = null;
    const sameSel = !!sel && !!s.sel && sel.type === s.sel.type && sel.id === s.sel.id;
    const patch: Partial<EditorState> = {
      sel: sameSel ? s.sel : sel,
      tool,
      // A dropped (invalid) selection also drops its sheet level.
      sheet: n.sel && !sel ? 'collapsed' : n.sheet,
      sheetDrag: null,
      menu: n.menu ? (s.menu && s.menu.kind === n.menu ? s.menu : { kind: n.menu }) : null,
    };
    const pid = sel && sel.type === 'parcel' ? sel.id : null;
    if (tool === 'split') patch.split = s.tool === 'split' && s.split && s.split.pid === pid ? s.split : { pid, p1: null, p2: null, cur: 1 };
    else patch.split = null;
    if ((tool === 'draw') !== (s.tool === 'draw')) patch.drawPts = [];
    if (!sameSel || tool !== 'select') patch.addPrev = null;
    if (!sameSel) patch.drag = null;
    const e = n.merge ? edgeMap(s)[n.merge] : null;
    patch.confirm = e && e.ps.length === 2 ? (s.confirm && s.confirm.key === e.k ? s.confirm : { a: e.ps[0], b: e.ps[1], key: e.k }) : null;
    if (initial) patch.t3d = to3d ? 1 : 0;
    this.applying = true;
    this.setState(patch as EditorState, () => {
      this.applying = false;
      if (initial) {
        this.want3d = to3d;
        this.setState({ view: this.fit(this.state, this.state.t3d) });
      } else if (to3d !== this.want3d) this.set3d(to3d);
      this.report(this.navOf(), true);
    });
  }

  doFit = () => this.animView(this.fit(this.state, this.state.t3d));

  animView(v1: View, t1?: number, dur?: number) {
    cancelAnimationFrame(this.raf);
    const v0 = { ...this.state.view }, t0 = this.state.t3d, T = t1 == null ? t0 : t1, D = dur || 410, s = performance.now();
    const f = (now: number) => {
      const u = Math.min(1, (now - s) / D), e = ease(u);
      this.setState({
        view: { x: v0.x + (v1.x - v0.x) * e, y: v0.y + (v1.y - v0.y) * e, k: v0.k + (v1.k - v0.k) * e },
        t3d: t0 + (T - t0) * e,
      });
      if (u < 1) this.raf = requestAnimationFrame(f);
    };
    this.raf = requestAnimationFrame(f);
  }

  toWorld(x: number, y: number): Pt {
    const v = this.state.view;
    return { x: (x - v.x) / v.k, y: (y - v.y) / v.k };
  }

  zoomAt(x: number, y: number, f: number) {
    this.setState((s) => {
      const k = clamp(s.view.k * f, ZOOM_MIN, ZOOM_MAX), r = k / s.view.k;
      return { view: { k, x: x - (x - s.view.x) * r, y: y - (y - s.view.y) * r } };
    });
  }

  zoomIn = () => {
    const L = this.lay();
    this.zoomAt(L.cv.w / 2, L.cv.h / 2, 1.4);
  };

  zoomOut = () => {
    const L = this.lay();
    this.zoomAt(L.cv.w / 2, L.cv.h / 2, 1 / 1.4);
  };

  onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey || this.device === 'desktop')) return;
    e.preventDefault();
    const r = this.cvRef.current!.getBoundingClientRect();
    this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
  };

  // ---------- scenarios ----------
  initScenario() {
    const s = this.state, sc = this.props.scenario || 'idle', V = s.verts, kTM = K('T2', 'M12');
    let p: Partial<EditorState> = {};
    const mv = (id: string, x: number, y: number): Verts => ({ ...V, [id]: { ...V[id], x, y } });
    const base = () => ({ before: areasOf(V, s.parcels), v0: V });
    switch (sc) {
      case 'parcel': p = { sel: { type: 'parcel', id: 'p12' }, sheet: 'half' }; break;
      case 'sheetFull': p = { sel: { type: 'parcel', id: 'p12' }, sheet: 'full' }; break;
      case 'more': p = { sel: { type: 'parcel', id: 'p12' }, sheet: 'half', menu: { kind: 'parcel' } }; break;
      case 'edge': p = { sel: { type: 'edge', id: kTM }, sheet: 'half' }; break;
      case 'merge': p = { sel: { type: 'edge', id: kTM }, sheet: 'half', confirm: { a: 'p12', b: 'p13', key: kTM } }; break;
      case 'locked': p = { sel: { type: 'edge', id: K('T1', 'T2') }, sheet: 'half' }; break;
      case 'vertex': p = { sel: { type: 'vertex', id: 'M12' }, sheet: 'half' }; break;
      case 'vdrag':
        p = { verts: mv('M11', 56, 43), sel: { type: 'vertex', id: 'M11' }, drag: { kind: 'vertex', id: 'M11', ...base(), start: { x: 49, y: 37 }, frozen: true } };
        break;
      case 'invalid': {
        const g = { x: 108, y: 58 };
        const tr = mv('M11', g.x, g.y);
        p = {
          verts: mv('M11', 54, 41), sel: { type: 'vertex', id: 'M11' },
          drag: { kind: 'vertex', id: 'M11', ...base(), start: { x: 49, y: 37 }, ghost: g, msg: validate(tr, s.parcels, s.orient) || 'Sınırlar birbirini kesemez.', frozen: true },
        };
        break;
      }
      case 'edrag': {
        const e = edgeInfo(s, kTM)!;
        const nv = shiftEdge(V, e, 7);
        p = { verts: nv || V, sel: { type: 'edge', id: kTM }, drag: { kind: 'edge', id: kTM, ...base(), n: e.n, off: 7, frozen: true } };
        break;
      }
      case 'split1': p = { tool: 'split', sel: { type: 'parcel', id: 'p15' }, split: { pid: 'p15', p1: null, p2: null, cur: 1 } }; break;
      case 'split2': {
        const a = V.M11, b = V.M21, c = V.M12, d = V.M22;
        p = {
          tool: 'split', sel: { type: 'parcel', id: 'p15' },
          split: {
            pid: 'p15', cur: 2,
            p1: { edge: K('M11', 'M21'), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            p2: { edge: K('M12', 'M22'), x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 },
          },
        };
        break;
      }
      case '3d': p = { sel: { type: 'parcel', id: 'p12' }, sheet: 'half', t3d: 1 }; break;
      case 'undo': {
        const moved = mv('M11', 56, 43);
        p = { redo: [{ verts: moved, parcels: s.parcels, land: s.land, bg: s.bg ?? null, label: 'Köşe hareketi' }], snack: { msg: 'Köşe hareketi geri alındı', action: 'İleri Al', fn: 'redo' } };
        break;
      }
      case 'addv': p = { sel: { type: 'edge', id: K('M11', 'M12') }, addPrev: { key: K('M11', 'M12'), t: 0.4 } }; break;
      case 'empty': p = { empty: true }; break;
      case 'draw': p = { empty: true, tool: 'draw', drawPts: [{ x: 0, y: 0 }, { x: 150, y: -8 }, { x: 160, y: 110 }] }; break;
    }
    this.setState(p as EditorState, () => {
      this.want3d = this.state.t3d >= 0.5;
      if (this.props.nav) {
        this.urlKey = navKey(this.props.nav);
        this.applyNav(this.props.nav, true);
      } else this.setState({ view: this.fit(this.state, this.state.t3d) });
      this.navReady = true;
      if (this.props.flash) this.showSnack(this.props.flash);
    });
  }

  // ---------- history / feedback ----------
  commit(patch: Partial<EditorState>, label: string) {
    this.setState((s) => ({ undo: [...s.undo.slice(-40), { verts: s.verts, parcels: s.parcels, land: s.land, bg: s.bg ?? null, label }], redo: [], ...patch }) as EditorState);
  }

  showSnack(msg: string, action?: string, fn?: 'undo' | 'redo') {
    clearTimeout(this.snT);
    this.setState({ snack: { msg, action, fn } });
    this.snT = setTimeout(() => this.setState({ snack: null }), 4500);
  }

  showHint(text: string) {
    clearTimeout(this.hT);
    this.setState({ hint: { text } });
    this.hT = setTimeout(() => this.setState({ hint: null }), 1800);
  }

  doUndo = () => {
    const s = this.state;
    if (!s.undo.length) return;
    const e = s.undo[s.undo.length - 1];
    this.setState({
      undo: s.undo.slice(0, -1), redo: [...s.redo, { verts: s.verts, parcels: s.parcels, land: s.land, bg: s.bg ?? null, label: e.label }],
      verts: e.verts, parcels: e.parcels, land: e.land, bg: e.bg, drag: null, split: null, addPrev: null, tool: 'select', sel: keepSel(s.sel, e.parcels),
    });
    this.showSnack(e.label + ' geri alındı', 'İleri Al', 'redo');
  };

  doRedo = () => {
    const s = this.state;
    if (!s.redo.length) return;
    const e = s.redo[s.redo.length - 1];
    this.setState({
      redo: s.redo.slice(0, -1), undo: [...s.undo, { verts: s.verts, parcels: s.parcels, land: s.land, bg: s.bg ?? null, label: e.label }],
      verts: e.verts, parcels: e.parcels, land: e.land, bg: e.bg, drag: null, sel: keepSel(s.sel, e.parcels),
    });
    this.showSnack(e.label + ' yeniden uygulandı', 'Geri Al', 'undo');
  };

  snackAct = () => {
    const f = this.state.snack && this.state.snack.fn;
    this.setState({ snack: null });
    if (f === 'redo') this.doRedo();
    else if (f === 'undo') this.doUndo();
  };

  // ---------- topology edits ----------
  insertVertex(key: string, pt: Pt) {
    const s = this.state, e = edgeMap(s)[key];
    const id = 'N' + s.nextV;
    const c = constraintFor(s, key, pt);
    const V = { ...s.verts, [id]: { x: pt.x, y: pt.y, c } };
    const ps = insertOnEdge(s.parcels, e.a, e.b, id);
    // A vertex added on the outer boundary becomes a land corner, so the land can be any polygon.
    const lc = addCorner({ verts: V, land: s.land }, id);
    this.commit({ ...lc, parcels: ps, verts: lc ? lc.verts : V, nextV: s.nextV + 1, sel: { type: 'vertex', id }, sheet: 'half', tool: 'select', addPrev: null }, 'Köşe ekleme');
    this.showSnack((lc ? 'Arazi köşesi' : 'Köşe') + ' eklendi · sürükleyerek taşıyın', 'Geri Al', 'undo');
  }

  makeCorner(id: string) {
    const lc = addCorner(this.state, id);
    if (!lc) return;
    this.commit(lc, 'Arazi köşesi');
    this.showSnack('Arazi köşesine dönüştürüldü', 'Geri Al', 'undo');
  }

  removeVertex(id: string) {
    const s = this.state;
    const lc = s.verts[id].c === 'fixed' ? removeCorner(s, id) : null;
    if (s.verts[id].c === 'fixed' && !lc) {
      this.showHint('Arazinin en az 3 köşesi olmalı');
      return;
    }
    const V = lc ? lc.verts : s.verts;
    const ps = s.parcels.map((p) => ({ ...p, ring: p.ring.filter((x) => x !== id) }));
    const m = validate(V, ps, s.orient);
    if (m) {
      this.showHint(m);
      return;
    }
    this.commit({ ...lc, parcels: ps, sel: null, sheet: 'collapsed' }, 'Köşe kaldırma');
    this.showSnack('Köşe kaldırıldı', 'Geri Al', 'undo');
  }

  mergeParcels(key: string) {
    const s = this.state, e = edgeMap(s)[key];
    if (!e || e.ps.length < 2) return;
    const A = s.parcels.find((p) => p.id === e.ps[0])!, B = s.parcels.find((p) => p.id === e.ps[1])!;
    const ring = mergeRings(A.ring, B.ring, e.a, e.b);
    const np = { ...A, ring, share: A.share + B.share, owner: A.owner, h: Math.max(A.h, B.h) };
    const ps = s.parcels.filter((p) => p.id !== B.id).map((p) => (p.id === A.id ? np : p));
    this.commit({ parcels: ps, sel: { type: 'parcel', id: A.id }, sheet: 'half', confirm: null }, 'Birleştirme');
    this.showSnack(A.name + ' ve ' + B.name + ' birleştirildi', 'Geri Al', 'undo');
  }

  doSplit = () => {
    const s = this.state, c = splitCheck(s);
    if (!c || !c.ok) return;
    const r = buildSplit(s)!;
    const big = Math.abs(sArea(pts(r.V, r.rA))) >= Math.abs(sArea(pts(r.V, r.rB)));
    const keep = big ? r.rA : r.rB, give = big ? r.rB : r.rA;
    const n = s.nextNum;
    const np = { id: 'p' + n, num: n, name: 'Parsel ' + n, ring: give, owner: '', share: 0, use: r.P.use, h: r.P.h };
    const ps = r.ps.map((p) => (p.id === r.P.id ? { ...p, ring: keep } : p)).concat([np]);
    this.commit({ verts: r.V, parcels: ps, nextV: r.nv, nextNum: n + 1, tool: 'select', split: null, sel: { type: 'parcel', id: np.id }, sheet: 'half' }, 'Bölme');
    this.showSnack(r.P.name + ' ikiye bölündü', 'Geri Al', 'undo');
  };

  // ---------- hit testing ----------
  hit(x: number, y: number, precise: boolean): Selection | null {
    const s = this.state;
    if (s.empty) return null;
    const P = proj(s), V = s.verts, rv = precise ? 12 : 24, re = precise ? 8 : 18;
    const used = new Set<string>();
    s.parcels.forEach((p) => p.ring.forEach((id) => used.add(id)));
    let bv: string | null = null, bd = 1e9;
    used.forEach((id) => {
      const q = P(V[id].x, V[id].y);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) {
        bd = d;
        bv = id;
      }
    });
    if (bd < rv) return { type: 'vertex', id: bv! };
    // The selected edge's midpoint handle has a larger hit area.
    if (s.sel && s.sel.type === 'edge') {
      const e = edgeInfo(s, s.sel.id);
      if (e) {
        const m = P(e.mid.x, e.mid.y);
        if (Math.hypot(m.x - x, m.y - y) < rv + 4) return { type: 'edge', id: e.k };
      }
    }
    let be: string | null = null;
    bd = 1e9;
    Object.values(edgeMap(s)).forEach((e) => {
      const a = P(V[e.a].x, V[e.a].y), b = P(V[e.b].x, V[e.b].y), r = segD({ x, y }, a, b);
      if (r.d < bd) {
        bd = r.d;
        be = e.k;
      }
    });
    if (bd < re) return { type: 'edge', id: be! };
    const w = this.toWorld(x, y);
    const p = s.parcels.find((p) => pip(w, pts(V, p.ring)));
    return p ? { type: 'parcel', id: p.id } : null;
  }

  hit3d(x: number, y: number): Selection | null {
    const s = this.state, P = proj(s), V = s.verts;
    const order = order3d(s, P);
    for (let i = order.length - 1; i >= 0; i--) {
      const p = order[i];
      const poly = p.ring.map((id) => P(V[id].x, V[id].y, p.h));
      if (pip({ x, y }, poly)) return { type: 'parcel', id: p.id };
    }
    return null;
  }

  // ---------- canvas pointer ----------
  local(e: { clientX: number; clientY: number }): Pt {
    const r = this.cvRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    const s = this.state;
    const p = this.local(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer may already be gone */
    }
    this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size === 2) {
      this.startPinch();
      return;
    }
    if (this.ptrs.size > 2) return;
    if (s.drag && s.drag.frozen) this.setState({ drag: null });
    if (s.menu) this.setState({ menu: null });
    const precise = e.pointerType !== 'touch';
    this.g = {
      type: 'pending', x0: p.x, y0: p.y, lx: p.x, ly: p.y, precise, moved: false,
      hit: s.empty ? null : s.t3d > 0 ? this.hit3d(p.x, p.y) : this.hit(p.x, p.y, precise),
    };
    if (s.t3d === 0 && s.tool === 'split' && s.split && s.split.pid) {
      this.g.type = 'splitPlace';
      this.splitPlace(p.x, p.y, true);
      return;
    }
    if (s.addPrev) {
      const h = addPrevPt(s);
      const q = proj(s)(h.x, h.y);
      if (Math.hypot(q.x - p.x, q.y - p.y) < (precise ? 16 : 30)) {
        this.g.type = 'addPrev';
        return;
      }
    }
    // Long press (touch / pen): select + context list.
    if (s.tool === 'select' && this.g.hit && e.pointerType !== 'mouse') {
      clearTimeout(this.lpT);
      this.lpT = setTimeout(() => {
        const g = this.g;
        if (g && g.type === 'pending' && !g.moved) {
          g.type = 'done';
          this.selectHit(g.hit!, true);
        }
      }, 500);
    }
  };

  onMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = this.local(e);
    if (!this.ptrs.has(e.pointerId)) {
      // Hover feedback for mouse / pen.
      if (e.pointerType !== 'touch' && this.state.t3d === 0) {
        const h = this.hit(p.x, p.y, true);
        const hk = h ? h.type + h.id : null;
        if (hk !== (this.state.hover && this.state.hover.k)) this.setState({ hover: h ? ({ ...h, k: hk } as Hover) : null });
      }
      return;
    }
    this.ptrs.set(e.pointerId, p);
    const g = this.g;
    if (!g) return;
    if (g.type === 'pinch') {
      this.doPinch();
      return;
    }
    const s = this.state;
    if (g.type === 'pending') {
      if (Math.hypot(p.x - g.x0!, p.y - g.y0!) < (g.precise ? 4 : 8)) return;
      g.moved = true;
      clearTimeout(this.lpT);
      const h = g.hit;
      if (s.t3d > 0) g.type = 'orbit';
      else if (s.tool === 'select' && h && h.type === 'vertex') {
        if (vLocked(s, h.id)) {
          g.type = 'blocked';
          this.showHint('Köşe kilitli bir sınıra bağlı');
        } else this.startV(h.id, g);
      } else if (s.tool === 'select' && h && h.type === 'edge') {
        if (!edgeDraggable(s, h.id)) {
          g.type = 'blocked';
          this.showHint(isLockedEdge(s, h.id) ? 'Kilitli sınır taşınamaz' : 'Bu sınır bu yönde taşınamaz');
        } else this.startE(h.id, g);
      } else g.type = 'pan';
    }
    if (g.type === 'pan') {
      const dx = p.x - g.lx!, dy = p.y - g.ly!;
      this.setState((s) => ({ view: { ...s.view, x: s.view.x + dx, y: s.view.y + dy } }));
    } else if (g.type === 'orbit') {
      const dx = p.x - g.lx!, dy = p.y - g.ly!;
      this.setState((s) => ({ yaw: s.yaw + dx * 0.008, tiltAmt: clamp(s.tiltAmt + dy * 0.003, 0.2, 0.7) }));
    } else if (g.type === 'vdrag') this.moveV(p);
    else if (g.type === 'edrag') this.moveE(p);
    else if (g.type === 'splitPlace') this.splitPlace(p.x, p.y, false);
    else if (g.type === 'addPrev') {
      const e2 = edgeInfo(s, s.addPrev!.key)!, V = s.verts, w = this.toWorld(p.x, p.y), r = segD(w, V[e2.a], V[e2.b]);
      this.setState({ addPrev: { ...s.addPrev!, t: clamp(r.t, 0.05, 0.95) } });
    }
    g.lx = p.x;
    g.ly = p.y;
  };

  onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!this.ptrs.has(e.pointerId)) return;
    this.ptrs.delete(e.pointerId);
    clearTimeout(this.lpT);
    const g = this.g;
    if (!g) return;
    if (g.type === 'pinch') {
      // One finger left: continue as pan from its current position (no jump).
      if (this.ptrs.size === 1) {
        const q = [...this.ptrs.values()][0];
        this.g = { type: 'pan', lx: q.x, ly: q.y, moved: true };
      } else if (!this.ptrs.size) this.g = null;
      return;
    }
    if (g.type === 'pending' && !g.moved) this.tap(g);
    if (g.type === 'vdrag' || g.type === 'edrag') this.endDrag();
    if (g.type === 'splitPlace') this.setState((s) => ({ split: { ...s.split!, cur: s.split!.p1 && !s.split!.p2 ? 2 : s.split!.cur } }));
    if (!this.ptrs.size) this.g = null;
  };

  onLeave = () => {
    if (!this.ptrs.size && this.state.hover) this.setState({ hover: null });
  };

  onCtx = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const s = this.state;
    if (s.t3d > 0 || s.empty) return;
    const p = this.local(e);
    const h = this.hit(p.x, p.y, true);
    if (!h) return;
    this.selectHit(h);
    const L = this.lay(s);
    this.setState({ menu: { kind: h.type, x: p.x + L.cv.l, y: p.y + L.cv.t } });
  };

  startPinch() {
    const s = this.state, g = this.g;
    // A second finger cancels any edit and restores the geometry.
    if (g && (g.type === 'vdrag' || g.type === 'edrag') && s.drag) this.setState({ verts: s.drag.v0, drag: null });
    clearTimeout(this.lpT);
    const [a, b] = [...this.ptrs.values()];
    this.g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { ...s.view } };
  }

  doPinch() {
    const g = this.g!, [a, b] = [...this.ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const v0 = g.v0!, m0 = g.m0!;
    const k = clamp((v0.k * d) / g.d0!, ZOOM_MIN, ZOOM_MAX), r = k / v0.k;
    this.setState({ view: { k, x: m0.x - (m0.x - v0.x) * r + (m.x - m0.x), y: m0.y - (m0.y - v0.y) * r + (m.y - m0.y) } });
  }

  tap(g: Gesture) {
    const s = this.state, h = g.hit ?? null;
    if (s.tool === 'draw') {
      this.drawTap(g);
      return;
    }
    if (s.t3d > 0) {
      this.selectHit(h);
      return;
    }
    if (s.tool === 'addv') {
      // Snap to the nearest edge within reach.
      let key: string | null = h && h.type === 'edge' ? h.id : null;
      if (!key) {
        const P = proj(s), V = s.verts;
        let bd = 1e9;
        Object.values(edgeMap(s)).forEach((e) => {
          const r = segD({ x: g.x0!, y: g.y0! }, P(V[e.a].x, V[e.a].y), P(V[e.b].x, V[e.b].y));
          if (r.d < bd) {
            bd = r.d;
            key = e.k;
          }
        });
        if (bd > (g.precise ? 14 : 30)) key = null;
      }
      if (!key) {
        this.showHint('Köşe eklemek için bir sınıra dokunun');
        return;
      }
      if (isLockedEdge(s, key)) {
        this.showHint('Kilitli sınıra köşe eklenemez');
        return;
      }
      const e = edgeInfo(s, key)!, V = s.verts, r = segD(this.toWorld(g.x0!, g.y0!), V[e.a], V[e.b]);
      const t = clamp(r.t, 0.05, 0.95);
      this.insertVertex(key, { x: V[e.a].x + (V[e.b].x - V[e.a].x) * t, y: V[e.a].y + (V[e.b].y - V[e.a].y) * t });
      return;
    }
    if (s.tool === 'split' && !(s.split && s.split.pid)) {
      const w = this.toWorld(g.x0!, g.y0!);
      const p = s.parcels.find((p) => pip(w, pts(s.verts, p.ring)));
      if (p) this.setState({ sel: { type: 'parcel', id: p.id }, split: { pid: p.id, p1: null, p2: null, cur: 1 } });
      return;
    }
    // Tapping the background image where no land geometry is hit reopens its edit mode.
    if (!h && s.tool === 'select' && s.t3d === 0 && s.bg && !s.bg.hidden && bgHit(s.bg, this.toWorld(g.x0!, g.y0!))) {
      this.act.editBg('move');
      return;
    }
    this.selectHit(h);
  }

  selectHit(h: Selection | null, long?: boolean) {
    const s = this.state, L = this.lay(s);
    if (!h) {
      this.setState({ sel: null, sheet: 'collapsed', addPrev: null });
      return;
    }
    const sheet = s.sheet === 'full' ? 'full' : 'half';
    this.setState({ sel: { type: h.type, id: h.id }, sheet, addPrev: null });
    if (long && L.phone) this.setState({ menu: { kind: h.type } });
  }

  // ---------- drag ----------
  startV(id: string, g: Gesture) {
    const s = this.state, w = this.toWorld(g.x0!, g.y0!), v = s.verts[id];
    g.type = 'vdrag';
    g.off = { x: v.x - w.x, y: v.y - w.y };
    this.setState({ sel: { type: 'vertex', id }, drag: { kind: 'vertex', id, v0: s.verts, before: areasOf(s.verts, s.parcels), start: { x: v.x, y: v.y } } });
  }

  /** Invalid positions keep the last valid geometry and only move a ghost. */
  moveV(p: Pt) {
    const s = this.state, d = s.drag, g = this.g!;
    if (!d || d.kind !== 'vertex') return;
    const w = this.toWorld(p.x, p.y);
    let t = { x: w.x + g.off!.x, y: w.y + g.off!.y };
    t = constrainV(s.verts, d.id, t);
    let tr = { ...s.verts, [d.id]: { ...s.verts[d.id], ...t } };
    if (tr[d.id].c === 'fixed') tr = followLand(d.v0, tr);
    const m = validate(tr, s.parcels, s.orient);
    if (!m) this.setState({ verts: tr, drag: { ...d, ghost: null, msg: null } });
    else this.setState({ drag: { ...d, ghost: t, msg: m } });
  }

  startE(key: string, g: Gesture) {
    const s = this.state, e = edgeInfo(s, key)!;
    g.type = 'edrag';
    g.w0 = this.toWorld(g.x0!, g.y0!);
    this.setState({ sel: { type: 'edge', id: key }, drag: { kind: 'edge', id: key, v0: s.verts, before: areasOf(s.verts, s.parcels), n: e.n, e, off: 0 } });
  }

  moveE(p: Pt) {
    const s = this.state, d = s.drag, g = this.g!, w = this.toWorld(p.x, p.y);
    if (!d || d.kind !== 'edge' || !d.e) return;
    const off = (w.x - g.w0!.x) * d.n.x + (w.y - g.w0!.y) * d.n.y;
    const nv = shiftEdge(d.v0, d.e, off);
    if (!nv) return;
    const m = validate(nv, s.parcels, s.orient);
    if (!m) this.setState({ verts: nv, drag: { ...d, off, ghost: null, msg: null } });
    else this.setState({ drag: { ...d, ghost: { a: nv[d.e.a], b: nv[d.e.b] }, msg: m } });
  }

  endDrag() {
    const s = this.state, d = s.drag;
    if (!d) return;
    const moved = s.verts !== d.v0;
    if (moved) this.setState({ undo: [...s.undo.slice(-40), { verts: d.v0, parcels: s.parcels, land: s.land, bg: s.bg ?? null, label: d.kind === 'vertex' ? 'Köşe hareketi' : 'Sınır hareketi' }], redo: [] });
    this.setState({ drag: null });
    if (d.ghost) this.showHint('Son geçerli konuma döndü');
  }

  // ---------- split / add vertex / draw ----------
  /** Places split endpoint: existing vertex within 22 px wins, otherwise nearest edge point. */
  splitPlace(x: number, y: number, isDown: boolean) {
    const s = this.state, sp = s.split!, g = this.g!;
    const P = proj(s), V = s.verts, par = s.parcels.find((p) => p.id === sp.pid)!;
    const w = this.toWorld(x, y);
    let slot = sp.cur;
    if (isDown && sp.p1 && sp.p2) {
      const q1 = P(sp.p1.x, sp.p1.y), q2 = P(sp.p2.x, sp.p2.y);
      slot = Math.hypot(q1.x - x, q1.y - y) < Math.hypot(q2.x - x, q2.y - y) ? 1 : 2;
      g.slot = slot;
    } else if (!isDown && g.slot) slot = g.slot;
    else if (isDown) g.slot = slot;
    let best: { vid?: string; edge?: string; x: number; y: number } | null = null, bd = 1e9;
    par.ring.forEach((id) => {
      const q = P(V[id].x, V[id].y), d = Math.hypot(q.x - x, q.y - y);
      if (d < bd) {
        bd = d;
        best = { vid: id, x: V[id].x, y: V[id].y };
      }
    });
    if (bd > 22) {
      best = null;
      bd = 1e9;
      for (let i = 0; i < par.ring.length; i++) {
        const a = par.ring[i], b = par.ring[(i + 1) % par.ring.length], r = segD(w, V[a], V[b]);
        if (r.d < bd) {
          bd = r.d;
          best = { edge: K(a, b), x: r.x, y: r.y };
        }
      }
    }
    this.setState({ split: { ...sp, ['p' + slot]: best } });
  }

  confirmAddV = () => {
    const s = this.state;
    this.insertVertex(s.addPrev!.key, addPrevPt(s));
  };

  drawTap(g: Gesture) {
    const s = this.state, w = this.toWorld(g.x0!, g.y0!), P = proj(s);
    if (s.drawPts.length >= 3) {
      const f = P(s.drawPts[0].x, s.drawPts[0].y);
      if (Math.hypot(f.x - g.x0!, f.y - g.y0!) < 28) {
        this.finishDraw();
        return;
      }
    }
    this.setState({ drawPts: [...s.drawPts, w] });
  }

  finishDraw = () => {
    const s = this.state;
    if (s.drawPts.length < 3) return;
    const pp = s.drawPts.slice();
    if (sArea(pp) < 0) pp.reverse();
    const V: Verts = {}, ids: string[] = [];
    pp.forEach((p, i) => {
      const id = 'L' + i;
      V[id] = { x: p.x, y: p.y, c: 'fixed' };
      ids.push(id);
    });
    const la = sArea(pts(V, ids)), c = cen(pts(V, ids));
    if (this.props.onLandCreated) {
      const parcels = [{ id: 'p1', num: 1, name: 'Parsel 1', ring: ids, owner: '', share: 100, use: '—', h: 4 }];
      this.props.onLandCreated({ verts: V, land: ids, orient: 1, landArea: Math.abs(la), cx: c.x, cy: c.y, parcels, nextNum: 2, nextV: s.nextV, bg: s.bg ?? null }, 'Arazi oluşturuldu · Böl ile parselleyin');
      return;
    }
    this.setState({
      verts: V, land: ids, orient: 1, landArea: Math.abs(la), cx: c.x, cy: c.y,
      parcels: [{ id: 'p1', num: 1, name: 'Parsel 1', ring: ids, owner: '', share: 100, use: '—', h: 4 }],
      empty: false, tool: 'select', drawPts: [], undo: [], redo: [], sel: { type: 'parcel', id: 'p1' }, sheet: 'half', nextNum: 2,
    }, () => this.doFit());
    this.showSnack('Arazi oluşturuldu · Böl ile parselleyin');
  };

  startDraw = () => this.setState({ tool: 'draw', drawPts: [], bgEdit: null });

  // ---------- background image ----------
  /** Loads the picked image and places it over the land (or the visible canvas when empty), then opens move mode. */
  onBgFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const src = rd.result as string, im = new Image();
      im.onload = () => {
        const s = this.state, L = this.lay(s);
        let c: Pt, w: number;
        if (!s.empty && s.land.length) {
          const ps = pts(s.verts, s.land), xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
          c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
          w = (Math.max(...xs) - Math.min(...xs)) * 1.4;
        } else {
          c = this.toWorld(L.cv.w / 2, L.cv.h / 2);
          w = (L.cv.w * 0.8) / s.view.k;
        }
        const h = w * (im.naturalHeight / im.naturalWidth);
        const bg: BgImage = {
          src, iw: im.naturalWidth, ih: im.naturalHeight, x: c.x - w / 2, y: c.y - h / 2, w, rot: 0,
          crop: { l: 0, t: 0, r: 1, b: 1 }, opacity: s.empty ? 1 : 0.7, hidden: false,
        };
        this.commit({ bg, bgEdit: 'move', tool: s.tool === 'draw' ? 'draw' : 'select', split: null, addPrev: null, sel: null }, 'Arkaplan resmi');
        this.showSnack('Arkaplan eklendi · taşıyıp boyutlandırın', 'Geri Al', 'undo');
      };
      im.onerror = () => this.showHint('Resim okunamadı');
      im.src = src;
    };
    rd.readAsDataURL(f);
  };

  /** Records one undo step for a finished handle gesture. */
  bgGestureEnd = (before: BgImage) => {
    const s = this.state;
    if (s.bg === before) return;
    this.setState({ undo: [...s.undo.slice(-40), { verts: s.verts, parcels: s.parcels, land: s.land, bg: before, label: 'Arkaplan düzenleme' }], redo: [] });
  };

  // ---------- import / export ----------
  exportPdf = async () => {
    const s = this.state;
    if (s.empty || !s.land.length) {
      this.showHint('Dışa aktarılacak arazi yok');
      return;
    }
    const name = this.props.landName || 'Arazi';
    try {
      download(await toPdf(name, this.landOf()), fileBase(name) + '.pdf');
      this.showSnack('PDF indirildi');
    } catch {
      this.showHint('Dışa aktarma başarısız oldu');
    }
  };

  /** Reads a picked PDF; the imported land becomes a new land (host) or replaces the current one. */
  onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    let r: Awaited<ReturnType<typeof readImport>>;
    try {
      r = await readImport(f);
    } catch (err) {
      this.showHint(err instanceof Error ? err.message : 'Dosya okunamadı');
      return;
    }
    const msg = r.land.parcels.length + ' parsel içe aktarıldı';
    if (this.props.onLandCreated) {
      this.props.onLandCreated(r.land, msg, r.name);
      return;
    }
    this.setState({ ...r.land, empty: false, tool: 'select', sel: null, split: null, addPrev: null, drawPts: [], bgEdit: null, menu: null, locked: [], undo: [], redo: [] }, () => this.doFit());
    this.showSnack(msg);
  };

  importSample = () => {
    if (this.props.onLandCreated) {
      this.props.onLandCreated(sample(), 'Örnek arazi içe aktarıldı');
      return;
    }
    this.setState({ ...sample(), empty: false, tool: 'select', sel: null, undo: [], redo: [] }, () => this.doFit());
    this.showSnack('Örnek arazi içe aktarıldı');
  };

  // ---------- tools / menus ----------
  setTool(id: ToolId) {
    const s = this.state;
    if (id === 'view') {
      this.setState({ menu: { kind: 'view' } });
      return;
    }
    if (id === 'more') {
      this.setState({ menu: { kind: s.sel ? s.sel.type : 'top' } });
      return;
    }
    if (s.empty && id !== 'select') {
      this.showHint('Önce arazi sınırı oluşturun');
      return;
    }
    if (s.t3d > 0 && id !== 'select') {
      this.showHint('Düzenleme için 2D görünüme geçin');
      return;
    }
    if (s.bgEdit) this.setState({ bgEdit: null });
    if (id === 'select') this.setState({ tool: 'select', split: null, addPrev: null });
    if (id === 'addv') this.setState({ tool: 'addv', split: null, addPrev: null, sel: s.sel && s.sel.type === 'edge' ? s.sel : null });
    if (id === 'split') {
      const pid = s.sel && s.sel.type === 'parcel' ? s.sel.id : null;
      this.setState({ tool: 'split', addPrev: null, split: { pid, p1: null, p2: null, cur: 1 } });
    }
  }

  exitTool = () => {
    if (this.state.bgEdit) {
      this.setState({ bgEdit: null });
      return;
    }
    if (this.state.tool === 'draw') {
      this.setState({ tool: 'select', drawPts: [] });
      return;
    }
    this.setState({ tool: 'select', split: null, addPrev: null });
  };

  set3d(on: boolean) {
    const s = this.state;
    this.want3d = on;
    if (on && s.tool !== 'select') this.setState({ tool: 'select', split: null, addPrev: null });
    if (on && s.bgEdit) this.setState({ bgEdit: null });
    if (on && s.sel && s.sel.type !== 'parcel') this.setState({ sel: null });
    const T = on ? 1 : 0;
    this.animView(this.fit({ ...this.state }, T), T, 520);
  }

  openTopMenu = () => this.setState({ menu: { kind: 'top' } });
  closeMenu = () => this.setState({ menu: null });
  cancelConfirm = () => this.setState({ confirm: null });

  doConfirm = () => {
    const c = this.state.confirm;
    if (c) this.mergeParcels(c.key);
  };

  askMerge(key: string) {
    const e = edgeMap(this.state)[key];
    if (!e || e.ps.length < 2) return;
    this.setState({ menu: null, confirm: { a: e.ps[0], b: e.ps[1], key } });
  }

  toggleLock(key: string) {
    this.setState((s) => ({ locked: s.locked.includes(key) ? s.locked.filter((k) => k !== key) : [...s.locked, key], menu: null }));
  }

  /** Commands passed to the panel / menu view-model builders. */
  act: EditorActions = {
    setTool: (id) => this.setTool(id),
    exitTool: () => this.exitTool(),
    selectParcel: (id) => this.setState({ sel: { type: 'parcel', id }, sheet: 'half' }),
    openMenu: (kind: MenuKind) => this.setState({ menu: { kind } }),
    closeMenu: () => this.closeMenu(),
    setSheet: (sheet) => this.setState({ sheet }),
    startAddVertex: (key) => this.setState({ addPrev: { key, t: 0.5 } }),
    cancelAddVertex: () => this.setState({ addPrev: null }),
    confirmAddVertex: () => this.confirmAddV(),
    removeVertex: (id) => this.removeVertex(id),
    makeCorner: (id) => this.makeCorner(id),
    pickBg: () => this.fileRef.current?.click(),
    importFile: () => this.importRef.current?.click(),
    exportPdf: () => void this.exportPdf(),
    editBg: (mode: BgEditMode) => {
      if (this.state.t3d > 0) this.set3d(false);
      this.setState((s) => ({ bgEdit: mode, bg: s.bg && { ...s.bg, hidden: false }, split: null, addPrev: null, sel: null, tool: s.tool === 'draw' ? 'draw' : 'select' }));
    },
    updateBg: (patch, label) => {
      const bg = this.state.bg;
      if (bg) this.commit({ bg: { ...bg, ...patch } }, label);
    },
    removeBg: () => {
      this.commit({ bg: null, bgEdit: null }, 'Arkaplan kaldırma');
      this.showSnack('Arkaplan kaldırıldı', 'Geri Al', 'undo');
    },
    focusVertex: (id) => {
      const st = this.state, L = this.lay(st), v = st.verts[id], q = proj(st)(v.x, v.y);
      this.setState((s) => ({ view: { ...s.view, x: s.view.x + L.cv.w / 2 - q.x, y: s.view.y + L.cv.h / 3 - q.y } }));
    },
    askMerge: (key) => this.askMerge(key),
    toggleLock: (key) => this.toggleLock(key),
    toggleAreas: () => this.setState((s) => ({ showAreas: !s.showAreas })),
    toggleLengths: () => this.setState((s) => ({ showLengths: !s.showLengths })),
    set3d: (on) => this.set3d(on),
    doFit: () => this.doFit(),
    doSplit: () => this.doSplit(),
    finishDraw: () => this.finishDraw(),
    newLand: () => {
      if (this.props.onNewLand) this.props.onNewLand();
      else this.setState({ empty: true, tool: 'select', sel: null, split: null, addPrev: null });
    },
  };

  // ---------- bottom sheet drag ----------
  sheetDown = (e: PointerEvent<HTMLDivElement>) => {
    const L = this.lay();
    if (!L.phone || ['split', 'addv', 'draw', 'drag'].includes(panelKind(this.state))) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.sd = { y0: e.clientY, h0: sheetH(this.state, L), t0: performance.now(), moved: false };
  };

  sheetMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!this.sd) return;
    const dy = e.clientY - this.sd.y0;
    if (Math.abs(dy) > 4) this.sd.moved = true;
    if (!this.sd.moved) return;
    const lv = levels(this.lay());
    this.setState({ sheetDrag: clamp(this.sd.h0 - dy, lv.collapsed - 20, lv.full + 20) });
  };

  /** Tap cycles collapsed → half → full; drag snaps to the nearest level (or flings one step). */
  sheetUp = (e: PointerEvent<HTMLDivElement>) => {
    const sd = this.sd;
    if (!sd) return;
    this.sd = null;
    const s = this.state, lv = levels(this.lay(s));
    if (!sd.moved) {
      const i = SHEET_ORDER.indexOf(s.sheet);
      this.setState({ sheet: SHEET_ORDER[(i + 1) % 3], sheetDrag: null });
      return;
    }
    const h = s.sheetDrag!, v = (e.clientY - sd.y0) / Math.max(1, performance.now() - sd.t0);
    let best: SheetLevel = 'collapsed', bd = 1e9;
    SHEET_ORDER.forEach((k) => {
      const d = Math.abs(lv[k] - h);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    if (Math.abs(v) > 0.5) {
      const cur = SHEET_ORDER.indexOf(s.sheet);
      best = SHEET_ORDER[clamp(v < 0 ? cur + 1 : cur - 1, 0, 2)];
    }
    this.setState({ sheet: best, sheetDrag: null });
  };

  // ---------- render ----------
  render() {
    const st = this.state, L = this.lay(st), P = proj(st), E = edgeMap(st), areas = areasOf(st.verts, st.parcels), tg = targets(st);
    const sc = buildScene(st, P, E, areas);
    const d = L.d, isTablet = d === 'tablet', isDesktop = d === 'desktop';
    const sh = sheetH(st, L);
    const k = st.view.k;
    const kind = panelKind(st);
    const cv = L.cv;
    const tool = st.tool;
    // Background image follows the projection; its edit handles are 2D only (they assume the flat projection).
    const bgOn = !!st.bg && !st.bg.hidden;

    // 10 m grid (50 m when zoomed out), fades out in 3D.
    const grid = (() => {
      let s = 10 * k;
      if (s < 14) s = 50 * k;
      return { s, x: st.view.x % s, y: st.view.y % s, o: st.empty ? 1 : Math.max(0, 1 - st.t3d * 1.5) };
    })();

    const scale = (() => {
      if (st.t3d > 0.3 || st.empty || (L.phone && sh > cv.h - 140)) return null;
      const nice = [2, 5, 10, 20, 50, 100, 200];
      const m = nice.find((n) => n * k >= 64) || 200;
      return { w: Math.round(m * k), text: m + ' m' };
    })();

    const mkTools = (arr: typeof TOOLS): ToolItem[] => arr.map(([id, icon, label]) => {
      const a = tool === id || (id === 'view' && !!st.menu && st.menu.kind === 'view');
      return { id, icon, label, bg: a ? ACC1 : 'transparent', fg: a ? ACC7 : INK, bar: a ? ACC : 'transparent', onClick: () => this.setTool(id) };
    });
    const tools = mkTools(TOOLS), toolsD = mkTools(TOOLS.slice(0, 3));
    const seg: SegItem[] = ([['2D', false], ['3D', true]] as const).map(([label, on]) => {
      const a = (st.t3d >= 0.5) === on;
      return { label, bg: a ? ACC : 'transparent', fg: a ? BG : INK, onClick: () => this.set3d(on) };
    });

    // Positions of floating controls.
    const pos = {
      segX: cv.l + cv.w - 12 - 96, segY: cv.t + 12,
      zoomX: cv.l + cv.w - 16 - 46, zoomY: cv.t + cv.h - 16 - 140,
      railY: cv.t + Math.max(16, (cv.h - 300) / 2),
      scaleX: cv.l + (isTablet ? 104 : 16), scaleY: L.phone ? cv.t + cv.h - sh - 44 : cv.t + cv.h - 44,
      insX: L.phone ? 12 : cv.l + (isTablet ? 104 : 24),
      insY: L.phone ? cv.t + 12 : cv.t + 16,
      insW: L.phone ? L.W - 24 - 108 : Math.min(520, cv.w - (isTablet ? 104 : 24) - (isTablet ? 130 : 40)),
    };

    // Instruction strip.
    const sp = st.split;
    const chk = sp && sp.pid ? splitCheck(st) : null;
    const I = (text: string, icon: string, step?: string, closable?: boolean, neg?: boolean): Instruction =>
      ({ text, icon, step: step || '', closable: !!closable, bg: neg ? '#fbe5e0' : INK, fg: neg ? BAD : BG });
    let instr: Instruction | null = null;
    if (st.hint) instr = I(st.hint.text, 'icon-info');
    else if (st.bgEdit === 'move') instr = I('Resmi sürükleyin · köşelerden boyutlandırın · üstteki tutamaçla döndürün', 'icon-move', 'Arkaplan', true);
    else if (st.bgEdit === 'crop') instr = I('Kenar ve köşeleri sürükleyerek kırpın', 'icon-crop', 'Arkaplan', true);
    else if (tool === 'draw') instr = I(st.drawPts.length >= 3 ? 'Kapatmak için ilk noktaya dokunun' : 'Her köşe için dokunun', 'icon-pen-tool', st.drawPts.length + ' nokta', true);
    else if (tool === 'addv' && !st.addPrev) instr = I('Köşe eklemek için bir sınıra dokunun', 'icon-circle-plus', '', true);
    else if (tool === 'split') {
      if (!sp || !sp.pid) instr = I('Bölünecek parseli seçin', 'icon-scissors', '', true);
      else if (!sp.p1) instr = I('İlk sınır noktasını seçin', 'icon-scissors', '1/2', true);
      else if (!sp.p2) instr = I('İkinci sınır noktasını seçin', 'icon-scissors', '2/2', true);
      else if (chk && !chk.ok) instr = I(chk.msg!, 'icon-triangle-alert', '', true, true);
      else instr = I('Önizlemeyi kontrol edip onaylayın', 'icon-scissors', '', true);
    } else if (st.t3d > 0.5 && !L.phone) instr = I('Döndürmek için sürükleyin · düzenleme 2D’de', 'icon-rotate-3d');

    // Drag readout above the finger.
    let ro: Readout = { show: false };
    if (st.drag) {
      const dd = st.drag;
      if (dd.kind === 'vertex') {
        const v = st.verts[dd.id];
        if (dd.ghost) {
          const q = P(dd.ghost.x, dd.ghost.y);
          ro = { show: true, x: q.x, y: q.y - 30, text: dd.msg!, icon: 'icon-triangle-alert', fg: BG, bg: BAD };
        } else {
          const q = P(v.x, v.y);
          ro = { show: true, x: q.x, y: q.y - 34, text: 'Δ ' + fL(hyp(v, dd.start)), icon: 'icon-move', fg: BG, bg: INK };
        }
      } else {
        const e = edgeInfo(st, dd.id);
        if (e) {
          const q = P(e.mid.x, e.mid.y);
          if (dd.ghost) ro = { show: true, x: q.x, y: q.y - 44, text: dd.msg!, icon: 'icon-triangle-alert', fg: BG, bg: BAD };
          else ro = { show: true, x: q.x, y: q.y - 44, text: (dd.off >= 0 ? '+' : '−') + fL(Math.abs(dd.off)), icon: 'icon-move-vertical', fg: BG, bg: INK };
        }
      }
    }

    const pc = buildPanel(st, E, areas, tg, kind, chk, this.act);
    const frame: PanelFrame = L.phone
      ? {
        l: L.pl, t: L.H - L.bH - sh, w: L.pw, h: sh,
        borderTop: '2px solid rgba(32,30,29,0.4)', borderLeft: '0', shadow: '0 -3px 10px rgba(45,43,43,0.10)',
        transition: st.sheetDrag != null ? 'none' : 'top 410ms cubic-bezier(.2,0,0,1), height 410ms cubic-bezier(.2,0,0,1)',
        headerPadding: '0 16px 8px',
      }
      : {
        l: L.pl, t: cv.t, w: L.pw, h: cv.h,
        borderTop: '0', borderLeft: '2px solid rgba(32,30,29,0.4)', shadow: 'none', transition: 'none', headerPadding: '16px 16px 12px',
      };

    let menu: MenuView | null = null;
    if (st.menu) {
      const mm = buildMenu(st, st.menu.kind, this.act, this.props.landName || 'Karaağaç Arazisi');
      if (mm) {
        const rowH = L.phone ? 56 : 44;
        if (L.phone) menu = { ...mm, x: L.pl, w: L.pw, y: L.H - (mm.items.length * rowH + 72 + 24), pb: 24, rowH, scrim: 'rgba(45,43,43,0.32)' };
        else {
          const w = 300;
          let x = st.menu.x != null ? st.menu.x : L.W - w - 12, y = st.menu.y != null ? st.menu.y : L.statusH + L.tH + 4;
          x = Math.min(x, L.W - w - 8);
          y = Math.min(y, L.H - (mm.items.length * rowH + 80));
          menu = { ...mm, x, y, w, pb: 0, rowH, scrim: 'transparent' };
        }
      }
    }

    let cf: ConfirmView | null = null;
    if (st.confirm) {
      const A = st.parcels.find((p) => p.id === st.confirm!.a), B = st.parcels.find((p) => p.id === st.confirm!.b);
      if (A && B) {
        const tot = areas[A.id] + areas[B.id];
        const text = A.name + ' ve ' + B.name + ' birleştirilecek.';
        const sub = 'Yeni alan ' + fA(tot) + ' · ' + fDn(tot) + ' · Geri alınabilir';
        cf = L.phone ? { text, sub, x: L.pl, w: L.pw, y: L.H - 236, pb: 28 } : { text, sub, w: 380, x: cv.l + (cv.w - 380) / 2, y: cv.t + cv.h / 2 - 110, pb: 16 };
      }
    }

    let snack: SnackView | null = null;
    if (st.snack) {
      const w = L.phone ? Math.min(L.W - 24, 560) : Math.min(420, cv.w - 48);
      snack = {
        msg: st.snack.msg, action: st.snack.action || '', w,
        x: L.phone ? (L.W - w) / 2 : cv.l + (cv.w - w) / 2,
        y: L.phone ? cv.t + cv.h - sh - 60 : cv.t + cv.h - 72,
      };
    }

    const g = this.g;
    let cursor = 'grab';
    if (g && (g.type === 'pan' || g.type === 'vdrag' || g.type === 'edrag' || g.type === 'orbit')) cursor = 'grabbing';
    else if (tool === 'split' || tool === 'draw' || tool === 'addv') cursor = 'crosshair';
    else if (st.hover) cursor = st.hover.type === 'parcel' ? 'pointer' : 'grab';

    const showPanel = L.phone ? sh > 0 : true;

    return (
      <div ref={this.rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BG, color: INK, fontFamily: 'Archivo,system-ui,sans-serif', fontSize: 14, lineHeight: 1.35, WebkitFontSmoothing: 'antialiased', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
        <div
          ref={this.cvRef}
          onPointerDown={this.onDown}
          onPointerMove={this.onMove}
          onPointerUp={this.onUp}
          onPointerCancel={this.onUp}
          onPointerLeave={this.onLeave}
          onContextMenu={this.onCtx}
          style={{ position: 'absolute', left: cv.l, top: cv.t, width: cv.w, height: cv.h, overflow: 'hidden', touchAction: 'none', background: '#e3e0e0', cursor }}
        >
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: grid.o, backgroundImage: 'linear-gradient(#d6d2d2 1px,transparent 1px),linear-gradient(90deg,#d6d2d2 1px,transparent 1px)', backgroundSize: `${grid.s}px ${grid.s}px`, backgroundPosition: `${grid.x}px ${grid.y}px` }} />
          {bgOn && <BgLayer bg={st.bg!} P={P} cropping={st.bgEdit === 'crop'} />}
          <SceneSvg sc={sc} />
          {bgOn && st.bgEdit && st.t3d === 0 && (
            <BgHandles bg={st.bg!} view={st.view} mode={st.bgEdit} onChange={(bg) => this.setState({ bg })} onEnd={this.bgGestureEnd} />
          )}
          <MapOverlays sc={sc} ro={ro} />
          {st.empty && tool !== 'draw' && <EmptyState onDraw={this.startDraw} onImport={this.act.importFile} onSample={this.importSample} />}
        </div>

        <input ref={this.fileRef} type="file" accept="image/*" onChange={this.onBgFile} style={{ display: 'none' }} />
        <input ref={this.importRef} type="file" accept=".pdf,application/pdf" onChange={this.onImportFile} style={{ display: 'none' }} />

        {L.statusH > 0 && <StatusBar height={L.statusH} />}

        <TopBar
          top={L.statusH}
          title={this.props.landName || 'Karaağaç Arazisi'}
          onRename={this.props.onRename}
          onBack={this.props.onBack}
          height={L.tH}
          subtitle={st.empty ? 'Sınır tanımlı değil' : 'Ada 214 · ' + st.parcels.length + ' parsel · ' + fDn(st.landArea)}
          desktop={isDesktop}
          tools={toolsD}
          seg={seg}
          undoColor={st.undo.length ? INK : DISABLED}
          redoColor={st.redo.length ? INK : DISABLED}
          onUndo={this.doUndo}
          onRedo={this.doRedo}
          onMenu={this.openTopMenu}
        />

        {!isDesktop && !st.empty && <FloatingViewControls x={pos.segX} y={pos.segY} seg={seg} showFit={L.phone} onFit={this.doFit} />}
        {!L.phone && !st.empty && <ZoomControls x={pos.zoomX} y={pos.zoomY} onZoomIn={this.zoomIn} onZoomOut={this.zoomOut} onFit={this.doFit} />}
        {scale && <ScaleBar x={pos.scaleX} y={pos.scaleY} w={scale.w} text={scale.text} />}
        {instr && <InstructionBar x={pos.insX} y={pos.insY} maxWidth={pos.insW} instr={instr} onClose={this.exitTool} />}
        {isTablet && <ToolRail top={pos.railY} tools={tools} />}
        {showPanel && (
          <DetailPanel frame={frame} pc={pc} phone={L.phone} sheet={{ onPointerDown: this.sheetDown, onPointerMove: this.sheetMove, onPointerUp: this.sheetUp }} />
        )}
        {L.phone && <BottomToolbar height={L.bH} tools={tools} />}
        {snack && <Snackbar s={snack} onAction={this.snackAct} />}
        {menu && <ActionMenu m={menu} onClose={this.closeMenu} />}
        {cf && <MergeConfirm c={cf} onCancel={this.cancelConfirm} onConfirm={this.doConfirm} />}
      </div>
    );
  }
}

