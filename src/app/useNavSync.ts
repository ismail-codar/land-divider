import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { navKey, type EditorNav } from '../editor/nav';

/**
 * Turns editor nav changes into history entries:
 * - selection / tool / view changes and opening an overlay push,
 * - sheet-only changes and corrections replace,
 * - closing an overlay that was opened with a push goes back, so the Back button never reopens it.
 */
export function useNavSync(nav: EditorNav, go: (nav: EditorNav, replace: boolean) => void) {
  const router = useRouter();
  const navRef = useRef(nav);
  const overlayPushed = useRef(false);
  navRef.current = nav;

  useEffect(() => {
    if (!nav.menu && !nav.merge) overlayPushed.current = false;
  }, [nav.menu, nav.merge]);

  return (next: EditorNav, opts: { replace: boolean }) => {
    const cur = navRef.current;
    if (opts.replace) return go(next, true);
    const had = !!(cur.menu || cur.merge), has = !!(next.menu || next.merge);
    if (had && !has) {
      const pushed = overlayPushed.current;
      overlayPushed.current = false;
      if (pushed && navKey(next) === navKey({ ...cur, menu: null, merge: null })) return router.history.back();
      return go(next, true);
    }
    if (had && has) return go(next, true);
    if (has) {
      overlayPushed.current = true;
      return go(next, false);
    }
    const onlySheet = navKey({ ...next, sheet: cur.sheet }) === navKey(cur);
    go(next, onlySheet);
  };
}
