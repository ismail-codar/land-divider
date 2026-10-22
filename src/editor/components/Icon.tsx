import type { CSSProperties } from 'react';

/** Lucide icon-font glyph; `name` is the full class, e.g. "icon-scissors". */
export default function Icon({ name, size, style }: { name: string; size: number; style?: CSSProperties }) {
  return <i className={name} style={{ fontSize: size, ...style }} />;
}
