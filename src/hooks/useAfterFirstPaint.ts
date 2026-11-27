import { useEffect, useState } from 'react';

/**
 * True once the page has painted and the browser is idle (or 1.5 s have passed), and never on
 * Save-Data / 2G connections. Used to keep the heavy 3D hero from competing with the first photo and text.
 */
export function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const afterLoad = () => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(go, { timeout: 1500 });
      else timer = window.setTimeout(go, 800);
    };
    let idle = 0;
    let timer = 0;
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      done = true;
      window.removeEventListener('load', afterLoad);
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, []);
  return ready;
}
