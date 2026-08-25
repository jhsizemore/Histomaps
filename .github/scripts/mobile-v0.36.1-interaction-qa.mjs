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

// Layer toggles.
await page.locator('[data-action="layers"]').click();
const eventsToggle = page.locator('[data-layer="events"]');
await eventsToggle.uncheck();
assert(await page.evaluate(() => document.body.classList.contains('hm-layer-events-off')), 'Events layer did not turn off');
await eventsToggle.check();
assert(!(await page.evaluate(() => document.body.classList.contains('hm-layer-events-off'))), 'Events layer did not turn back on');
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

// Find a safe map point: ribbons are allowed, events/lifelines/buttons are not.
const point = await page.evaluate(() => {
  const svg = document.getElementById('histomap');
  const rect = svg.getBoundingClientRect();
  const strip = document.getElementById('stickyStreamStrip')?.getBoundingClientRect();
  const dock = document.querySelector('.hm-thumb-dock')?.getBoundingClientRect();
  const top = Math.max(rect.top + 20, (strip?.bottom || rect.top) + 28);
  const bottom = Math.min(rect.bottom - 20, (dock?.top || rect.bottom) - 35);
  const excluded = '.event-marker,.event-label,.person-lifeline-stem-hit,.person-lifeline-node-hit,.featured-person-lifeline-fallback-hit,.featured-person-lifeline-label-hit,[data-person-id][role="button"],button,a,input,select,[role="button"]';
  for (let y = top; y < bottom; y += 34) {
    for (let x = Math.max(48, rect.left + 48); x < Math.min(innerWidth - 48, rect.right - 48); x += 34) {
      const el = document.elementFromPoint(x, y);
      if (el && svg.contains(el) && !el.closest(excluded)) return { x, y };
    }
  }
  return { x: innerWidth * .5, y: top + (bottom - top) * .55 };
});

const cdp = await context.newCDPSession(page);
const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
const viewBox = () => page.locator('#histomap').getAttribute('viewBox');

// One-finger pan.
const beforePan = await viewBox();
await touch('touchStart', [{ x: point.x, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }]);
for (let i = 1; i <= 4; i++) {
  await touch('touchMove', [{ x: point.x + i * 5, y: point.y - i * 24, id: 1, radiusX: 2, radiusY: 2, force: 1 }]);
  await sleep(45);
}
await touch('touchEnd', []);
await sleep(500);
const afterPan = await viewBox();
assert(beforePan !== afterPan, `Pan did not move camera: ${beforePan}`);
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
