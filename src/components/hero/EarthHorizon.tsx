import { useEffect, useRef, type RefObject } from 'react';

interface EarthHorizonProps {
  containerRef: RefObject<HTMLElement | null>;
}

export function EarthHorizon({ containerRef }: EarthHorizonProps) {
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = containerRef.current;
    const orbit = orbitRef.current;
    if (!hero || !orbit) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0;
    let y = 0;

    const update = () => {
      frame = 0;
      orbit.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType !== 'mouse') return;
      x = (event.clientX / window.innerWidth - 0.5) * 20;
      y = (event.clientY / window.innerHeight - 0.5) * 12;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      x = 0;
      y = 0;
      orbit.style.transform = 'translate3d(0, 0, 0)';
    };

    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset, { passive: true });
    reducedMotion.addEventListener('change', reset);
    finePointer.addEventListener('change', reset);
    return () => {
      window.cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', reset);
      reducedMotion.removeEventListener('change', reset);
      finePointer.removeEventListener('change', reset);
    };
  }, [containerRef]);

  return (
    <div className="hero-earth" aria-hidden="true">
      <img
        className="hero-earth__image"
        src="/images/earth-horizon-illustrated.webp"
        alt=""
        width="1983"
        height="793"
        loading="eager"
        decoding="async"
      />
      <div className="hero-earth__orbits" ref={orbitRef}>
        <svg className="hero-earth__orbit-art" viewBox="0 0 1200 620" preserveAspectRatio="none" focusable="false">
          <path d="M-25 340C265 122 916 120 1225 342" />
          <path d="M82 465C344 252 853 252 1125 459" />
          <circle cx="146" cy="263" r="4" className="hero-earth__orbit-point" />
          <circle cx="1026" cy="258" r="3.5" className="hero-earth__orbit-point" />
          <circle cx="730" cy="220" r="2.5" className="hero-earth__orbit-point" />
          <circle cx="292" cy="382" r="8" className="hero-earth__orbit-shape" />
          <rect x="956" y="350" width="11" height="11" rx="2" className="hero-earth__orbit-shape" />
          <rect x="548" y="136" width="8" height="8" rx="1" transform="rotate(45 552 140)" className="hero-earth__orbit-shape" />
        </svg>
      </div>
    </div>
  );
}
