import { useEffect, useRef, type RefObject } from 'react';

interface AntigravityBackgroundProps {
  containerRef: RefObject<HTMLElement | null>;
  influenceRadius?: number;
  maxDisplacement?: number;
  desktopCount?: number;
}

/** One decorative canvas; no React updates, allocations or layout reads in the frame loop. */
export function AntigravityBackground({ containerRef, influenceRadius = 140, maxDisplacement = 20, desktopCount = 36 }: AntigravityBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const hero = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!hero || !canvas || !context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const radius = Math.max(60, Math.min(180, influenceRadius));
    const displacement = Math.max(0, Math.min(24, maxDisplacement));
    const particles = Array.from({ length: Math.max(8, Math.min(40, desktopCount)) }, (_, index) => ({
      // Deterministic scatter avoids hydration/random placement jumps on resize.
      x: ((index * 0.61803398875 + .055) % 1),
      y: ((index * .38196601125 + .085 + Math.floor(index / 5) * .13) % 1),
      size: index % 4 === 0 ? 3 : 6 + index % 7,
      kind: index % 4, phase: index * 2.4, depth: .4 + (index % 5) * .12,
      offsetX: 0, offsetY: 0,
    }));
    let bounds = hero.getBoundingClientRect();
    let width = bounds.width;
    let height = bounds.height;
    let count = 0;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let parallax = 0;
    let targetParallax = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    const canAnimate = () => window.innerWidth >= 768 && !reduced.matches;

    const draw = (delta: number) => {
      const moving = canAnimate();
      const blend = moving ? 1 - Math.exp(-delta / 150) : 1;
      parallax += ((moving ? targetParallax : 0) - parallax) * blend;
      context.clearRect(0, 0, width, height);
      for (let index = 0; index < count; index++) {
        const particle = particles[index];
        const driftX = moving ? Math.sin(elapsed / 7000 + particle.phase) * 6 : 0;
        const driftY = moving ? Math.cos(elapsed / 9000 + particle.phase) * 8 : 0;
        const x = 16 + particle.x * (width - 32) + driftX;
        const y = 20 + particle.y * (height - 40) + driftY + parallax * particle.depth;
        const dx = x - mouseX;
        const dy = y - mouseY;
        const distance = Math.hypot(dx, dy);
        const influence = moving && finePointer.matches && distance < radius ? (1 - distance / radius) ** 2 : 0;
        const targetX = distance > .1 ? dx / distance * displacement * influence : displacement * influence;
        const targetY = distance > .1 ? dy / distance * displacement * influence : 0;
        particle.offsetX += (targetX - particle.offsetX) * blend;
        particle.offsetY += (targetY - particle.offsetY) * blend;
        context.save();
        context.translate(x + particle.offsetX, y + particle.offsetY);
        // Lower contrast behind central reading area, clearer at the edges.
        context.globalAlpha = particle.x > .24 && particle.x < .76 ? .17 : .25;
        context.strokeStyle = index % 3 === 0 ? '#86776D' : '#F04623';
        context.fillStyle = context.strokeStyle;
        context.lineWidth = 1.5;
        context.beginPath();
        if (particle.kind < 2) {
          context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          if (particle.kind === 0) context.fill(); else context.stroke();
        } else {
          if (particle.kind === 3) context.rotate(Math.PI / 4);
          context.strokeRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        }
        context.restore();
      }
    };
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (time - lastTime < 1000 / 30) return;
      const delta = Math.min(time - lastTime, 70);
      lastTime = time;
      elapsed += delta;
      draw(delta);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const running = visible && !document.hidden && canAnimate();
      canvas.dataset.motion = running ? 'running' : canAnimate() ? 'paused' : 'static';
      if (running) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
      else if (visible && !document.hidden) draw(0);
    };
    const updateBounds = () => {
      bounds = hero.getBoundingClientRect();
      visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      targetParallax = Math.max(-18, Math.min(18, -bounds.top * .025));
    };
    const resize = () => {
      updateBounds();
      width = bounds.width;
      height = bounds.height;
      count = Math.min(particles.length, window.innerWidth < 768 ? 8 : window.innerWidth < 1024 ? 20 : particles.length);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvas.dataset.particles = String(count);
      canvas.dataset.interactive = String(canAnimate() && finePointer.matches);
      mouseX = mouseY = -1000;
      draw(0);
      sync();
    };
    const move = (event: PointerEvent) => {
      if (!canAnimate() || !finePointer.matches || event.pointerType !== 'mouse') return;
      mouseX = event.clientX - bounds.left;
      mouseY = event.clientY - bounds.top;
    };
    const leave = () => { mouseX = mouseY = -1000; };
    const scroll = () => {
      if (!canAnimate()) return;
      const wasVisible = visible;
      updateBounds();
      leave();
      if (visible !== wasVisible) sync();
    };
    resize();
    // Older browsers keep the first static drawing without risking hero content.
    if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) {
      cancelAnimationFrame(frame);
      canvas.dataset.motion = 'static';
      return;
    }
    const observer = new IntersectionObserver(() => { updateBounds(); sync(); });
    const sizeObserver = new ResizeObserver(resize);
    observer.observe(hero);
    sizeObserver.observe(hero);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', leave, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', resize);
    finePointer.addEventListener('change', resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', resize);
      finePointer.removeEventListener('change', resize);
    };
  }, [containerRef, influenceRadius, maxDisplacement, desktopCount]);
  return <canvas ref={canvasRef} className="hero-antigravity" aria-hidden="true" />;
}
