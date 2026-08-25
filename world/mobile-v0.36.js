/* Histomap v0.36 — mobile interaction coordinator.
   Small, removable layer: no historical/data-model mutations. */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const MOBILE_MAX = 820;
  const PHONE_SHORT_SIDE = 600;
  const HINT_KEY = 'histomap.v0.36.mobileHintSeen';
  const interactiveSelector = [
    '.event-marker',
    '[class*="lifeline"]',
    '[role="button"]',
    'button',
    'a',
    '[tabindex]'
  ].join(',');

  let isMobile = false;
  let interactionTimer = 0;
  let hint = null;
  let hintShown = false;
  let pointerStart = null;

  function mobileLikeViewport() {
    return window.innerWidth <= MOBILE_MAX || Math.min(window.innerWidth, window.innerHeight) <= PHONE_SHORT_SIDE;
  }

  function viewportHeight() {
    const vv = window.visualViewport;
    return Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  }

  function updateViewportVars() {
    root.style.setProperty('--hm-mobile-vh', `${viewportHeight()}px`);
    root.style.setProperty('--hm-mobile-vw', `${Math.round(window.visualViewport?.width || window.innerWidth)}px`);
  }

  function setMobileState() {
    const next = mobileLikeViewport();
    updateViewportVars();
    if (next === isMobile) return;
    isMobile = next;
    body.classList.toggle('histomap-mobile', isMobile);
    root.classList.toggle('histomap-mobile-root', isMobile);
    if (isMobile) {
      queueHint();
    } else {
      body.classList.remove('mobile-hint-ready', 'mobile-hint-used', 'mobile-interacting');
    }
  }

  function markInteracting() {
    if (!isMobile) return;
    body.classList.add('mobile-interacting');
    window.clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => body.classList.remove('mobile-interacting'), 180);
    dismissHint();
  }

  function createHint() {
    if (hint) return hint;
    hint = document.createElement('div');
    hint.className = 'mobile-gesture-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Drag to travel · pinch to zoom · tap to explore';
    body.appendChild(hint);
    return hint;
  }

  function welcomeIsOpen() {
    const overlay = document.getElementById('welcomeOverlay');
    return !!overlay && !overlay.hidden && getComputedStyle(overlay).display !== 'none';
  }

  function hintAlreadySeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; }
    catch (_) { return false; }
  }

  function queueHint() {
    if (!isMobile || hintShown || hintAlreadySeen()) return;
    createHint();
    const tryShow = () => {
      if (!isMobile || hintShown || welcomeIsOpen()) return;
      hintShown = true;
      body.classList.add('mobile-hint-ready');
      window.setTimeout(dismissHint, 5500);
    };
    window.setTimeout(tryShow, 550);

    const welcome = document.getElementById('welcomeOverlay');
    if (welcome) {
      new MutationObserver(tryShow).observe(welcome, {attributes: true, attributeFilter: ['hidden', 'class', 'style']});
    }
    document.getElementById('welcomeEnter')?.addEventListener('click', () => window.setTimeout(tryShow, 350), {once: true});
  }

  function dismissHint() {
    if (!hintShown && !body.classList.contains('mobile-hint-ready')) return;
    body.classList.remove('mobile-hint-ready');
    body.classList.add('mobile-hint-used');
    try { localStorage.setItem(HINT_KEY, '1'); } catch (_) {}
  }

  function closestInteractive(node) {
    return node instanceof Element ? node.closest(interactiveSelector) : null;
  }

  function assistSmallTap(event) {
    if (!isMobile || event.pointerType !== 'touch' || !pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    const dt = performance.now() - pointerStart.t;
    const moved = Math.hypot(dx, dy);
    pointerStart = null;
    if (moved > 9 || dt > 450) return;

    const direct = closestInteractive(event.target);
    if (direct) return;

    const svg = document.getElementById('histomap');
    if (!svg || !svg.contains(event.target)) return;

    const offsets = [
      [0, 0], [10, 0], [-10, 0], [0, 10], [0, -10],
      [8, 8], [-8, 8], [8, -8], [-8, -8]
    ];

    for (const [ox, oy] of offsets) {
      const stack = document.elementsFromPoint(event.clientX + ox, event.clientY + oy);
      const candidate = stack.map(closestInteractive).find(el => el && svg.contains(el));
      if (!candidate) continue;
      candidate.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        view: window
      }));
      break;
    }
  }

  function prepareSvg() {
    const svg = document.getElementById('histomap');
    if (!svg) return false;
    svg.style.touchAction = 'none';
    svg.style.overscrollBehavior = 'none';
    svg.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') {
        pointerStart = {x: event.clientX, y: event.clientY, t: performance.now()};
      }
      markInteracting();
    }, {passive: true});
    svg.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' && event.buttons) markInteracting();
    }, {passive: true});
    svg.addEventListener('pointerup', assistSmallTap, {passive: true});
    svg.addEventListener('pointercancel', () => { pointerStart = null; }, {passive: true});
    svg.addEventListener('wheel', markInteracting, {passive: true});
    return true;
  }

  function observeSvg() {
    if (prepareSvg()) return;
    const observer = new MutationObserver(() => {
      if (prepareSvg()) observer.disconnect();
    });
    observer.observe(body, {childList: true, subtree: true});
  }

  let resizeRaf = 0;
  function scheduleViewportUpdate() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      setMobileState();
    });
  }

  window.addEventListener('resize', scheduleViewportUpdate, {passive: true});
  window.addEventListener('orientationchange', scheduleViewportUpdate, {passive: true});
  window.visualViewport?.addEventListener('resize', scheduleViewportUpdate, {passive: true});
  window.visualViewport?.addEventListener('scroll', updateViewportVars, {passive: true});

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleViewportUpdate();
  });

  setMobileState();
  observeSvg();

  window.HISTOMAP_MOBILE_V036 = Object.freeze({
    version: '0.36.0-mobile',
    maxMobileWidth: MOBILE_MAX,
    shortSidePhoneThreshold: PHONE_SHORT_SIDE
  });
})();
