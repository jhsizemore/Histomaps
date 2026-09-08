import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../functions/api/analytics.js', import.meta.url), 'utf8');
const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const env = { CLOUDFLARE_API_TOKEN: 'test-api-token', CLOUDFLARE_ZONE_ID: 'test-zone', DASHBOARD_PASSWORD: 'test-password' };
const request = (password = env.DASHBOARD_PASSWORD, range = '24h') => new Request(`https://histomaps.org/api/analytics?range=${range}`, { headers: { 'x-dashboard-password': password } });

test('missing configuration and invalid passwords never query Cloudflare', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Unexpected query'); });
  const missing = await onRequestGet({ request: request(), env: {} });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).missing.length, 3);
  const unauthorized = await onRequestGet({ request: request('wrong'), env });
  assert.equal(unauthorized.status, 401);
  assert.equal(calls, 0);
  assert.match(unauthorized.headers.get('cache-control'), /no-store/);
});

test('zero visits stay zero even when Cloudflare reports many requests', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { viewer: { zones: [{
    series: [{ dimensions: { datetimeHour: '2026-09-08T00:00:00Z' }, sum: { visits: 0 } }],
    paths: [{ dimensions: { clientRequestPath: '/world/' }, count: 4 }, { dimensions: { clientRequestPath: '/assets/site.js' }, count: 100 }],
    referrers: [{ dimensions: { clientRefererHost: '' }, count: 100, sum: { visits: 0 } }],
    countries: [{ dimensions: { clientCountryName: 'AU' }, count: 100, sum: { visits: 0 } }],
    devices: [{ dimensions: { clientDeviceType: 'mobile' }, count: 100, sum: { visits: 0 } }],
  }] } } }));
  const response = await onRequestGet({ request: request(), env });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.visits, 0);
  for (const key of ['referrers', 'countries', 'devices']) assert.equal(data[key][0].value, 0);
  assert.equal(data.worldOpens, 4);
  assert.deepEqual(data.pages, [{ name: '/world/', value: 4 }]);
  assert.equal(data.directShare, 0);
});

test('direct share uses all visits, even when Direct is outside the displayed top eight', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { viewer: { zones: [{
    series: [{ dimensions: { datetimeHour: '2026-09-08T00:00:00Z' }, sum: { visits: 100 } }],
    referrers: [
      ...Array.from({ length: 9 }, (_, i) => ({ dimensions: { clientRefererHost: `source${i}.example` }, sum: { visits: 10 } })),
      { dimensions: { clientRefererHost: '' }, sum: { visits: 5 } },
    ],
  }] } } }));
  const data = await (await onRequestGet({ request: request(), env })).json();
  assert.equal(data.referrers.length, 8);
  assert.ok(!data.referrers.some(row => row.name === 'Direct'));
  assert.equal(data.directShare, 5);
});

test('seven-day queries use contiguous windows of at most 24 hours', async t => {
  const windows = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
    assert.equal(options.headers.authorization, 'Bearer test-api-token');
    assert.equal(body.variables.zoneTag, 'test-zone');
    assert.equal(body.variables.filter.clientRequestHTTPHost, 'histomaps.org');
    windows.push(body.variables.filter);
    return Response.json({ data: { viewer: { zones: [{}] } } });
  });
  assert.equal((await onRequestGet({ request: request(env.DASHBOARD_PASSWORD, '7d'), env })).status, 200);
  assert.equal(windows.length, 7);
  windows.forEach((window, i) => {
    assert.equal(Date.parse(window.datetime_lt) - Date.parse(window.datetime_geq), 86400000);
    if (i) assert.equal(window.datetime_geq, windows[i - 1].datetime_lt);
  });
});

test('Cloudflare GraphQL errors return a diagnostic without exposing credentials', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: [{ message: 'Permission denied' }] }));
  const response = await onRequestGet({ request: request(), env });
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.match(body, /Permission denied/);
  assert.ok(!body.includes(env.CLOUDFLARE_API_TOKEN));
});

test('a failed refresh remains visible after successful dashboard login', async () => {
  const html = await readFile(new URL('../dashboard/index.html', import.meta.url), 'utf8');
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: id === 'dashboard', value: '', textContent: '', innerHTML: '',
      classList: { toggle() {} }, listeners: {},
      addEventListener(event, listener) { this.listeners[event] = listener; }, focus() {},
    });
    return elements.get(id);
  };
  let fail = false;
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document: { documentElement: {}, getElementById: element, querySelectorAll: () => [] },
    Intl, Date, Map,
    fetch: async () => fail
      ? Response.json({ error: 'Cloudflare analytics query failed.' }, { status: 502 })
      : Response.json({ visits: 100, directShare: 5, series: [], generatedAt: new Date().toISOString() }),
  });
  element('password').value = 'test-password';
  element('login-form').listeners.submit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element('login').hidden, true);
  assert.equal(element('dashboard').hidden, false);
  assert.equal(element('direct-share').textContent, '5%');
  fail = true;
  await element('refresh').listeners.click();
  assert.equal(element('dashboard-error').textContent, 'Cloudflare analytics query failed.');
  assert.equal(element('dashboard').hidden, false);
  assert.match(html, /id="dashboard-error" role="alert"/);
});

