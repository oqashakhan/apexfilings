export function startStartupLoader(root: HTMLElement) {
  if (!document.documentElement.classList.contains('apex-loader-active')) {
    document.getElementById('apex-startup-loader')?.remove();
    return;
  }

  let started = false;
  const observer = new MutationObserver(() => {
    if (started || !root.firstElementChild) return;
    started = true;
    observer.disconnect();
    void animateStartupLoader(root);
  });
  observer.observe(root, { childList: true });
  if (root.firstElementChild) {
    started = true;
    observer.disconnect();
    void animateStartupLoader(root);
  }
}

async function animateStartupLoader(root: HTMLElement) {
  const loader = document.getElementById('apex-startup-loader');
  const symbol = loader?.querySelector<HTMLElement>('.apex-loader-symbol');
  const wordmark = loader?.querySelector<HTMLElement>('.apex-loader-name');
  if (!loader || !symbol || !wordmark) return;

  try {
    const { gsap } = await import('gsap');
    if (!document.documentElement.classList.contains('apex-loader-active')) return;

    const finish = () => {
      document.documentElement.classList.remove('apex-loader-active');
      root.style.removeProperty('opacity');
      loader.remove();
      try { sessionStorage.setItem('apex-loader-seen', '1'); } catch { /* Storage may be unavailable. */ }
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set([symbol, wordmark], { opacity: 1 });
      gsap.timeline({ onComplete: finish })
        .to(loader, { opacity: 0, duration: 0.18, delay: 0.1 })
        .to(root, { opacity: 1, duration: 0.18 }, '<');
      return;
    }

    gsap.timeline({ onComplete: finish })
      .to(symbol, { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'power2.out' }, 0)
      .to(wordmark, { opacity: 1, y: 0, duration: 0.26, ease: 'power2.out' }, 0.18)
      .to(symbol, { scale: 1.025, duration: 0.12, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0.44)
      .to(loader, { opacity: 0, duration: 0.3, ease: 'power2.inOut' }, 0.7)
      .to(root, { opacity: 1, duration: 0.3, ease: 'power2.inOut' }, 0.7);
  } catch {
    // The inline safety timeout in index.html reveals the site if GSAP fails to load.
  }
}
