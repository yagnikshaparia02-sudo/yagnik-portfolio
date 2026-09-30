/* Small, dependency-free interactions shared by the three portfolio pages. */
(() => {
  'use strict';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  try { userPaused = localStorage.getItem('portfolio-motion') === 'paused'; } catch (_) {}
  let reduced = motionPreference.matches || userPaused;
  document.documentElement.classList.add('js-ui');
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';

  function mount(options = {}) {
    const root = document.querySelector('.portfolio-page');
    if (!root) return () => {};
    const abort = new AbortController();
    const signal = abort.signal;
    const cleanups = [];
    const on = (target, type, callback, extras = {}) => {
      if (target) target.addEventListener(type, callback, { signal, ...extras });
    };
    const header = root.querySelector('.site-header');
    const nav = root.querySelector('.site-nav');
    const menu = root.querySelector('.menu-toggle');
    const narrow = window.matchMedia('(max-width: 1099px)');
    function closeMenu(restoreFocus = false) {
      header?.classList.remove('menu-open');
      menu?.setAttribute('aria-expanded', 'false');
      menu?.setAttribute('aria-label', 'Open navigation');
      if (restoreFocus) menu?.focus();
    }
    on(menu, 'click', () => {
      const open = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    on(nav, 'click', e => { if (e.target.closest('a')) closeMenu(); });
    on(document, 'keydown', e => {
      if (e.key === 'Escape' && header?.classList.contains('menu-open')) closeMenu(true);
    });
    on(document, 'click', e => { if (!header?.contains(e.target)) closeMenu(); });
    on(narrow, 'change', () => closeMenu());

    const motionButton = root.querySelector('.motion-toggle');
    function updateMotion() {
      reduced = motionPreference.matches || userPaused;
      document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
      const label = motionPreference.matches ? 'Reduced motion enabled by your device' : (reduced ? 'Resume animations' : 'Pause animations');
      motionButton?.setAttribute('aria-label', label);
      motionButton?.setAttribute('title', label);
      motionButton?.setAttribute('aria-pressed', String(reduced));
      motionButton?.setAttribute('aria-disabled', String(motionPreference.matches));
      root.dispatchEvent(new CustomEvent('portfolio:motion'));
    }
    on(motionPreference, 'change', updateMotion);
    on(motionButton, 'click', () => {
      if (motionPreference.matches) return;
      userPaused = !userPaused;
      try { localStorage.setItem('portfolio-motion', userPaused ? 'paused' : 'full'); } catch (_) {}
      updateMotion();
    });

    const role = root.querySelector('[data-role]');
    if (role) {
      const words = ['.NET Backend Engineer', 'Angular Developer', 'API Integration Specialist', 'Cloud & AWS Engineer'];
      let timer, word = 0, length = words[0].length, deleting = false;
      function type() {
        if (reduced || document.hidden || options.typeAnimation === false) return;
        if (!deleting && length === words[word].length) {
          deleting = true; timer = setTimeout(type, 1800); return;
        }
        length += deleting ? -1 : 1;
        role.textContent = words[word].slice(0, length);
        if (length === 0) { deleting = false; word = (word + 1) % words.length; }
        timer = setTimeout(type, length === 0 ? 300 : (deleting ? 30 : 65));
      }
      function restartType() {
        clearTimeout(timer);
        if (reduced || options.typeAnimation === false) {
          word = 0; length = words[0].length; deleting = false; role.textContent = words[0];
        } else if (!document.hidden) timer = setTimeout(type, 600);
      }
      on(root, 'portfolio:motion', restartType);
      on(document, 'visibilitychange', restartType);
      cleanups.push(() => clearTimeout(timer));
    }

    // Reveal content once; never make content depend on the observer being available.
    const revealTargets = root.querySelectorAll('section:not(.hero)>div>div:first-child, .motion-card, .stat');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
      revealTargets.forEach(el => { el.classList.add('reveal'); observer.observe(el); });
      cleanups.push(() => observer.disconnect());
    } else revealTargets.forEach(el => el.classList.add('is-visible'));

    const floating = root.querySelector('.floating-contact');
    const back = root.querySelector('.back-top');
    let scrollFrame = 0;
    function updateScroll() {
      scrollFrame = 0;
      const visible = window.scrollY > 340;
      floating?.classList.toggle('is-visible', visible);
      back?.classList.toggle('is-visible', visible);
    }
    on(window, 'scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    }, { passive: true });
    on(back, 'click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
      root.querySelector('h1')?.focus({ preventScroll: true });
    });
    updateScroll();
    cleanups.push(() => cancelAnimationFrame(scrollFrame));

    const portrait = root.querySelector('.portrait-image img');
    on(portrait, 'error', () => {
      const source = root.querySelector('.portrait-image source');
      if (source) source.srcset = './assets/yagnik-portrait.svg';
    }, { once: true });

    let filterFrame = 0;
    on(root.querySelector('#principles'), 'click', e => {
      if (!e.target.closest('button') || reduced) return;
      cancelAnimationFrame(filterFrame);
      filterFrame = requestAnimationFrame(() => {
        root.querySelectorAll('#principles .motion-card').forEach(card => {
          if (card.getClientRects().length) card.animate([{ opacity: .2, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
        });
      });
    });
    cleanups.push(() => cancelAnimationFrame(filterFrame));

    const canvas = root.querySelector('.hero-network');
    const hero = root.querySelector('.hero');
    if (canvas && hero) cleanups.push(particleNetwork(canvas, hero, root, on));
    updateMotion();
    root.dataset.uiReady = 'true';
    return () => { abort.abort(); cleanups.forEach(cleanup => cleanup()); };
  }

  function particleNetwork(canvas, hero, root, on) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    let width = 1, height = 1, points = [], frame = 0, previous = 0, inView = true;
    const mouse = { x: -9999, y: -9999 };
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    function resize() {
      width = hero.clientWidth; height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(3000000 / Math.max(1, width * height)));
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(76, Math.max(20, Math.floor(width * height / 14500)));
      points = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * 13, vy: (Math.random() - .5) * 13, r: .8 + Math.random() * 1.5 }));
      draw(0);
    }
    function draw(dt) {
      ctx.clearRect(0, 0, width, height);
      const linkDistance = width < 768 ? 130 : 175;
      points.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0, Math.min(width, p.x)); }
        if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0, Math.min(height, p.y)); }
      });
      // A softly defocused layer adds depth behind the crisp connected nodes.
      ctx.save(); ctx.filter = 'blur(4px)'; ctx.strokeStyle = 'rgba(172,188,148,.10)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < points.length - 3; i += 4) {
        const a = points[i], b = points[i + 3];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 340) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      ctx.restore();
      points.forEach((p, i) => {
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j], distance = Math.hypot(p.x - q.x, p.y - q.y);
          if (distance < linkDistance) {
            ctx.strokeStyle = `rgba(176,188,164,${.28 * (1 - distance / linkDistance)})`;
            ctx.lineWidth = .75; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (distance < 170 && !reduced) {
          ctx.strokeStyle = `rgba(201,242,77,${.35 * (1 - distance / 170)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = i % 5 === 0 ? 'rgba(201,242,77,.65)' : 'rgba(190,199,181,.5)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
    }
    function tick(time) {
      frame = 0;
      if (reduced || document.hidden || !inView) return;
      const dt = previous ? Math.min((time - previous) / 1000, .05) : 0;
      previous = time; draw(dt); frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      if (!reduced && !document.hidden && inView) frame = requestAnimationFrame(tick);
      else draw(0);
    }
    on(hero, 'pointermove', e => {
      if (!finePointer.matches || reduced) return;
      const bounds = hero.getBoundingClientRect(); mouse.x = e.clientX - bounds.left; mouse.y = e.clientY - bounds.top;
    }, { passive: true });
    on(hero, 'pointerleave', () => { mouse.x = mouse.y = -9999; });
    on(root, 'portfolio:motion', sync);
    on(document, 'visibilitychange', sync);
    const resizer = new ResizeObserver(resize); resizer.observe(hero);
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }); observer.observe(hero);
    }
    resize(); sync();
    return () => { cancelAnimationFrame(frame); resizer.disconnect(); observer?.disconnect(); };
  }
  window.Portfolio = { mount };
})();
