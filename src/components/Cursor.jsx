import { useEffect, useRef } from 'react';

/** Animated dot + trailing ring cursor (desktop only; toggle in Settings). */
export default function Cursor() {
  const dot = useRef();
  const ring = useRef();

  useEffect(() => {
    document.body.classList.add('custom-cursor');
    const pos = { x: -100, y: -100 };
    const rPos = { x: -100, y: -100 };
    let hovering = false, clicking = false, raf;

    const onMove = e => { pos.x = e.clientX; pos.y = e.clientY; };
    const onDown = () => { clicking = true; };
    const onUp = () => { clicking = false; };
    const onOver = e => { hovering = !!e.target.closest?.('button,a,[role=button],textarea,input,select,label,.clickable'); };
    const onLeave = () => { pos.x = -100; pos.y = -100; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseover', onOver);
    document.addEventListener('mouseleave', onLeave);

    const animate = () => {
      if (dot.current && ring.current) {
        dot.current.style.transform = `translate(${pos.x - 4}px,${pos.y - 4}px) scale(${clicking ? 0.5 : 1})`;
        rPos.x += (pos.x - rPos.x) * 0.18;
        rPos.y += (pos.y - rPos.y) * 0.18;
        const scale = hovering ? 1.7 : clicking ? 0.7 : 1;
        ring.current.style.transform = `translate(${rPos.x - 16}px,${rPos.y - 16}px) scale(${scale})`;
        ring.current.style.borderColor = hovering ? 'var(--accent)' : 'var(--accent-ring)';
        ring.current.style.background = hovering ? 'var(--accent-glow)' : 'transparent';
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove('custom-cursor');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const base = { position: 'fixed', top: 0, left: 0, borderRadius: '50%', pointerEvents: 'none' };
  return (
    <>
      <div ref={dot} aria-hidden style={{ ...base, width: 8, height: 8, background: 'var(--accent)', zIndex: 99999, transition: 'transform 0.06s ease' }} />
      <div ref={ring} aria-hidden style={{ ...base, width: 32, height: 32, border: '1.5px solid var(--accent-ring)', zIndex: 99998, transition: 'border-color .2s, background .2s' }} />
    </>
  );
}
