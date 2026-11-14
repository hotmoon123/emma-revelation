import { useCallback, useRef } from 'react';

/**
 * Publishes the fixed audio player's real height as the CSS variable `--player-h`,
 * so page content always reserves enough room (see `#main` in index.css).
 * pb-32 stays as the minimum; this covers taller layouts such as phones.
 */
export function usePlayerInset() {
  const observer = useRef<ResizeObserver | null>(null);
  return useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty('--player-h');
      return;
    }
    const publish = () => root.style.setProperty('--player-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(publish);
      observer.current.observe(el);
    }
  }, []);
}
