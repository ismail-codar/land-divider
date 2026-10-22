import { useRef, type PointerEvent as RPointerEvent } from 'react';
import { ACC, BG } from '../constants';
import type { BgEditMode, BgImage, Projector, Pt, View } from '../types';

const hOf = (bg: BgImage) => bg.w * (bg.ih / bg.iw);
const rotV = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

/** World position of the image point at fractions (fx, fy); the image rotates about its full-image center. */
function worldAt(bg: BgImage, fx: number, fy: number): Pt {
  const h = hOf(bg), q = rotV({ x: (fx - 0.5) * bg.w, y: (fy - 0.5) * h }, bg.rot);
  return { x: bg.x + bg.w / 2 + q.x, y: bg.y + h / 2 + q.y };
}

/** Whether world point p lies on the visible (cropped) part of the image. */
export function bgHit(bg: BgImage, p: Pt): boolean {
  const h = hOf(bg), q = rotV({ x: p.x - bg.x - bg.w / 2, y: p.y - bg.y - h / 2 }, -bg.rot);
  const fx = q.x / bg.w + 0.5, fy = q.y / h + 0.5, c = bg.crop;
  return fx >= c.l && fx <= c.r && fy >= c.t && fy <= c.b;
}

/** Full (uncropped) image and crop window in screen px, before rotation; 2D only (screen = world · k + offset). */
function rects(bg: BgImage, v: View) {
  const W = bg.w * v.k, H = hOf(bg) * v.k, X = bg.x * v.k + v.x, Y = bg.y * v.k + v.y, c = bg.crop;
  return { X, Y, W, H, cx: c.l * W, cy: c.t * H, cw: (c.r - c.l) * W, ch: (c.b - c.t) * H };
}

/** Rotated frame of the full image; children are laid out in unrotated image px. */
const frame = (r: ReturnType<typeof rects>, rot: number) =>
  ({ position: 'absolute', left: r.X, top: r.Y, width: r.W, height: r.H, transform: `rotate(${rot}rad)`, transformOrigin: '50% 50%', pointerEvents: 'none' }) as const;

/** Background image on the ground plane (z = 0), laid out in world units and mapped to screen by P's affine part,
 *  so it follows the 3D tilt / yaw too. While cropping, the cut-away part is shown faintly. */
export function BgLayer({ bg, P, cropping }: { bg: BgImage; P: Projector; cropping: boolean }) {
  const o = P(0, 0), ex = P(1, 0), ey = P(0, 1);
  const m = `matrix(${ex.x - o.x},${ex.y - o.y},${ey.x - o.x},${ey.y - o.y},${o.x},${o.y})`;
  const r = rects(bg, { x: 0, y: 0, k: 1 });
  const img = { position: 'absolute', width: r.W, height: r.H, maxWidth: 'none', userSelect: 'none' } as const;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: m, transformOrigin: '0 0', pointerEvents: 'none' }}>
      <div style={frame(r, bg.rot)}>
        {cropping && <img src={bg.src} alt="" draggable={false} style={{ ...img, left: 0, top: 0, opacity: 0.25 }} />}
        <div style={{ position: 'absolute', left: r.cx, top: r.cy, width: r.cw, height: r.ch, overflow: 'hidden', opacity: bg.opacity }}>
          <img src={bg.src} alt="" draggable={false} style={{ ...img, left: -r.cx, top: -r.cy }} />
        </div>
      </div>
    </div>
  );
}

/** Handle id: 'body', 'rot', corners 'nw' | 'ne' | 'sw' | 'se', crop edges 'n' | 's' | 'w' | 'e'. */
type Handle = 'body' | 'rot' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';
const MIN_FRAC = 0.03;
const SNAP = (3 * Math.PI) / 180;

/** Applies a corner / edge drag (world delta d from the gesture start) to the start state b0. */
function apply(b0: BgImage, h: Handle, d: Pt, mode: BgEditMode): BgImage {
  if (h === 'body') return { ...b0, x: b0.x + d.x, y: b0.y + d.y };
  const c = b0.crop, h0 = hOf(b0), l = rotV(d, -b0.rot);
  const west = h.includes('w'), north = h.includes('n');
  if (mode === 'move') {
    // Proportional resize anchored at the opposite corner of the visible (cropped) rect.
    const fx = west ? c.r : c.l, fy = north ? c.b : c.t;
    const ox = ((west ? c.l : c.r) - fx) * b0.w, oy = ((north ? c.t : c.b) - fy) * h0;
    const s = Math.max(0.05, ((ox + l.x) * ox + (oy + l.y) * oy) / (ox * ox + oy * oy));
    const nb = { ...b0, w: b0.w * s };
    // Scaling moves the rotation center; shift so the anchor stays put in world space.
    const a0 = worldAt(b0, fx, fy), a1 = worldAt(nb, fx, fy);
    return { ...nb, x: b0.x + a0.x - a1.x, y: b0.y + a0.y - a1.y };
  }
  const n = { ...c };
  if (west) n.l = Math.min(Math.max(0, c.l + l.x / b0.w), c.r - MIN_FRAC);
  if (h.includes('e')) n.r = Math.max(Math.min(1, c.r + l.x / b0.w), c.l + MIN_FRAC);
  if (north) n.t = Math.min(Math.max(0, c.t + l.y / h0), c.b - MIN_FRAC);
  if (h.includes('s')) n.b = Math.max(Math.min(1, c.b + l.y / h0), c.t + MIN_FRAC);
  return { ...b0, crop: n };
}

