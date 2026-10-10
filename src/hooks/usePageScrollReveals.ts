import { useEffect, type RefObject } from 'react';

const REVEAL_SELECTOR = 'section h2, section h2 + p, section article, section .polish-card, section .card-glass, [data-scroll-reveal]';

/** A light, one-time reveal for marketing content that has no animation of its own. */
export function usePageScrollReveals(root: RefObject<HTMLElement | null>, routePath: string) {
  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window)) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const registered = new WeakSet<HTMLElement>();
    const pending = new Set<HTMLElement>();
    let scanFrame = 0;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        pending.delete(element);
        element.dataset.siteRevealed = 'true';
        element.classList.add('site-scroll-revealing');
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    const scan = () => {
      scanFrame = 0;
      if (motionPreference.matches) return;

      for (const element of container.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)) {
        if (registered.has(element) || element.dataset.siteRevealed) continue;
        registered.add(element);

        // The hero, formation journey and Framer Motion sections already animate.
        if (element.closest('.apex-hero-effects, .formation-process, [data-polish-reveal], [style*="opacity"], [style*="transform"]')) continue;
        if (element.matches('h2, h2 + p') && element.closest('article, .polish-card, .card-glass')) continue;
        if (element.matches('.card-glass') && element.querySelector('form')) continue;

        // Keep initially visible content steady, including direct links to anchors.
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.88 && bounds.bottom > 0) continue;

        const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
        element.dataset.siteRevealDelay = String(Math.min(siblings.indexOf(element) % 3, 2));
        pending.add(element);
        observer.observe(element);
      }
    };

    const queueScan = () => {
      if (!scanFrame) scanFrame = window.requestAnimationFrame(scan);
    };
    const finish = (event: AnimationEvent) => {
      if (event.animationName === 'site-scroll-reveal') {
        (event.target as HTMLElement).classList.remove('site-scroll-revealing');
      }
    };
    const updateMotionPreference = () => {
      if (motionPreference.matches) {
        observer.disconnect();
        container.querySelectorAll<HTMLElement>('.site-scroll-revealing').forEach((element) => element.classList.remove('site-scroll-revealing'));
      } else {
        pending.forEach((element) => observer.observe(element));
        queueScan();
      }
    };

    container.addEventListener('animationend', finish);
    motionPreference.addEventListener('change', updateMotionPreference);
    const mutations = new MutationObserver(queueScan);
    mutations.observe(container, { childList: true, subtree: true });
    queueScan();

    return () => {
      window.cancelAnimationFrame(scanFrame);
      mutations.disconnect();
      observer.disconnect();
      pending.clear();
      container.removeEventListener('animationend', finish);
      motionPreference.removeEventListener('change', updateMotionPreference);
    };
  }, [root, routePath]);
}
