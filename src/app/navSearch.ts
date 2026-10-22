// URL <-> editor nav mapping for the /lands/$landId routes.
import { defaultSheet, type EditorNav } from '../editor/nav';
import type { MenuKind, Selection, SheetLevel } from '../editor/types';

/** Search params of the land editor. Defaults are omitted from the URL. */
export interface LandSearch {
  view?: '3d';
  sheet?: SheetLevel;
  tool?: 'split' | 'addv' | 'draw';
  edge?: string;
  vertex?: string;
  menu?: MenuKind;
  /** Edge key of a pending merge confirmation. */
  merge?: string;
}

const SHEETS: SheetLevel[] = ['collapsed', 'half', 'full'];
const TOOLS = ['split', 'addv', 'draw'] as const;
const MENUS: MenuKind[] = ['parcel', 'edge', 'vertex', 'neighbors', 'view', 'top'];

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined);

export function validateLandSearch(s: Record<string, unknown>): LandSearch {
  return {
    view: s.view === '3d' ? '3d' : undefined,
    sheet: oneOf(s.sheet, SHEETS),
    tool: oneOf(s.tool, TOOLS),
    edge: str(s.edge),
    vertex: str(s.vertex),
    menu: oneOf(s.menu, MENUS),
    merge: str(s.merge),
  };
}

export function navFromUrl(parcelId: string | undefined, s: LandSearch): EditorNav {
  const sel: Selection | null = parcelId
    ? { type: 'parcel', id: parcelId }
    : s.edge ? { type: 'edge', id: s.edge }
    : s.vertex ? { type: 'vertex', id: s.vertex }
    : null;
  return {
    sel,
    view3d: s.view === '3d',
    sheet: s.sheet ?? defaultSheet(sel),
    tool: s.tool ?? 'select',
    menu: s.menu ?? null,
    merge: s.merge ?? null,
  };
}

export function navToUrl(n: EditorNav): { parcelId?: string; search: LandSearch } {
  const sel = n.sel;
  return {
    parcelId: sel && sel.type === 'parcel' ? sel.id : undefined,
    search: {
      view: n.view3d ? '3d' : undefined,
      sheet: n.sheet !== defaultSheet(sel) ? n.sheet : undefined,
      tool: n.tool !== 'select' ? n.tool : undefined,
      edge: sel && sel.type === 'edge' ? sel.id : undefined,
      vertex: sel && sel.type === 'vertex' ? sel.id : undefined,
      menu: n.menu ?? undefined,
      merge: n.merge ?? undefined,
    },
  };
}