/** Rotation from dragging the knob around the image center; snaps to multiples of 90°. */
function rotate(b0: BgImage, p0: Pt, p: Pt, o: Pt): BgImage {
  let a = b0.rot + Math.atan2(p.y - o.y, p.x - o.x) - Math.atan2(p0.y - o.y, p0.x - o.x);
  a = Math.atan2(Math.sin(a), Math.cos(a));
  const q = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
  if (Math.abs(a - q) < SNAP) a = q;
  return { ...b0, rot: a };
}

/** Edit overlay: drag the image to move it; 'move' adds resize corners and a rotate knob, 'crop' adds crop corners + edges. */
export function BgHandles({ bg, view, mode, onChange, onEnd }: {
  bg: BgImage;
  view: View;
  mode: BgEditMode;
  onChange: (bg: BgImage) => void;
  onEnd: (before: BgImage) => void;
}) {
  const g = useRef<{ h: Handle; x0: number; y0: number; o: Pt; b0: BgImage } | null>(null);
  const r = rects(bg, view);
  const down = (h: Handle) => (e: RPointerEvent<HTMLDivElement>) => {
    // Keep the canvas from starting a pan / selection under the handles.
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer may already be gone */
    }
    // Rotation pivot in client px (the frame's center; rotation keeps it in place).
    const f = e.currentTarget.closest('[data-bg-frame]')!.getBoundingClientRect();
    g.current = { h, x0: e.clientX, y0: e.clientY, o: { x: f.left + f.width / 2, y: f.top + f.height / 2 }, b0: bg };
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const s = g.current;
    if (!s) return;
    if (s.h === 'rot') onChange(rotate(s.b0, { x: s.x0, y: s.y0 }, { x: e.clientX, y: e.clientY }, s.o));
    else onChange(apply(s.b0, s.h, { x: (e.clientX - s.x0) / view.k, y: (e.clientY - s.y0) / view.k }, mode));
  };
  const up = () => {
    if (g.current) onEnd(g.current.b0);
    g.current = null;
  };
  const ev = { onPointerMove: move, onPointerUp: up, onPointerCancel: up };
  const box = (h: Handle, x: number, y: number, w: number, hh: number, cursor: string, round?: boolean) => (
    <div key={h} onPointerDown={down(h)} {...ev}
      style={{ position: 'absolute', left: x - w / 2, top: y - hh / 2, width: w, height: hh, background: BG, border: '2px solid ' + ACC, borderRadius: round ? '50%' : 0, cursor, pointerEvents: 'auto', touchAction: 'none' }} />
  );
  const L = r.cx, T = r.cy, R = r.cx + r.cw, B = r.cy + r.ch, mx = (L + R) / 2, my = (T + B) / 2;
  return (
    <div data-bg-frame style={frame(r, bg.rot)}>
      <div onPointerDown={down('body')} {...ev}
        style={{ position: 'absolute', left: L, top: T, width: r.cw, height: r.ch, outline: '2px dashed ' + ACC, cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }} />
      {box('nw', L, T, 16, 16, 'nwse-resize')}
      {box('ne', R, T, 16, 16, 'nesw-resize')}
      {box('sw', L, B, 16, 16, 'nesw-resize')}
      {box('se', R, B, 16, 16, 'nwse-resize')}
      {mode === 'move' && [
        <div key="rl" style={{ position: 'absolute', left: mx - 1, top: T - 36, width: 2, height: 36, background: ACC }} />,
        box('rot', mx, T - 36, 20, 20, 'grab', true),
      ]}
      {mode === 'crop' && [
        box('n', mx, T, 28, 8, 'ns-resize'),
        box('s', mx, B, 28, 8, 'ns-resize'),
        box('w', L, my, 8, 28, 'ew-resize'),
        box('e', R, my, 8, 28, 'ew-resize'),
      ]}
    </div>
  );
}