test('plan-restricted referrers do not prevent other analytics from loading', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++;
    if (JSON.parse(options.body).query.includes('clientRefererHost')) {
      return Response.json({ errors: [{ message: "zone does not have access to field clientrefererhost", extensions: { code: 'authz' } }] });
    }
    return Response.json({ data: { viewer: { zones: [{
      series: [{ dimensions: { datetimeHour: '2026-09-08T00:00:00Z' }, sum: { visits: 2 } }],
      paths: [{ dimensions: { clientRequestPath: '/.env' }, count: 500 }, { dimensions: { clientRequestPath: '/info.php' }, count: 300 }, { dimensions: { clientRequestPath: '/wordpress/' }, count: 500 }, { dimensions: { clientRequestPath: '/blog/' }, count: 500 }],
    }] } } });
  });
  const response = await onRequestGet({ request: request(env.DASHBOARD_PASSWORD, '7d'), env });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.visits, 14);
  assert.equal(data.referrersAvailable, false);
  assert.equal(data.directShare, null);
  assert.deepEqual(data.pages, []);
  assert.equal(calls, 8);
  assert.match(data.note, /unavailable/);
});

test('current and saved connection exclusions survive the referrer fallback', async t => {
  const filters = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body);
    filters.push(body.variables.filter);
    return body.query.includes('clientRefererHost')
      ? Response.json({ errors: [{ message: 'No access to clientrefererhost', extensions: { code: 'authz' } }] })
      : Response.json({ data: { viewer: { zones: [{}] } } });
  });
  const req = request();
  req.headers.set('cf-connecting-ip', '2001:db8::1');
  req.headers.set('x-excluded-ips', JSON.stringify(['192.0.2.1', '2001:db8::1']));
  const response = await onRequestGet({ request: req, env });
  assert.equal(response.status, 200);
  assert.equal(filters.length, 2);
  for (const filter of filters) assert.deepEqual(filter.clientIP_notin, ['2001:db8::1', '192.0.2.1']);
  assert.deepEqual((await response.json()).exclusions, { enabled: true, currentIP: '2001:db8::1', count: 2 });
});

test('disabling exclusions restores the unfiltered query and omits the current IP', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(JSON.parse(options.body).variables.filter.clientIP_notin, undefined);
    return Response.json({ data: { viewer: { zones: [{}] } } });
  });
  const req = new Request('https://histomaps.org/api/analytics?range=24h&excludeOwn=0', { headers: {
    'x-dashboard-password': env.DASHBOARD_PASSWORD, 'cf-connecting-ip': '192.0.2.1', 'x-excluded-ips': '["192.0.2.2"]',
  } });
  const data = await (await onRequestGet({ request: req, env })).json();
  assert.deepEqual(data.exclusions, { enabled: false, currentIP: null, count: 0 });
});

test('malformed exclusion lists are rejected before making upstream requests', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Unexpected query'));
  for (const value of ['not json', '{}', '["999.1.1.1"]', '["192.0.2.0/24"]', JSON.stringify(Array(21).fill('192.0.2.1'))]) {
    const req = request(); req.headers.set('x-excluded-ips', value);
    assert.equal((await onRequestGet({ request: req, env })).status, 400);
  }
});

test('dashboard remembers new connections, expires old ones and can show all traffic', async () => {
  const html = await readFile(new URL('../dashboard/index.html', import.meta.url), 'utf8');
  const elements = new Map(), storage = new Map(), requests = [];
  storage.set('histomaps-excluded-connections', JSON.stringify([
    { ip: '192.0.2.10', seenAt: Date.now() - 8 * 86400000 },
    { ip: '192.0.2.11', seenAt: Date.now() - 86400000 },
  ]));
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: id === 'dashboard', checked: id === 'exclude-own', value: '', textContent: '', innerHTML: '',
      classList: { toggle() {} }, listeners: {},
      addEventListener(event, listener) { this.listeners[event] = listener; }, focus() {},
    });
    return elements.get(id);
  };
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document: { documentElement: {}, getElementById: element, querySelectorAll: () => [] }, Intl, Date, Map,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return Response.json({ visits: 1, series: [], generatedAt: new Date().toISOString(), exclusions: {
        enabled: !url.includes('excludeOwn=0'), currentIP: url.includes('excludeOwn=0') ? null : '192.0.2.12', count: 2,
      } });
    },
  });
  element('password').value = 'test-password';
  element('login-form').listeners.submit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(requests[0].url, /excludeOwn=1/);
  assert.deepEqual(JSON.parse(requests[0].options.headers['x-excluded-ips']), ['192.0.2.11']);
  assert.deepEqual(JSON.parse(storage.get('histomaps-excluded-connections')).map(x => x.ip), ['192.0.2.11', '192.0.2.12']);
  element('exclude-own').checked = false;
  element('exclude-own').listeners.change();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(requests[1].url, /excludeOwn=0/);
  assert.equal(requests[1].options.headers['x-excluded-ips'], '[]');
  assert.equal(storage.get('histomaps-exclude-own'), '0');
  assert.match(element('exclusion-status').textContent, /Showing all traffic/);
});
