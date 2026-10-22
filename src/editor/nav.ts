// The part of editor state that is mirrored in the URL (selection, mode, view, overlays).
import type { MenuKind, Selection, SheetLevel, Tool } from './types';

export interface EditorNav {
  sel: Selection | null;
  view3d: boolean;
  sheet: SheetLevel;
  tool: Tool;
  menu: MenuKind | null;
  /** Edge key of the pending merge confirmation. */
  merge: string | null;
}

export const navKey = (n: EditorNav) =>
  [n.sel ? n.sel.type + ':' + n.sel.id : '', n.view3d ? '3d' : '2d', n.sheet, n.tool, n.menu || '', n.merge || ''].join('/');

export const defaultSheet = (sel: Selection | null): SheetLevel => (sel ? 'half' : 'collapsed');
