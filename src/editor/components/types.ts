/** Toolbar entry (bottom bar, tablet rail, desktop top bar). */
export interface ToolItem { id: string; icon: string; label: string; bg: string; fg: string; bar: string; onClick: () => void }
/** 2D / 3D segmented-control entry. */
export interface SegItem { label: string; bg: string; fg: string; onClick: () => void }
