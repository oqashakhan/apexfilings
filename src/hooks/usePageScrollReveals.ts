import { useEffect, type RefObject } from 'react';

const REVEAL_SELECTOR = 'section h2, section article, section .polish-card, section .card-glass, section .top-state-card, [data-scroll-reveal]';
const CARD_SELECTOR = 'article, .polish-card, .card-glass, .top-state-card, [data-scroll-reveal]';

/** One observer for public content; GSAP runs only after a group enters the viewport. */
export function usePageScrollReveals(root: RefObject<HTMLElement | null>, routePath: string) {
  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let stopped = false;
    let cleanup: (() => void) | undefined;
    void import('gsap').then(({ gsap }) => {
      if (!stopped) cleanup = installReveals(container, gsap);
    });
    return () => {
      stopped = true;
      cleanup?.();
    };
  }, [root, routePath]);
}

function installReveals(container: HTMLElement, gsap: typeof import('gsap').gsap) {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const context = gsap.context(() => {}, container);
    const registered = new WeakSet<HTMLElement>();
    const pending = new Map<HTMLElement, HTMLElement[]>();
    const active = new Set<ReturnType<typeof gsap.fromTo>>();
    let scanFrame = 0;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        const members = pending.get(target);
        if (!members) continue;
        pending.delete(target);
        observer.unobserve(target);
        if (preference.matches) continue;

        context.add(() => {
          const tween = gsap.fromTo(members,
            { opacity: 0, y: members.length > 1 ? 18 : 14 },
            {
              opacity: 1,
              y: 0,
              duration: members.length > 1 ? 0.62 : 0.56,
              ease: 'power2.out',
              stagger: members.length > 1 ? 0.08 : 0,
              overwrite: 'auto',
              clearProps: 'opacity,transform',
              onComplete: () => active.delete(tween),
            },
          );
          active.add(tween);
        });
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    const eligible = (element: HTMLElement) => {
      if (element.closest('.apex-hero-effects, .formation-process, [data-polish-reveal], .about-feature-card')) return false;
      if (element.matches('[style*="opacity"], [style*="transform"]')) return false;
      if (element.matches('h2') && element.closest('article, .polish-card, .card-glass')) return false;
      if (element.matches('.card-glass') && element.querySelector('form')) return false;
      return true;
    };

    const observeGroup = (target: HTMLElement, members: HTMLElement[]) => {
      if (registered.has(target)) return;
      registered.add(target);
      // Content is never hidden while waiting for the observer or GSAP.
      const bounds = target.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.88 && bounds.bottom > 0) return;
      pending.set(target, members);
      observer.observe(target);
    };

    const scan = () => {
      scanFrame = 0;
      if (preference.matches) return;

      const cardGroups = new Map<HTMLElement, HTMLElement[]>();
      for (const element of container.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)) {
        if (!eligible(element)) continue;
        if (element.matches(CARD_SELECTOR)) {
          const parent = element.parentElement;
          if (parent) cardGroups.set(parent, [...(cardGroups.get(parent) ?? []), element]);
        } else {
          observeGroup(element, [element]);
        }
      }
      for (const [parent, members] of cardGroups) observeGroup(parent, members);
    };

    const queueScan = () => {
      if (!scanFrame) scanFrame = window.requestAnimationFrame(scan);
    };
    const updatePreference = () => {
      if (preference.matches) {
        observer.disconnect();
        for (const tween of active) tween.progress(1).kill();
        active.clear();
      } else {
        for (const target of pending.keys()) observer.observe(target);
        queueScan();
      }
    };

    preference.addEventListener('change', updatePreference);
    const mutations = new MutationObserver(queueScan);
    mutations.observe(container, { childList: true, subtree: true });
    queueScan();

    return () => {
      window.cancelAnimationFrame(scanFrame);
      mutations.disconnect();
      observer.disconnect();
      preference.removeEventListener('change', updatePreference);
      context.revert();
    };
}
