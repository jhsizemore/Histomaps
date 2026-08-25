/* v0.36.1 mobile refinement: viewport-true context year, double-tap zoom, and sheet race repair. */
(() => {
  'use strict';

  const body = document.body;
  if (!body) return;

  let svg = null;
  let scheduled = 0;
  let observer = null;
  let pointerStart = new Map();
  let lastMapTap = null;

  function mobileActive() {
    return body.classList.contains('histomap-mobile');
  }

  function parseHistoricalYear(text) {
    const raw = String(text || '').toUpperCase().replace(/,/g, '').trim();
    const match = raw.match(/(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    let value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    if (/\bB\.?\s*C\.?(?:\s*E\.?)?\b/.test(raw) || /\bBCE\b/.test(raw)) value = -Math.abs(value);
    else if (/\bCE\b/.test(raw) || /\bA\.?\s*D\.?\b/.test(raw)) value = Math.abs(value);
    return value;
  }

  function formatHistoricalYear(value) {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    if (rounded < 0) return `${Math.abs(rounded)} BCE`;
    if (rounded === 0) return '1 BCE / 1 CE';
    return `${rounded} CE`;
  }

  function timelineTargetY() {
    const map = svg?.getBoundingClientRect();
    if (!map) return window.innerHeight * .5;
    const strip = document.getElementById('stickyStreamStrip')?.getBoundingClientRect();
    const dock = document.querySelector('.hm-thumb-dock')?.getBoundingClientRect();
    const top = Math.max(map.top, strip?.bottom || map.top);
    const bottom = Math.min(map.bottom, dock?.top || map.bottom);
    return top + Math.max(1, bottom - top) * .5;
  }

  function visibleTimelineTicks() {
    if (!svg) return [];
    const ticks = [];
    for (const node of svg.querySelectorAll('.axis-label')) {
      const year = parseHistoricalYear(node.textContent);
      if (!Number.isFinite(year)) continue;
      const rect = node.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      const y = rect.top + rect.height / 2;
      if (y < -120 || y > window.innerHeight + 120) continue;
      if (ticks.some(tick => Math.abs(tick.y - y) < 2 && tick.year === year)) continue;
      ticks.push({year, y});
    }
    ticks.sort((a,b) => a.y - b.y);
    return ticks;
  }

  function yearAtViewportCenter() {
    const ticks = visibleTimelineTicks();
    if (!ticks.length) return null;
    const target = timelineTargetY();
    if (ticks.length === 1) return ticks[0].year;

    let before = null;
    let after = null;
    for (const tick of ticks) {
      if (tick.y <= target) before = tick;
      if (tick.y >= target && !after) after = tick;
    }

    if (!before) [before, after] = [ticks[0], ticks[1]];
    else if (!after) [before, after] = [ticks[ticks.length - 2], ticks[ticks.length - 1]];
    else if (before === after) {
      const index = ticks.indexOf(before);
      after = ticks[Math.min(ticks.length - 1, index + 1)];
      before = ticks[Math.max(0, index - 1)];
    }

    if (!before || !after || Math.abs(after.y - before.y) < .5) return before?.year ?? after?.year ?? null;
    const t = (target - before.y) / (after.y - before.y);
    return before.year + (after.year - before.year) * t;
  }

  function semanticBand() {
    const band = body.dataset.hmSemanticBand;
    if (band === 'context') return 'Context';
    if (band === 'detail') return 'Detail';
    return 'Overview';
  }

  function update() {
    scheduled = 0;
    if (!mobileActive()) return;
    svg = document.getElementById('histomap');
    const secondary = document.querySelector('.hm-mobile-context-secondary');
    if (!svg || !secondary) return;
    const year = formatHistoricalYear(yearAtViewportCenter());
    if (!year) return;
    const next = `${year} · ${semanticBand()}`;
    if (secondary.textContent !== next) secondary.textContent = next;
    secondary.dataset.hmViewportYear = year;
  }

  function schedule(delay = 0) {
    if (scheduled) cancelAnimationFrame(scheduled);
    const run = () => { scheduled = requestAnimationFrame(update); };
    if (delay) window.setTimeout(run, delay); else run();
  }

  function guardCommandSheetRace() {
    const sheet = document.querySelector('.hm-command-sheet');
    if (!sheet || sheet.dataset.hmRaceGuard === 'true') return;
    sheet.dataset.hmRaceGuard = 'true';
    new MutationObserver(() => {
      if (body.classList.contains('hm-command-open') && sheet.hidden) {
        sheet.hidden = false;
        requestAnimationFrame(() => sheet.classList.add('visible'));
      }
    }).observe(sheet, {attributes:true, attributeFilter:['hidden']});
  }

  function doubleTapEligible(target) {
    if (!(target instanceof Element) || !svg?.contains(target)) return false;
    return !target.closest('.event-marker,.event-label,.person-lifeline-stem-hit,.person-lifeline-node-hit,.featured-person-lifeline-fallback-hit,.featured-person-lifeline-label-hit,[data-person-id][role="button"],button,a,input,select,[role="button"]');
  }

  function onCapturePointerDown(event) {
    if (!mobileActive() || event.pointerType !== 'touch' || !svg?.contains(event.target)) return;
    pointerStart.set(event.pointerId, {x:event.clientX,y:event.clientY,t:performance.now()});
  }

  function onCapturePointerUp(event) {
    if (!mobileActive() || event.pointerType !== 'touch') return;
    const start = pointerStart.get(event.pointerId);
    pointerStart.delete(event.pointerId);
    if (!start || !doubleTapEligible(event.target)) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const dt = performance.now() - start.t;
    if (moved > 10 || dt > 430) return;

    const now = performance.now();
    if (lastMapTap && now - lastMapTap.t < 310 && Math.hypot(event.clientX - lastMapTap.x,event.clientY - lastMapTap.y) < 34) {
      lastMapTap = null;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        svg.dispatchEvent(new WheelEvent('wheel', {
          bubbles:true,
          cancelable:true,
          ctrlKey:true,
          deltaY:-440,
          clientX:event.clientX,
          clientY:event.clientY,
          view:window
        }));
        navigator.vibrate?.(8);
      } catch (_) {}
      schedule(120);
      return;
    }
    lastMapTap = {x:event.clientX,y:event.clientY,t:now};
  }

  function attach() {
    svg = document.getElementById('histomap');
    if (!svg) return false;
    observer?.disconnect();
    observer = new MutationObserver(() => schedule());
    observer.observe(svg, {attributes:true, attributeFilter:['viewBox']});
    svg.addEventListener('pointermove', () => schedule(30), {passive:true});
    svg.addEventListener('pointerup', () => schedule(60), {passive:true});
    svg.addEventListener('wheel', () => schedule(80), {passive:true});
    document.getElementById('lensSlider')?.addEventListener('input', () => schedule(50), {passive:true});
    schedule(80);
    return true;
  }

  document.addEventListener('pointerdown', onCapturePointerDown, true);
  document.addEventListener('pointerup', onCapturePointerUp, true);
  document.addEventListener('pointercancel', event => pointerStart.delete(event.pointerId), true);

  const bodyObserver = new MutationObserver(() => {
    guardCommandSheetRace();
    if (!svg || !document.contains(svg)) attach();
    if (mobileActive()) schedule(80);
  });
  bodyObserver.observe(body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','data-hm-semantic-band']});

  window.addEventListener('resize', () => schedule(80), {passive:true});
  window.addEventListener('orientationchange', () => schedule(120), {passive:true});
  window.visualViewport?.addEventListener('resize', () => schedule(80), {passive:true});

  guardCommandSheetRace();
  if (!attach()) {
    const wait = new MutationObserver(() => { if (attach()) wait.disconnect(); });
    wait.observe(body, {childList:true, subtree:true});
  }

  window.setInterval(() => { if (mobileActive()) update(); }, 700);
  window.HISTOMAP_MOBILE_V0361_REFINEMENT = Object.freeze({
    version:'0.36.1-refinement',
    updateContextYear:update,
    yearAtViewportCenter
  });
})();
