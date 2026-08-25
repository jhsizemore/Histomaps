/* Histomap mobile pinch repair — v0.36.2.
   Adds explicit two-finger zoom for touch browsers while leaving desktop behavior unchanged. */
(() => {
  'use strict';

  const body = document.body;
  if (!body) return;

  const pointers = new Map();
  let pinch = null;

  function mobileActive() {
    return body.classList.contains('histomap-mobile');
  }

  function mapSvg() {
    return document.getElementById('histomap');
  }

  function slider() {
    return document.getElementById('lensSlider');
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function zoomBounds(control) {
    const parsedMin = Number(control?.min);
    const parsedMax = Number(control?.max);
    return {
      min: Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 1,
      max: Number.isFinite(parsedMax) && parsedMax > 1 ? parsedMax : 8
    };
  }

  function currentZoom(control) {
    const value = Number(control?.value);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function beginPinch() {
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()].slice(0, 2);
    const startDistance = distance(a, b);
    const control = slider();
    if (!control || startDistance < 8) return;
    pinch = {
      startDistance,
      startZoom: currentZoom(control),
      lastZoom: currentZoom(control)
    };
    body.classList.add('hm-pinching');
  }

  function applyPinch() {
    if (!pinch || pointers.size < 2 || !mobileActive()) return;
    const control = slider();
    if (!control) return;
    const [a, b] = [...pointers.values()].slice(0, 2);
    const d = distance(a, b);
    if (d < 8) return;

    // Slightly soften the physical scale ratio so phone zoom feels controlled.
    const ratio = Math.pow(d / pinch.startDistance, 0.86);
    const bounds = zoomBounds(control);
    const next = Math.max(bounds.min, Math.min(bounds.max, pinch.startZoom * ratio));
    if (!Number.isFinite(next) || Math.abs(next - pinch.lastZoom) < 0.006) return;

    pinch.lastZoom = next;
    control.value = String(next);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function pointerEligible(event) {
    const svg = mapSvg();
    return mobileActive() && svg && event.pointerType === 'touch' && svg.contains(event.target);
  }

  function onPointerDown(event) {
    if (!pointerEligible(event)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) beginPinch();
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      if (!pinch) beginPinch();
      // Apply immediately so the zoom is committed before a fast touchend/pointerup.
      // This is also more reliable for synthetic PointerEvent QA and very quick pinches.
      applyPinch();
      if (event.cancelable) event.preventDefault();
    }
  }

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinch = null;
      body.classList.remove('hm-pinching');
    }
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
  document.addEventListener('pointerup', endPointer, { capture: true, passive: true });
  document.addEventListener('pointercancel', endPointer, { capture: true, passive: true });

  window.HISTOMAP_MOBILE_PINCH_V0362 = Object.freeze({ version: '0.36.2-pinch-repair' });
})();
