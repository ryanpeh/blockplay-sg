import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Native fullscreen where available, with a viewport-filling fallback for embedded browsers. */
export function useFpsFullscreen(stage: RefObject<HTMLDivElement | null>, onPause: () => void) {
  const [immersive, setImmersive] = useState(false), [notice, setNotice] = useState('');
  const active = useRef(false), native = useRef(false), pending = useRef(false), pause = useRef(onPause);
  pause.current = onPause;
  const change = useCallback((value: boolean) => { active.current = value; setImmersive(value); }, []);
  const toggle = useCallback(async () => {
    const node = stage.current; if (!node || pending.current) return;
    if (active.current) {
      pause.current(); change(false); setNotice('');
      if (document.fullscreenElement === node) { try { await document.exitFullscreen(); } catch { setNotice('Use Escape to leave browser fullscreen.'); } }
      return;
    }
    change(true); setNotice(''); pending.current = true;
    try {
      if (!node.requestFullscreen) throw new Error('Fullscreen unavailable');
      await node.requestFullscreen();
    } catch { if (stage.current) setNotice('Expanded view · Browser fullscreen unavailable'); }
    finally { pending.current = false; }
  }, [change, stage]);
  useEffect(() => {
    const fullscreen = () => {
      if (document.fullscreenElement === stage.current) { native.current = true; change(true); setNotice(''); }
      else if (native.current) { native.current = false; change(false); pause.current(); }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current && !document.fullscreenElement) { change(false); setNotice(''); pause.current(); }
    };
    document.addEventListener('fullscreenchange', fullscreen); window.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('fullscreenchange', fullscreen); window.removeEventListener('keydown', keydown); };
  }, [change, stage]);
  useEffect(() => {
    if (!immersive) return;
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, [immersive]);
  return { immersive, notice, toggle };
}
