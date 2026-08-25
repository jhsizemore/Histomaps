import { chromium } from 'playwright-core';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const browser = await chromium.launch({
  executablePath: process.env.CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

await page.goto('http://127.0.0.1:8765/world/?hmqa=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#histomap[data-hm-mobile-ready="true"]', { timeout: 60000 });
await page.waitForSelector('.hm-thumb-dock');
await page.waitForFunction(() => !!window.HISTOMAP_MOBILE_V0361_REFINEMENT);
await sleep(1800);

const ui = await page.evaluate(() => {
  const strip = document.getElementById('stickyStreamStrip');
  const region = document.querySelector('.sticky-stream-region');
  const secondary = document.querySelector('.hm-mobile-context-secondary');
  const dockButtons = [...document.querySelectorAll('.hm-thumb-dock .hm-thumb-button')];
  return {
    stripHeight: strip?.getBoundingClientRect().height || 0,
    regionDisplay: region ? getComputedStyle(region).display : 'missing',
    contextText: secondary?.textContent || '',
    viewportYear: secondary?.dataset.hmViewportYear || '',
    dockButtons: dockButtons.length,
    minDockHeight: Math.min(...dockButtons.map(button => button.getBoundingClientRect().height || 0))
  };
});
assert(ui.stripHeight > 20 && ui.stripHeight <= 35, `Stream rail height unexpected: ${ui.stripHeight}`);
assert(ui.regionDisplay === 'none', `Stream region row should be hidden on phone, got ${ui.regionDisplay}`);
assert(ui.viewportYear && /BCE|CE/.test(ui.viewportYear), `Viewport year missing: ${JSON.stringify(ui)}`);
assert(ui.contextText.includes(ui.viewportYear), `Context readout is not using viewport year: ${ui.contextText}`);
assert(ui.dockButtons === 5, `Expected 5 thumb controls, found ${ui.dockButtons}`);
assert(ui.minDockHeight >= 44, `Thumb target below 44px: ${ui.minDockHeight}`);
console.log('PASS compact rail + viewport-true context readout');

// Search workflow.
await page.locator('[data-action="search"]').click();
await page.locator('#hmMobileSearch').fill('Egypt');
await page.waitForSelector('.hm-search-result');
assert(await page.locator('.hm-search-result').count() > 0, 'Search returned no rendered Egypt match');
await page.locator('.hm-command-close').click();
console.log('PASS search opens, filters, and closes');

// Layer toggles — tap the visible switch/label surface, as a finger would.
await page.locator('[data-action="layers"]').click();
const eventsToggle = page.locator('[data-layer="events"]');
const eventsRow = eventsToggle.locator('xpath=ancestor::label[1]');
await eventsRow.locator('i').click();
assert(await page.evaluate(() => document.body.classList.contains('hm-layer-events-off')), 'Events layer did not turn off');
assert(!(await eventsToggle.isChecked()), 'Events checkbox stayed checked after visible switch tap');
await eventsRow.locator('i').click();
assert(!(await page.evaluate(() => document.body.classList.contains('hm-layer-events-off'))), 'Events layer did not turn back on');
assert(await eventsToggle.isChecked(), 'Events checkbox did not return to checked');
await page.locator('.hm-command-close').click();
console.log('PASS layers toggle');

// Overview navigator.
await page.locator('[data-action="overview"]').click();
await page.waitForFunction(() => document.getElementById('timelineNavigator')?.classList.contains('visible'));
await page.locator('#navigatorClose').click();
await page.waitForFunction(() => !document.getElementById('timelineNavigator')?.classList.contains('visible'));
console.log('PASS overview navigator open/close');

// Guided journey start + controls + stop.
await page.locator('[data-action="explore"]').click();
assert(await page.locator('.hm-journey-card').count() >= 5, 'Guided exploration list incomplete');
await page.locator('.hm-journey-card').first().click();
await page.waitForFunction(() => document.body.classList.contains('hm-journey-running'));
await sleep(1600);
await page.locator('[data-action="explore"]').click();
await page.waitForSelector('[data-journey-stop]');
await page.locator('[data-journey-stop]').click();
assert(!(await page.evaluate(() => document.body.classList.contains('hm-journey-running'))), 'Journey did not stop cleanly');
console.log('PASS guided journey start/control/stop');

// Event card + three reading-sheet states.
await page.evaluate(() => {
  const marker = [...document.querySelectorAll('.event-marker')].find(node => {
    const r = node.getBoundingClientRect();
    return r.width >= 0 && r.left > 30 && r.right < innerWidth - 30 && r.top > 100 && r.bottom < innerHeight - 110;
  }) || document.querySelector('.event-marker');
  marker?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
});
await page.waitForFunction(() => document.getElementById('eventPanel')?.classList.contains('visible'), null, { timeout: 20000 });
assert(await page.locator('#eventPanel').getAttribute('data-hm-sheet-state') === 'peek', 'Event sheet did not open in peek state');
await page.locator('#eventPanel .sheet-handle').click();
assert(await page.locator('#eventPanel').getAttribute('data-hm-sheet-state') === 'half', 'Event sheet did not reach half state');
await page.locator('#eventPanel .sheet-handle').click();
assert(await page.locator('#eventPanel').getAttribute('data-hm-sheet-state') === 'full', 'Event sheet did not reach full state');
await page.locator('#closeEvent').click();
await page.waitForFunction(() => !document.getElementById('eventPanel')?.classList.contains('visible'));
console.log('PASS event sheet peek → half → full → close');

// Find a central pan surface, avoiding the timeline gutter and event/lifeline hit targets.
const point = await page.evaluate(() => {
  const svg = document.getElementById('histomap');
  const rect = svg.getBoundingClientRect();
  const strip = document.getElementById('stickyStreamStrip')?.getBoundingClientRect();
  const dock = document.querySelector('.hm-thumb-dock')?.getBoundingClientRect();
  const top = Math.max(rect.top + 80, (strip?.bottom || rect.top) + 48);
  const bottom = Math.min(rect.bottom - 80, (dock?.top || rect.bottom) - 55);
  const cx = rect.left + rect.width * .58;
  const cy = top + (bottom - top) * .5;
  const excluded = '.event-marker,.event-label,.person-lifeline-stem-hit,.person-lifeline-node-hit,.featured-person-lifeline-fallback-hit,.featured-person-lifeline-label-hit,[data-person-id][role="button"],button,a,input,select,[role="button"]';
  const xOffsets = [0, -42, 42, -78, 78, -112, 112];
  const yOffsets = [0, -44, 44, -88, 88, -128, 128];
  for (const oy of yOffsets) {
    for (const ox of xOffsets) {
      const x = Math.max(rect.left + 105, Math.min(rect.right - 45, cx + ox));
      const y = Math.max(top, Math.min(bottom, cy + oy));
      const el = document.elementFromPoint(x, y);
      if (el && svg.contains(el) && !el.closest(excluded)) {
        return { x, y, tag: el.tagName, cls: el.getAttribute('class') || '' };
      }
    }
  }
  return { x: Math.max(rect.left + 120, cx), y: cy, tag: 'fallback', cls: '' };
});
console.log(`Gesture target ${Math.round(point.x)},${Math.round(point.y)} ${point.tag}.${point.cls}`);

await page.evaluate(() => {
  window.__hmQaPointerLog = [];
  const svg = document.getElementById('histomap');
  for (const type of ['pointerdown','pointermove','pointerup']) {
    svg.addEventListener(type, event => {
      if (window.__hmQaPointerLog.length < 24) window.__hmQaPointerLog.push({type, pointerType:event.pointerType, x:event.clientX, y:event.clientY, trusted:event.isTrusted});
    }, true);
  }
});

const cdp = await context.newCDPSession(page);
const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
const viewBox = () => page.locator('#histomap').getAttribute('viewBox');

// One-finger pan.
const beforePan = await viewBox();
await touch('touchStart', [{ x: point.x, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }]);
for (let i = 1; i <= 5; i++) {
  await touch('touchMove', [{ x: point.x - i * 8, y: point.y - i * 28, id: 1, radiusX: 2, radiusY: 2, force: 1 }]);
  await sleep(50);
}
await touch('touchEnd', []);
await sleep(600);
const afterPan = await viewBox();
const pointerLog = await page.evaluate(() => window.__hmQaPointerLog || []);
assert(pointerLog.some(row => row.type === 'pointerdown' && row.pointerType === 'touch' && row.trusted), `Trusted touch pointerdown was not generated: ${JSON.stringify(pointerLog)}`);
assert(pointerLog.some(row => row.type === 'pointermove' && row.pointerType === 'touch' && row.trusted), `Trusted touch pointermove was not generated: ${JSON.stringify(pointerLog)}`);
assert(beforePan !== afterPan, `Pan did not move camera: ${beforePan}; target=${JSON.stringify(point)}; pointers=${JSON.stringify(pointerLog)}`);
console.log('PASS trusted one-finger pan changes camera');

// Pinch zoom.
await page.evaluate(() => document.getElementById('resetButton')?.click());
await sleep(450);
const beforePinch = Number(await page.locator('#lensSlider').inputValue());
await touch('touchStart', [
  { x: point.x - 28, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 },
  { x: point.x + 28, y: point.y, id: 2, radiusX: 2, radiusY: 2, force: 1 }
]);
for (const spread of [42, 58, 76, 94]) {
  await touch('touchMove', [
    { x: point.x - spread, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 },
    { x: point.x + spread, y: point.y, id: 2, radiusX: 2, radiusY: 2, force: 1 }
  ]);
  await sleep(55);
}
await touch('touchEnd', []);
await sleep(650);
const afterPinch = Number(await page.locator('#lensSlider').inputValue());
assert(Math.abs(afterPinch - beforePinch) >= .1, `Pinch did not change zoom: ${beforePinch} → ${afterPinch}`);
console.log(`PASS trusted pinch changes zoom (${beforePinch} → ${afterPinch})`);

// Now resets a moved/zoomed map.
await page.evaluate(() => {
  for (const id of ['closeEvent','closeDetails','closePerson']) {
    const button = document.getElementById(id);
    if (button && getComputedStyle(button).display !== 'none') button.click();
  }
});
await sleep(250);
await page.locator('[data-action="home-back"]').click();
await sleep(500);
const resetZoom = Number(await page.locator('#lensSlider').inputValue());
assert(Math.abs(resetZoom - 1) < .05, `Now did not reset zoom: ${resetZoom}`);
console.log('PASS Now reset');

// Double-tap zoom on the map surface (including a ribbon).
await page.touchscreen.tap(point.x, point.y);
await sleep(120);
await page.touchscreen.tap(point.x, point.y);
await sleep(700);
const doubleTapZoom = Number(await page.locator('#lensSlider').inputValue());
assert(doubleTapZoom > 1.05, `Double-tap did not zoom: ${doubleTapZoom}`);
console.log(`PASS double-tap zoom (${doubleTapZoom})`);

// Context year must continue tracking after camera changes.
await sleep(850);
const finalContext = await page.evaluate(() => {
  const node = document.querySelector('.hm-mobile-context-secondary');
  return { text: node?.textContent || '', year: node?.dataset.hmViewportYear || '' };
});
assert(finalContext.year && finalContext.text.includes(finalContext.year), `Context year stopped tracking after gestures: ${JSON.stringify(finalContext)}`);
console.log('PASS context year tracks after gestures');

await page.screenshot({ path: '/tmp/histomap-mobile-qa/390x844-interaction-final.png', fullPage: false });
await browser.close();
console.log('ALL v0.36.1 INTERACTION QA PASSED');
