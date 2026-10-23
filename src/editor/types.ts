export type Device = 'phone' | 'tabletPortrait' | 'tablet' | 'desktop';

export type Scenario =
  | 'idle' | 'parcel' | 'edge' | 'vertex' | 'vdrag' | 'invalid' | 'edrag' | 'split1' | 'split2'
  | 'sheetFull' | '3d' | 'more' | 'undo' | 'locked' | 'merge' | 'addv' | 'empty' | 'draw';

export interface Pt { x: number; y: number }

/** 'fixed' = land corner, [a, b] = slides along the outer edge a→b, null = free. */
export type VertexConstraint = 'fixed' | [string, string] | null;
export interface Vertex extends Pt { c: VertexConstraint }
export type Verts = Record<string, Vertex>;

export interface Parcel {
  id: string;
  num: number;
  name: string;
  ring: string[];
  owner: string;
  share: number;
  use: string;
  h: number;
}

export interface Edge { k: string; a: string; b: string; ps: string[] }
export interface EdgeInfo extends Edge { len: number; n: Pt; mid: Pt }
export type EdgeMap = Record<string, Edge>;

export type SelType = 'parcel' | 'edge' | 'vertex';
export interface Selection { type: SelType; id: string }
export interface Hover extends Selection { k: string }

export type Tool = 'select' | 'addv' | 'split' | 'draw';
export type ToolId = Tool | 'view' | 'more';
export type SheetLevel = 'collapsed' | 'half' | 'full';
export type MenuKind = 'parcel' | 'edge' | 'vertex' | 'neighbors' | 'view' | 'top';

export interface View { x: number; y: number; k: number }

interface DragBase {
  id: string;
  v0: Verts;
  before: Record<string, number>;
  msg?: string | null;
  frozen?: boolean;
}
export interface VertexDrag extends DragBase { kind: 'vertex'; start: Pt; ghost?: Pt | null }
export interface EdgeDrag extends DragBase { kind: 'edge'; n: Pt; e?: EdgeInfo; off: number; ghost?: { a: Pt; b: Pt } | null }
export type Drag = VertexDrag | EdgeDrag;

export interface SplitPoint extends Pt { vid?: string; edge?: string }
export interface SplitState { pid: string | null; p1: SplitPoint | null; p2: SplitPoint | null; cur: number }

export interface AddPreview { key: string; t: number }
export interface HistoryEntry { verts: Verts; parcels: Parcel[]; land: string[]; bg: BgImage | null; label: string }

/** Background image in world units: full image at (x, y) with width w, rotated by rot (rad) about its center; crop = visible fractions of it. */
export interface BgImage {
  src: string;
  iw: number;
  ih: number;
  x: number;
  y: number;
  w: number;
  rot: number;
  crop: { l: number; t: number; r: number; b: number };
  opacity: number;
  hidden: boolean;
}
export type BgEditMode = 'move' | 'crop';
export interface Snack { msg: string; action?: string; fn?: 'undo' | 'redo' }
export interface MenuState { kind: MenuKind; x?: number; y?: number }
export interface ConfirmState { a: string; b: string; key: string }

export interface LandModel {
  verts: Verts;
  parcels: Parcel[];
  land: string[];
  orient: number;
  landArea: number;
  cx: number;
  cy: number;
  nextNum: number;
  nextV: number;
  bg?: BgImage | null;
}

export interface EditorState extends LandModel {
  sel: Selection | null;
  tool: Tool;
  split: SplitState | null;
  addPrev: AddPreview | null;
  drawPts: Pt[];
  empty: boolean;
  view: View;
  t3d: number;
  yaw: number;
  tiltAmt: number;
  sheet: SheetLevel;
  sheetDrag: number | null;
  drag: Drag | null;
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  snack: Snack | null;
  hint: { text: string } | null;
  menu: MenuState | null;
  confirm: ConfirmState | null;
  locked: string[];
  showAreas: boolean;
  showLengths: boolean;
  hover: Hover | null;
  bgEdit: BgEditMode | null;
  W: number;
  H: number;
}

/** What the detail panel / bottom sheet is currently about. */
export type PanelKind = 'draw' | 'split' | 'addv' | 'drag' | SelType | 'none';

/** Projected screen point; `d` is the depth used for 3D painter ordering. */
export interface ScreenPt extends Pt { d: number }
export type Projector = (x: number, y: number, z?: number) => ScreenPt;

/** Commands the editor exposes to its panel, menu and toolbar builders. */
export interface EditorActions {
  setTool(id: ToolId): void;
  exitTool(): void;
  selectParcel(id: string): void;
  openMenu(kind: MenuKind): void;
  closeMenu(): void;
  setSheet(level: SheetLevel): void;
  startAddVertex(edgeKey: string): void;
  cancelAddVertex(): void;
  confirmAddVertex(): void;
  removeVertex(id: string): void;
  deleteEdge(edgeKey: string): void;
  makeCorner(id: string): void;
  pickBg(): void;
  importFile(): void;
  exportPdf(): void;
  editBg(mode: BgEditMode): void;
  updateBg(patch: Partial<BgImage>, label: string): void;
  removeBg(): void;
  focusVertex(id: string): void;
  askMerge(edgeKey: string): void;
  toggleLock(edgeKey: string): void;
  toggleAreas(): void;
  toggleLengths(): void;
  set3d(on: boolean): void;
  doFit(): void;
  doSplit(): void;
  finishDraw(): void;
  newLand(): void;
}
