/* Histomap v0.36.1 — mobile-first interaction system.
   Development branch only. Builds on the readable v0.35.3 camera/data model. */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const VERSION = '0.36.1-mobile';
  const MOBILE_MAX = 820;
  const PHONE_SHORT_SIDE = 600;
  const COACH_KEY = 'histomap.v0.36.1.mobileCoachDone';
  const LAYER_KEY = 'histomap.v0.36.1.layers';
  const JOURNEY_DELAY = 720;
  const interactiveSelector = [
    '.event-marker',
    '.event-label',
    '.ribbon',
    '.person-lifeline-stem-hit',
    '.person-lifeline-node-hit',
    '.featured-person-lifeline-fallback-hit',
    '.featured-person-lifeline-label-hit',
    '[data-person-id][role="button"]',
    '[role="button"]',
    'button',
    'a',
    '[tabindex]'
  ].join(',');

  const layerDefaults = {
    events: true,
    lifelines: true,
    labels: true,
    guides: true
  };

  const journeys = [
    { id: 'rome', title: 'Rise of Rome', subtitle: 'Republic to imperial world', stops: ['Rome', 'Punic Wars', 'Julius Caesar', 'Augustus', 'Constantine', 'Fall of Rome'] },
    { id: 'alexander', title: "Alexander's World", subtitle: 'Macedon and the Hellenistic age', stops: ['Macedonia', 'Alexander the Great', 'Persian Empire', 'Egypt', 'Hellenistic'] },
    { id: 'silk', title: 'The Silk Roads', subtitle: 'Trade across Eurasia', stops: ['Han', 'Silk Road', 'Parthian', 'Kushan', 'Tang', 'Mongol'] },
    { id: 'america', title: 'American History', subtitle: 'Colonies, republic, expansion', stops: ['British America', 'American Revolution', 'United States', 'Civil War', 'Reconstruction'] },
    { id: 'exploration', title: 'Age of Exploration', subtitle: 'Oceanic expansion and encounter', stops: ['Portugal', 'Columbus', 'Spanish Empire', 'Magellan', 'Dutch', 'British Empire'] }
  ];

  let isMobile = false;
  let svg = null;
  let interactionTimer = 0;
  let resizeRaf = 0;
  let semanticRaf = 0;
  let contextTimer = 0;
  let cullTimer = 0;
  let commandSheet = null;
  let contextReadout = null;
  let thumbDock = null;
  let coach = null;
  let coachStep = 0;
  let coachDone = false;
  let layerState = loadLayers();
  let touchTrack = new Map();
  let gestureHadPinch = false;
  let lastTap = null;
  let inertiaFrame = 0;
  let inertiaRunning = false;
  let currentJourney = null;
  let currentJourneyIndex = -1;
  let journeyTimer = 0;
  let searchIndex = [];
  let searchIndexStamp = 0;
  let lastCenterLabel = '';
  let drawerRestoreFocus = null;

  function mobileLikeViewport() {
    return window.innerWidth <= MOBILE_MAX || Math.min(window.innerWidth, window.innerHeight) <= PHONE_SHORT_SIDE;
  }

  function viewportHeight() {
    const vv = window.visualViewport;
    return Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  }

  function viewportWidth() {
    return Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth));
  }

  function updateViewportVars() {
    root.style.setProperty('--hm-mobile-vh', `${viewportHeight()}px`);
    root.style.setProperty('--hm-mobile-vw', `${viewportWidth()}px`);
  }

  function reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function loadLayers() {
    try { return {...layerDefaults, ...JSON.parse(localStorage.getItem(LAYER_KEY) || '{}')}; }
    catch (_) { return {...layerDefaults}; }
  }

  function saveLayers() {
    try { localStorage.setItem(LAYER_KEY, JSON.stringify(layerState)); } catch (_) {}
  }

  function setMobileState() {
    const next = mobileLikeViewport();
    updateViewportVars();
    if (next === isMobile) {
      if (next) scheduleSemanticUpdate();
      return;
    }
    isMobile = next;
    body.classList.toggle('histomap-mobile', isMobile);
    root.classList.toggle('histomap-mobile-root', isMobile);
    if (isMobile) {
      ensureMobileUi();
      prepareSvg();
      applyLayers();
      scheduleSemanticUpdate();
      scheduleContextUpdate(40);
      queueCoach();
    } else {
      stopInertia();
      closeCommandSheet();
      body.classList.remove('mobile-interacting','hm-zoom-overview','hm-zoom-mid','hm-zoom-detail','hm-layer-events-off','hm-layer-lifelines-off','hm-layer-labels-off','hm-layer-guides-off');
    }
  }

  function closestInteractive(node) {
    return node instanceof Element ? node.closest(interactiveSelector) : null;
  }

  function haptic(ms = 7) {
    if (!isMobile || reducedMotion()) return;
    try { navigator.vibrate?.(ms); } catch (_) {}
  }

  function pulseSelection(node) {
    const target = node instanceof Element ? (node.closest('.event-marker,.person-lifeline-layout,.ribbon') || node) : null;
    if (!target) return;
    target.classList.add('hm-mobile-selected');
    window.setTimeout(() => target.classList.remove('hm-mobile-selected'), 620);
  }

  function markInteracting() {
    if (!isMobile) return;
    body.classList.add('mobile-interacting');
    window.clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => {
      body.classList.remove('mobile-interacting');
      scheduleContextUpdate(20);
      scheduleCull(180);
    }, 170);
    scheduleSemanticUpdate();
  }

  function ensureMobileUi() {
    if (!thumbDock) createThumbDock();
    if (!contextReadout) createContextReadout();
    if (!commandSheet) createCommandSheet();
    if (!coach) createCoach();
    prepareReadingSheets();
    hideLegacyMobileControls();
    updateContextualBack();
  }

  function iconMarkup(name) {
    const icons = {
      now: '<path d="M12 3a9 9 0 1 0 8.2 5.3"/><path d="M21 3v6h-6"/><path d="M12 7v5l3 2"/>',
      back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
      layers: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/>',
      overview: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h10"/><rect x="8" y="9" width="8" height="6" rx="1"/>',
      explore: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/><path d="m15 9 3-3M9 15l-3 3"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ''}</svg>`;
  }

  function createDockButton(action, label, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hm-thumb-button hm-thumb-${action}`;
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.innerHTML = `${iconMarkup(icon)}<span>${label}</span>`;
    return button;
  }

  function createThumbDock() {
    thumbDock = document.createElement('nav');
    thumbDock.className = 'hm-thumb-dock';
    thumbDock.setAttribute('aria-label', 'Histomap mobile controls');
    const homeBack = createDockButton('home-back', 'Now', 'now');
    const search = createDockButton('search', 'Search', 'search');
    const layers = createDockButton('layers', 'Layers', 'layers');
    const overview = createDockButton('overview', 'Overview', 'overview');
    const explore = createDockButton('explore', 'Explore', 'explore');
    thumbDock.append(homeBack, search, layers, overview, explore);
    body.appendChild(thumbDock);
    homeBack.addEventListener('click', () => {
      const back = visibleBackButton();
      if (back) {
        back.click(); haptic(); window.setTimeout(updateContextualBack, 60); return;
      }
      document.getElementById('resetButton')?.click();
      haptic(); scheduleContextUpdate(220);
    });
    search.addEventListener('click', event => openSearch(event.currentTarget));
    layers.addEventListener('click', event => openLayers(event.currentTarget));
    overview.addEventListener('click', toggleOverview);
    explore.addEventListener('click', event => openJourneys(event.currentTarget));
  }

  function visibleBackButton() {
    return [document.getElementById('eventBackButton'),document.getElementById('detailBackButton'),document.getElementById('personBackButton')]
      .find(button => button && !button.hidden && getComputedStyle(button).display !== 'none') || null;
  }

  function updateContextualBack() {
    if (!thumbDock) return;
    const button = thumbDock.querySelector('[data-action="home-back"]');
    if (!button) return;
    const back = visibleBackButton();
    const mode = back ? 'back' : 'now';
    const label = back ? 'Back' : 'Now';
    if (button.dataset.contextMode === mode) return;
    button.dataset.contextMode = mode;
    button.classList.toggle('is-back', !!back);
    button.setAttribute('aria-label', label);
    button.innerHTML = `${iconMarkup(mode)}<span>${label}</span>`;
  }

  function createContextReadout() {
    contextReadout = document.createElement('div');
    contextReadout.className = 'hm-mobile-context';
    contextReadout.setAttribute('aria-live', 'polite');
    contextReadout.innerHTML = '<strong class="hm-mobile-context-primary">World history</strong><span class="hm-mobile-context-secondary">Present day</span>';
    body.appendChild(contextReadout);
  }

  function formatZoomBand() {
    const zoom = currentZoom();
    if (zoom < 1.65) return 'Overview';
    if (zoom < 3.2) return 'Context';
    return 'Detail';
  }

  function currentZoom() {
    const slider = document.getElementById('lensSlider');
    const value = Number(slider?.value);
    if (Number.isFinite(value) && value > 0) return value;
    const readout = document.getElementById('zoomReadout')?.textContent || '';
    const match = readout.match(/([\d.]+)\s*[×x]/i);
    return match ? Number(match[1]) || 1 : 1;
  }

  function focusYearText() {
    return document.getElementById('focusLabel')?.textContent?.trim() || document.querySelector('.header-readout strong')?.textContent?.trim() || 'World history';
  }

  function visibleCenterRibbonLabel() {
    if (!svg) return lastCenterLabel;
    const labels = [...svg.querySelectorAll('.ribbon-label')];
    if (!labels.length) return lastCenterLabel;
    const cx = viewportWidth() * .5;
    const cy = viewportHeight() * .46;
    let best = null, bestScore = Infinity;
    for (const label of labels) {
      const rect = label.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.right < -80 || rect.left > viewportWidth() + 80 || rect.bottom < -80 || rect.top > viewportHeight() + 80) continue;
      const score = Math.hypot(((rect.left + rect.width / 2) - cx) * .75, (rect.top + rect.height / 2) - cy);
      if (score < bestScore) { bestScore = score; best = label; }
    }
    const text = best?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) lastCenterLabel = text;
    return lastCenterLabel;
  }

  function updateContextReadout() {
    if (!isMobile || !contextReadout) return;
    const year = focusYearText();
    const ribbon = visibleCenterRibbonLabel();
    contextReadout.querySelector('.hm-mobile-context-primary').textContent = ribbon || 'World history';
    contextReadout.querySelector('.hm-mobile-context-secondary').textContent = `${year} · ${formatZoomBand()}`;
  }

  function scheduleContextUpdate(delay = 90) {
    window.clearTimeout(contextTimer);
    contextTimer = window.setTimeout(updateContextReadout, delay);
  }

  function createCommandSheet() {
    commandSheet = document.createElement('section');
    commandSheet.className = 'hm-command-sheet';
    commandSheet.hidden = true;
    commandSheet.setAttribute('role', 'dialog');
    commandSheet.setAttribute('aria-modal', 'true');
    commandSheet.setAttribute('aria-labelledby', 'hmCommandTitle');
    commandSheet.innerHTML = `<div class="hm-command-backdrop" data-close-command></div><div class="hm-command-panel"><div class="hm-command-handle" aria-hidden="true"></div><header class="hm-command-header"><div><span class="hm-command-kicker">HISTOMAP</span><h2 id="hmCommandTitle">Explore</h2></div><button type="button" class="hm-command-close" data-close-command aria-label="Close">×</button></header><div class="hm-command-body"></div></div>`;
    body.appendChild(commandSheet);
    commandSheet.addEventListener('click', event => { if (event.target.closest('[data-close-command]')) closeCommandSheet(); });
    commandSheet.addEventListener('keydown', event => { if (event.key === 'Escape') closeCommandSheet(); if (event.key === 'Tab') trapSheetFocus(event); });
  }

  function trapSheetFocus(event) {
    const focusables = [...commandSheet.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.hidden && getComputedStyle(node).display !== 'none');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openCommandSheet(title, html, trigger) {
    if (!commandSheet) createCommandSheet();
    drawerRestoreFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    commandSheet.querySelector('#hmCommandTitle').textContent = title;
    commandSheet.querySelector('.hm-command-body').innerHTML = html;
    commandSheet.hidden = false;
    body.classList.add('hm-command-open');
    requestAnimationFrame(() => {
      commandSheet.classList.add('visible');
      commandSheet.querySelector('input,button,[tabindex]')?.focus({preventScroll: true});
    });
    contextReadout?.setAttribute('aria-hidden', 'true');
  }

  function closeCommandSheet() {
    if (!commandSheet || commandSheet.hidden) return;
    commandSheet.classList.remove('visible');
    body.classList.remove('hm-command-open');
    window.setTimeout(() => { commandSheet.hidden = true; }, 180);
    contextReadout?.removeAttribute('aria-hidden');
    drawerRestoreFocus?.focus?.({preventScroll: true});
    drawerRestoreFocus = null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]);
  }

  function buildSearchIndex(force = false) {
    if (!svg) return [];
    const now = performance.now();
    if (!force && searchIndex.length && now - searchIndexStamp < 2500) return searchIndex;
    const records = [], seen = new Set();
    const candidates = svg.querySelectorAll('.event-marker,.event-label,.ribbon,.ribbon-label,[data-person-id][role="button"],.featured-person-lifeline-label-name');
    for (const node of candidates) {
      let label = node.getAttribute?.('aria-label') || node.getAttribute?.('data-title') || node.textContent || '';
      label = label.replace(/\s+/g, ' ').trim();
      if (label.length < 2) continue;
      const normalized = label.toLowerCase();
      const key = `${normalized}|${node.getAttribute?.('data-person-id') || ''}|${node.getAttribute?.('data-event-id') || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let type = 'Stream';
      if (node.matches?.('.event-marker,.event-label')) type = 'Event';
      else if (node.matches?.('[data-person-id],.featured-person-lifeline-label-name')) type = 'Person';
      records.push({label, normalized, type, node});
      if (records.length >= 1800) break;
    }
    searchIndex = records;
    searchIndexStamp = now;
    return records;
  }

  function openSearch(trigger) {
    openCommandSheet('Search', `<label class="hm-search-box"><span class="sr-only">Search the Histomap</span><input id="hmMobileSearch" type="search" inputmode="search" autocomplete="off" placeholder="Search people, events, civilisations…" /></label><div id="hmSearchResults" class="hm-search-results" aria-live="polite"><p class="hm-empty-state">Start typing to search the rendered Histomap.</p></div>`, trigger);
    buildSearchIndex(true);
    const input = commandSheet.querySelector('#hmMobileSearch');
    const results = commandSheet.querySelector('#hmSearchResults');
    input?.addEventListener('input', () => renderSearchResults(input.value, results));
    window.setTimeout(() => input?.focus({preventScroll: true}), 40);
  }

  function renderSearchResults(query, results) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) { results.innerHTML = '<p class="hm-empty-state">Start typing to search the rendered Histomap.</p>'; return; }
    const tokens = q.split(/\s+/).filter(Boolean);
    const ranked = buildSearchIndex().map(record => {
      let score = 0;
      if (record.normalized === q) score += 100;
      if (record.normalized.startsWith(q)) score += 45;
      if (record.normalized.includes(q)) score += 25;
      for (const token of tokens) if (record.normalized.includes(token)) score += 8;
      return {record, score};
    }).filter(item => item.score > 0).sort((a,b) => b.score - a.score || a.record.label.length - b.record.label.length).slice(0,18);
    if (!ranked.length) { results.innerHTML = '<p class="hm-empty-state">No rendered match yet. Try a broader historical name.</p>'; return; }
    results.innerHTML = ranked.map(({record}, index) => `<button type="button" class="hm-search-result" data-result-index="${index}"><span>${escapeHtml(record.label)}</span><small>${record.type}</small></button>`).join('');
    results.querySelectorAll('[data-result-index]').forEach((button,index) => button.addEventListener('click', () => {
      const item = ranked[index]?.record; closeCommandSheet(); if (item) focusDomTarget(item.node);
    }));
  }

  function focusDomTarget(node) {
    if (!(node instanceof Element)) return false;
    let target = node;
    if (target.matches('.ribbon-label,.featured-person-lifeline-label-name')) target = target.closest('g')?.querySelector('.ribbon,[role="button"],[data-person-id]') || target;
    pulseSelection(target); haptic();
    try {
      target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      scheduleContextUpdate(500); return true;
    } catch (_) { return false; }
  }

  function openLayers(trigger) {
    const row = (key,label,note) => `<label class="hm-layer-row"><span><strong>${label}</strong><small>${note}</small></span><input type="checkbox" data-layer="${key}" ${layerState[key] ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
    openCommandSheet('Layers', `<div class="hm-layer-list">${row('events','Events','Historical event markers and labels')}${row('lifelines','Lifelines','People inside civilisation streams')}${row('labels','Labels','Stream and detailed map typography')}${row('guides','Guides','Timeline grid, axes and contextual guides')}</div><p class="hm-sheet-note">Semantic zoom still controls information density inside enabled layers.</p>`, trigger);
    commandSheet.querySelectorAll('[data-layer]').forEach(input => input.addEventListener('change', () => {
      layerState[input.dataset.layer] = input.checked; saveLayers(); applyLayers(); haptic(5);
    }));
  }

  function applyLayers() {
    body.classList.toggle('hm-layer-events-off', !layerState.events);
    body.classList.toggle('hm-layer-lifelines-off', !layerState.lifelines);
    body.classList.toggle('hm-layer-labels-off', !layerState.labels);
    body.classList.toggle('hm-layer-guides-off', !layerState.guides);
  }

  function toggleOverview() {
    closeCommandSheet();
    const toggle = document.getElementById('navigatorToggle');
    if (toggle) {
      toggle.click(); haptic();
      window.setTimeout(() => body.classList.toggle('hm-overview-open', document.getElementById('timelineNavigator')?.classList.contains('visible')), 20);
    }
  }

  function openJourneys(trigger) {
    const active = currentJourney ? `<div class="hm-journey-active"><strong>${escapeHtml(currentJourney.title)}</strong><span>Stop ${currentJourneyIndex + 1} of ${currentJourney.stops.length}</span><div class="hm-journey-progress"><i style="width:${Math.max(0,((currentJourneyIndex + 1)/currentJourney.stops.length)*100)}%"></i></div><div class="hm-journey-actions"><button type="button" data-journey-prev ${currentJourneyIndex <= 0 ? 'disabled' : ''}>Previous</button><button type="button" data-journey-next>${currentJourneyIndex >= currentJourney.stops.length - 1 ? 'Finish' : 'Next'}</button><button type="button" data-journey-stop>Stop</button></div></div>` : '';
    openCommandSheet('Guided exploration', `${active}<div class="hm-journey-list">${journeys.map(journey => `<button type="button" class="hm-journey-card" data-journey="${journey.id}"><strong>${escapeHtml(journey.title)}</strong><span>${escapeHtml(journey.subtitle)}</span><small>${journey.stops.length} historical waypoints</small></button>`).join('')}</div>`, trigger);
    commandSheet.querySelectorAll('[data-journey]').forEach(button => button.addEventListener('click', () => startJourney(button.dataset.journey)));
    commandSheet.querySelector('[data-journey-prev]')?.addEventListener('click', () => moveJourney(-1));
    commandSheet.querySelector('[data-journey-next]')?.addEventListener('click', () => moveJourney(1));
    commandSheet.querySelector('[data-journey-stop]')?.addEventListener('click', stopJourney);
  }

  function startJourney(id) {
    currentJourney = journeys.find(item => item.id === id) || null;
    currentJourneyIndex = -1; closeCommandSheet(); if (currentJourney) moveJourney(1);
  }

  function stopJourney() {
    window.clearTimeout(journeyTimer); currentJourney = null; currentJourneyIndex = -1; closeCommandSheet(); body.classList.remove('hm-journey-running');
  }

  function moveJourney(delta) {
    if (!currentJourney) return;
    const next = currentJourneyIndex + delta;
    if (next >= currentJourney.stops.length) { stopJourney(); return; }
    currentJourneyIndex = Math.max(0,next); closeCommandSheet(); body.classList.add('hm-journey-running');
    const query = currentJourney.stops[currentJourneyIndex];
    window.clearTimeout(journeyTimer);
    journeyTimer = window.setTimeout(() => {
      const target = findJourneyTarget(query); if (target) focusDomTarget(target); showJourneyToast(query);
    }, reducedMotion() ? 30 : JOURNEY_DELAY);
  }

  function findJourneyTarget(query) {
    const q = query.toLowerCase();
    const index = buildSearchIndex(true);
    const exactish = index.find(item => item.normalized === q || item.normalized.startsWith(q) || item.normalized.includes(q));
    if (exactish) return exactish.node;
    const tokens = q.split(/\s+/).filter(word => word.length > 2);
    return index.find(item => tokens.every(token => item.normalized.includes(token)))?.node || null;
  }

  function showJourneyToast(label) {
    let toast = document.querySelector('.hm-journey-toast');
    if (!toast) {
      toast = document.createElement('button'); toast.type = 'button'; toast.className = 'hm-journey-toast'; body.appendChild(toast);
      toast.addEventListener('click', event => openJourneys(event.currentTarget));
    }
    toast.innerHTML = `<strong>${escapeHtml(currentJourney?.title || 'Guided exploration')}</strong><span>${escapeHtml(label)} · tap for controls</span>`;
    toast.classList.add('visible'); window.setTimeout(() => toast.classList.remove('visible'),4200);
  }

  function hideLegacyMobileControls() {
    document.getElementById('navigatorToggle')?.setAttribute('data-hm-mobile-proxy','true');
    document.getElementById('controlDock')?.setAttribute('data-hm-mobile-legacy','true');
  }

  function currentSheetNodes() {
    return [document.getElementById('detailPanel'),document.getElementById('eventPanel'),document.getElementById('personPanel'),document.getElementById('lensPanel')].filter(Boolean);
  }

  function prepareReadingSheets() {
    for (const panel of currentSheetNodes()) {
      if (panel.dataset.hmSheetReady === 'true') continue;
      panel.dataset.hmSheetReady = 'true';
      panel.classList.add('hm-mobile-sheet','hm-sheet-peek');
      panel.dataset.hmSheetState = 'peek';
      let handle = panel.querySelector('.sheet-handle');
      if (!handle) {
        handle = document.createElement('button'); handle.type = 'button'; handle.className = 'sheet-handle'; panel.prepend(handle);
      } else if (!(handle instanceof HTMLButtonElement)) {
        const replacement = document.createElement('button'); replacement.type = 'button'; replacement.className = handle.className; handle.replaceWith(replacement); handle = replacement;
      }
      handle.removeAttribute('aria-hidden'); handle.setAttribute('aria-label','Resize detail sheet'); handle.setAttribute('title','Tap or drag to resize');
      wireSheetDrag(panel,handle);
      new MutationObserver(() => {
        if (panel.classList.contains('visible')) {
          if (!panel.dataset.hmSheetOpened) { setSheetState(panel,'peek'); panel.dataset.hmSheetOpened = 'true'; }
        } else delete panel.dataset.hmSheetOpened;
        updateContextualBack();
      }).observe(panel,{attributes:true,attributeFilter:['class']});
    }
  }

  function setSheetState(panel,state) {
    if (!panel) return;
    panel.dataset.hmSheetState = state;
    panel.classList.remove('hm-sheet-peek','hm-sheet-half','hm-sheet-full');
    panel.classList.add(`hm-sheet-${state}`);
    panel.querySelector('.sheet-handle')?.setAttribute('aria-label',`Detail sheet: ${state}. Tap to resize`);
    body.dataset.hmSheetState = state;
  }

  function nextSheetState(state) { return state === 'peek' ? 'half' : state === 'half' ? 'full' : 'peek'; }

  function closePanel(panel) {
    const map = {detailPanel:'closeDetails',eventPanel:'closeEvent',personPanel:'closePerson',lensPanel:'closeLens'};
    const button = document.getElementById(map[panel.id]); if (button) button.click(); else panel.classList.remove('visible');
  }

  function wireSheetDrag(panel,handle) {
    let drag = null;
    handle.addEventListener('click', () => { if (drag?.moved) return; setSheetState(panel,nextSheetState(panel.dataset.hmSheetState || 'peek')); haptic(4); });
    handle.addEventListener('pointerdown', event => {
      drag = {id:event.pointerId,y:event.clientY,start:event.clientY,moved:false};
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dy = event.clientY - drag.y;
      if (Math.abs(event.clientY - drag.start) > 8) drag.moved = true;
      if (Math.abs(dy) > 20) {
        const current = panel.dataset.hmSheetState || 'peek';
        if (dy < 0) setSheetState(panel,current === 'peek' ? 'half' : 'full');
        else if (current === 'full') setSheetState(panel,'half');
        else if (current === 'half') setSheetState(panel,'peek');
        else if (dy > 42) closePanel(panel);
        drag.y = event.clientY;
      }
      event.preventDefault();
    });
    handle.addEventListener('pointerup', () => { drag = null; updateContextualBack(); });
    handle.addEventListener('pointercancel', () => { drag = null; });
  }

  function createCoach() {
    coach = document.createElement('aside'); coach.className = 'hm-mobile-coach'; coach.hidden = true;
    coach.innerHTML = '<div class="hm-coach-progress"><i></i><i></i><i></i></div><strong class="hm-coach-title">Drag to travel through history</strong><span class="hm-coach-copy">Move the map with one finger.</span><button type="button" class="hm-coach-skip">Skip</button>';
    body.appendChild(coach); coach.querySelector('.hm-coach-skip').addEventListener('click',finishCoach);
  }

  function coachAlreadyDone() { try { return localStorage.getItem(COACH_KEY) === '1'; } catch (_) { return false; } }
  function welcomeIsOpen() { const overlay = document.getElementById('welcomeOverlay'); return !!overlay && !overlay.hidden && getComputedStyle(overlay).display !== 'none'; }

  function queueCoach() {
    if (!isMobile || coachDone || coachAlreadyDone()) return;
    const tryShow = () => {
      if (!isMobile || coachDone || welcomeIsOpen()) return;
      coach.hidden = false; requestAnimationFrame(() => coach.classList.add('visible')); renderCoachStep();
    };
    window.setTimeout(tryShow,550);
    const welcome = document.getElementById('welcomeOverlay');
    if (welcome && !welcome.dataset.hmCoachObserved) {
      welcome.dataset.hmCoachObserved = 'true';
      new MutationObserver(tryShow).observe(welcome,{attributes:true,attributeFilter:['hidden','class','style']});
    }
    document.getElementById('welcomeEnter')?.addEventListener('click',() => window.setTimeout(tryShow,260),{once:true});
  }

  function renderCoachStep() {
    if (!coach || coach.hidden) return;
    const steps = [['Drag to travel through history','Move the map with one finger.'],['Pinch to change scale','Zoom out for civilisations; zoom in for people and events.'],['Tap to explore','Open a civilisation, event or lifeline for context.']];
    const [title,copy] = steps[Math.min(coachStep,steps.length - 1)];
    coach.querySelector('.hm-coach-title').textContent = title; coach.querySelector('.hm-coach-copy').textContent = copy;
    coach.querySelectorAll('.hm-coach-progress i').forEach((dot,index) => { dot.classList.toggle('done',index < coachStep); dot.classList.toggle('active',index === coachStep); });
  }

  function advanceCoach(kind) {
    if (!coach || coach.hidden || coachDone) return;
    if ((coachStep === 0 && kind === 'drag') || (coachStep === 1 && kind === 'pinch') || (coachStep === 2 && kind === 'tap')) {
      coachStep += 1; if (coachStep >= 3) finishCoach(); else renderCoachStep();
    }
  }

  function finishCoach() {
    coachDone = true; coach?.classList.remove('visible'); window.setTimeout(() => { if (coach) coach.hidden = true; },180);
    try { localStorage.setItem(COACH_KEY,'1'); } catch (_) {}
  }

  function prepareSvg() {
    const nextSvg = document.getElementById('histomap');
    if (!nextSvg) return false;
    if (svg === nextSvg && svg.dataset.hmMobileReady === 'true') { enhanceHitTargets(); return true; }
    svg = nextSvg; svg.dataset.hmMobileReady = 'true'; svg.style.touchAction = 'none'; svg.style.overscrollBehavior = 'none';
    svg.addEventListener('pointerdown',onPointerDown,{passive:true});
    svg.addEventListener('pointermove',onPointerMove,{passive:true});
    svg.addEventListener('pointerup',onPointerUp,{passive:true});
    svg.addEventListener('pointercancel',onPointerCancel,{passive:true});
    svg.addEventListener('wheel',() => { markInteracting(); scheduleSemanticUpdate(); scheduleContextUpdate(160); },{passive:true});
    svg.addEventListener('click',onMapClickCapture,true);
    document.getElementById('lensSlider')?.addEventListener('input',() => { markInteracting(); scheduleSemanticUpdate(); },{passive:true});
    new MutationObserver(() => {
      enhanceHitTargets(); prepareReadingSheets(); searchIndexStamp = 0; scheduleSemanticUpdate(); scheduleContextUpdate(120); updateContextualBack();
    }).observe(svg,{childList:true,subtree:true});
    enhanceHitTargets(); scheduleCull(400); return true;
  }

  function onPointerDown(event) {
    if (!isMobile || !event.isTrusted) return;
    stopInertia();
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    touchTrack.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,t:performance.now(),lastT:performance.now(),vx:0,vy:0,target:event.target});
    if (touchTrack.size >= 2) { gestureHadPinch = true; advanceCoach('pinch'); }
    markInteracting();
  }

  function onPointerMove(event) {
    if (!isMobile || !event.isTrusted) return;
    const track = touchTrack.get(event.pointerId); if (!track) return;
    const now = performance.now(), dt = Math.max(8,now - track.lastT), dx = event.clientX - track.x, dy = event.clientY - track.y;
    track.vx = track.vx * .58 + (dx / dt) * .42; track.vy = track.vy * .58 + (dy / dt) * .42;
    track.x = event.clientX; track.y = event.clientY; track.lastT = now;
    if (Math.hypot(event.clientX - track.startX,event.clientY - track.startY) > 14) advanceCoach('drag');
    if (touchTrack.size >= 2) { gestureHadPinch = true; advanceCoach('pinch'); }
    markInteracting();
  }

  function onPointerUp(event) {
    if (!isMobile || !event.isTrusted) return;
    const track = touchTrack.get(event.pointerId); if (!track) return;
    touchTrack.delete(event.pointerId);
    const moved = Math.hypot(event.clientX - track.startX,event.clientY - track.startY);
    const direct = closestInteractive(event.target);
    if (moved <= 10 && !gestureHadPinch) {
      if (direct) { pulseSelection(direct); haptic(); advanceCoach('tap'); }
      else if (!assistSmallTap(event)) detectDoubleTap(event);
    } else if (!gestureHadPinch && touchTrack.size === 0) startInertia(track,event);
    if (touchTrack.size === 0) gestureHadPinch = false;
    markInteracting();
  }

  function onPointerCancel(event) { touchTrack.delete(event.pointerId); if (!touchTrack.size) gestureHadPinch = false; }

  function onMapClickCapture(event) {
    if (!isMobile || !event.isTrusted) return;
    const target = closestInteractive(event.target); if (!target) return;
    pulseSelection(target); updateContextualBack(); scheduleContextUpdate(300);
  }

  function assistSmallTap(event) {
    if (!svg || !svg.contains(event.target)) return false;
    const offsets = [[0,0],[12,0],[-12,0],[0,12],[0,-12],[10,10],[-10,10],[10,-10],[-10,-10],[18,0],[-18,0],[0,18],[0,-18]];
    for (const [ox,oy] of offsets) {
      const candidate = document.elementsFromPoint(event.clientX + ox,event.clientY + oy).map(closestInteractive).find(node => node && svg.contains(node));
      if (!candidate) continue;
      pulseSelection(candidate); haptic();
      candidate.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:event.clientX,clientY:event.clientY,view:window}));
      advanceCoach('tap'); return true;
    }
    return false;
  }

  function detectDoubleTap(event) {
    const now = performance.now();
    if (lastTap && now - lastTap.t < 310 && Math.hypot(event.clientX - lastTap.x,event.clientY - lastTap.y) < 34) {
      lastTap = null; stopInertia();
      try {
        svg.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-440,clientX:event.clientX,clientY:event.clientY}));
        haptic(9); scheduleSemanticUpdate();
      } catch (_) {}
      return;
    }
    lastTap = {x:event.clientX,y:event.clientY,t:now};
  }

  function startInertia(track,event) {
    if (reducedMotion() || inertiaRunning) return;
    let vx = track.vx, vy = track.vy, speed = Math.hypot(vx,vy);
    if (speed < .18 || speed > 3.2) return;
    const pointerId = 989; let x = event.clientX, y = event.clientY, last = performance.now(); inertiaRunning = true;
    const dispatch = (type,px,py,buttons) => {
      try { svg.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId,pointerType:'touch',isPrimary:true,buttons,clientX:px,clientY:py})); } catch (_) {}
    };
    dispatch('pointerdown',x,y,1);
    const step = now => {
      if (!inertiaRunning) return;
      const dt = Math.min(28,Math.max(8,now - last)); last = now; x += vx * dt; y += vy * dt; vx *= .90; vy *= .90; speed = Math.hypot(vx,vy);
      dispatch('pointermove',x,y,1); markInteracting();
      if (speed < .055 || x < -80 || x > viewportWidth() + 80 || y < -80 || y > viewportHeight() + 80) {
        dispatch('pointerup',x,y,0); inertiaRunning = false; inertiaFrame = 0; scheduleContextUpdate(140); return;
      }
      inertiaFrame = requestAnimationFrame(step);
    };
    inertiaFrame = requestAnimationFrame(step);
  }

  function stopInertia() { inertiaRunning = false; if (inertiaFrame) cancelAnimationFrame(inertiaFrame); inertiaFrame = 0; }

  function enhanceHitTargets() {
    if (!isMobile || !svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    svg.querySelectorAll('.event-marker:not([data-hm-hit-ready])').forEach(marker => {
      marker.dataset.hmHitReady = 'true';
      const hit = document.createElementNS(NS,'circle');
      hit.setAttribute('class','hm-event-hit-target'); hit.setAttribute('cx','0'); hit.setAttribute('cy','0'); hit.setAttribute('r','1'); hit.setAttribute('fill','transparent'); hit.setAttribute('stroke','transparent'); hit.setAttribute('stroke-width','44'); hit.setAttribute('vector-effect','non-scaling-stroke'); hit.setAttribute('pointer-events','stroke');
      marker.insertBefore(hit,marker.firstChild);
    });
    svg.querySelectorAll('.person-lifeline-stem-hit,.person-lifeline-node-hit,.featured-person-lifeline-fallback-hit,.featured-person-lifeline-label-hit').forEach(node => node.classList.add('hm-expanded-person-hit'));
  }

  function scheduleSemanticUpdate() {
    if (!isMobile || semanticRaf) return;
    semanticRaf = requestAnimationFrame(() => {
      semanticRaf = 0;
      const zoom = currentZoom(), overview = zoom < 1.65, mid = zoom >= 1.65 && zoom < 3.2;
      body.classList.toggle('hm-zoom-overview',overview); body.classList.toggle('hm-zoom-mid',mid); body.classList.toggle('hm-zoom-detail',!overview && !mid);
      body.dataset.hmZoom = zoom.toFixed(2); body.dataset.hmSemanticBand = overview ? 'overview' : mid ? 'context' : 'detail'; scheduleContextUpdate(80);
    });
  }

  function scheduleCull(delay = 300) { window.clearTimeout(cullTimer); cullTimer = window.setTimeout(cullOffscreenDetail,delay); }

  function cullOffscreenDetail() {
    if (!isMobile || !svg || body.classList.contains('mobile-interacting')) return;
    const margin = 180, width = viewportWidth(), height = viewportHeight();
    const nodes = [...svg.querySelectorAll('.event-marker.level-2,.event-marker.level-3,.person-lifeline-layout')].slice(0,1400);
    let index = 0;
    const run = deadline => {
      while (index < nodes.length && (!deadline || deadline.timeRemaining() > 3)) {
        const node = nodes[index++], rect = node.getBoundingClientRect();
        node.classList.toggle('hm-offscreen-detail',rect.right < -margin || rect.left > width + margin || rect.bottom < -margin || rect.top > height + margin);
      }
      if (index < nodes.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(run,{timeout:180}); else setTimeout(() => run(null),16);
      }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(run,{timeout:180}); else run(null);
  }

  function observeSvg() {
    if (prepareSvg()) return;
    const observer = new MutationObserver(() => { if (prepareSvg()) { observer.disconnect(); ensureMobileUi(); } });
    observer.observe(body,{childList:true,subtree:true});
  }

  function scheduleViewportUpdate() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; setMobileState(); scheduleContextUpdate(80); scheduleCull(260); });
  }

  window.addEventListener('resize',scheduleViewportUpdate,{passive:true});
  window.addEventListener('orientationchange',scheduleViewportUpdate,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleViewportUpdate,{passive:true});
  window.visualViewport?.addEventListener('scroll',updateViewportVars,{passive:true});
  document.addEventListener('visibilitychange',() => { if (!document.hidden) scheduleViewportUpdate(); });
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape') {
      closeCommandSheet();
      if (document.getElementById('timelineNavigator')?.classList.contains('visible')) document.getElementById('navigatorToggle')?.click();
      stopJourney();
    }
  });

  new MutationObserver(() => {
    if (!isMobile) return;
    prepareReadingSheets(); updateContextualBack(); if (!svg || !document.contains(svg)) observeSvg();
  }).observe(body,{childList:true,subtree:true});

  function maybeRunQaMode() {
    const qa = new URLSearchParams(location.search).get('hmqa');
    if (!qa) return;
    body.dataset.hmQa = qa;
    try { localStorage.setItem(COACH_KEY,'1'); } catch (_) {}
    window.setTimeout(() => {
      document.getElementById('welcomeEnter')?.click();
      document.getElementById('welcomeOverlay')?.setAttribute('hidden','');
      ensureMobileUi(); scheduleSemanticUpdate(); scheduleContextUpdate(0);
    },900);
  }

  maybeRunQaMode();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load',() => { navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(() => {}); },{once:true});
  }

  setMobileState();
  observeSvg();

  window.HISTOMAP_MOBILE_V036 = Object.freeze({version:VERSION,maxMobileWidth:MOBILE_MAX,shortSidePhoneThreshold:PHONE_SHORT_SIDE});
  window.HISTOMAP_MOBILE_V0361 = Object.freeze({
    version:VERSION,
    semanticBands:Object.freeze({overview:[1,1.65],context:[1.65,3.2],detail:[3.2,10]}),
    journeys:Object.freeze(journeys.map(({id,title,stops}) => ({id,title,stops:[...stops]}))),
    refresh() { ensureMobileUi(); prepareSvg(); buildSearchIndex(true); scheduleSemanticUpdate(); scheduleContextUpdate(0); scheduleCull(0); }
  });
})();
