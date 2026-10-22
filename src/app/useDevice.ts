import { useEffect, useState } from 'react';
import type { Device } from '../editor/types';

/** Picks the editor layout from the viewport size. */
function deviceFor(w: number, h: number): Device {
  if (w < 600) return 'phone';
  if (w < 1000) return w > h ? 'tablet' : 'tabletPortrait';
  if (w < 1300) return 'tablet';
  return 'desktop';
}

export function useDevice(): Device {
  const [d, setD] = useState(() => deviceFor(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const on = () => setD(deviceFor(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return d;
}
