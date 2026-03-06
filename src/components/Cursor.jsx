import { useEffect, useRef } from 'react';
import { C } from '../styles/tokens';

export default function Cursor() {
  const dot  = useRef();
  const ring = useRef();
  const pos  = useRef({ x: 0, y: 0 });
  const rPos = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const clicking = useRef(false);

  useEffect(() => {
    let raf;
    const onMove  = e => { pos.current = { x: e.clientX, y: e.clientY }; };
    const onDown  = () => { clicking.current = true; };
    const onUp    = () => { clicking.current = false; };
    const onOver  = e => {
      hovering.current = !!(e.target.closest('button,a,[role=button],textarea,input,.clickable'));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('mouseover', onOver);

    const animate = () => {
      if (dot.current && ring.current) {
        const { x, y } = pos.current;
        dot.current.style.transform =
          `translate(${x - 4}px,${y - 4}px) scale(${clicking.current ? 0.5 : 1})`;

        rPos.current.x += (x - rPos.current.x) * 0.12;
        rPos.current.y += (y - rPos.current.y) * 0.12;
        const scale = hovering.current ? 1.8 : clicking.current ? 0.7 : 1;
        ring.current.style.transform =
          `translate(${rPos.current.x - 16}px,${rPos.current.y - 16}px) scale(${scale})`;
        ring.current.style.borderColor  = hovering.current ? C.accent : 'rgba(91,142,245,0.5)';
        ring.current.style.background   = hovering.current ? C.accentGlow : 'transparent';
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dot} style={{
        position: 'fixed', top: 0, left: 0, width: 8, height: 8,
        background: C.accent, borderRadius: '50%', pointerEvents: 'none',
        zIndex: 99999, mixBlendMode: 'screen', transition: 'transform 0.08s ease',
      }} />
      <div ref={ring} style={{
        position: 'fixed', top: 0, left: 0, width: 32, height: 32,
        border: '1.5px solid rgba(91,142,245,0.5)', borderRadius: '50%',
        pointerEvents: 'none', zIndex: 99998,
        transition: 'border-color 0.2s, background 0.2s, transform 0.06s ease',
      }} />
    </>
  );
}
