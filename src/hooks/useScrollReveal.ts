import { useEffect, type RefObject } from 'react';

/** Progressive enhancement: content is never hidden while waiting for an observer. */
export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = Array.from(root.current.querySelectorAll<HTMLElement>('[data-polish-reveal]'));
    const seen = new WeakSet<Element>();
    const finish = (event: AnimationEvent) => {
      if (event.animationName === 'polish-reveal') (event.target as HTMLElement).classList.remove('polish-revealing');
    };
    const container = root.current;
    container.addEventListener('animationend', finish);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        seen.add(element);
        element.classList.add('polish-revealing');
        element.dataset.revealed = 'true';
        observer.unobserve(element);
      }
    }, { threshold: 0.08 });
    const update = () => {
      observer.disconnect();
      if (preference.matches) elements.forEach(element => element.classList.remove('polish-revealing'));
      else elements.filter(element => !seen.has(element)).forEach(element => observer.observe(element));
    };
    update();
    preference.addEventListener('change', update);
    return () => {
      observer.disconnect();
      container.removeEventListener('animationend', finish);
      preference.removeEventListener('change', update);
      elements.forEach(element => element.classList.remove('polish-revealing'));
    };
  }, [root]);
}
