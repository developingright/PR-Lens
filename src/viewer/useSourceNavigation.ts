import { useEffect, useRef } from 'react';
import type { GalleryStore } from '../gallery/model';

/** Follow a source link only after Base UI has finished releasing its modal. */
export function useSourceNavigation(gallery: GalleryStore) {
  const pending = useRef<{ source: URL; from: string } | null>(null);
  const frame = useRef<number | null>(null);
  const cleanupTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      pending.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (cleanupTimer.current !== null) clearTimeout(cleanupTimer.current);
    };
  }, []);

  return {
    start(sourceUrl: string) {
      pending.current = {
        source: new URL(sourceUrl, window.location.href),
        from: window.location.href,
      };
      gallery.close();
    },
    isPending: () => pending.current !== null || frame.current !== null,
    onOpenChangeComplete(open: boolean) {
      if (open || !pending.current) return;
      const navigation = pending.current;
      pending.current = null;
      // Allow portal unmount, focus/inert cleanup, and the queued scroll-lock release
      // to commit before GitHub handles a fragment or document navigation.
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          if (gallery.getSnapshot().open || window.location.href !== navigation.from) return;
          const { source } = navigation;
          const sameDocument =
            source.origin === window.location.origin &&
            source.pathname === window.location.pathname &&
            source.search === window.location.search;
          window.location.assign(source.href);
          if (!sameDocument || !source.hash) return;
          cleanupTimer.current = window.setTimeout(() => {
            cleanupTimer.current = null;
            if (window.location.href !== source.href) return;
            window.history.replaceState(
              window.history.state,
              '',
              `${window.location.pathname}${window.location.search}`,
            );
          }, 0);
        });
      });
    },
  };
}
