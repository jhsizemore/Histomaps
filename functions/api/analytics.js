const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const DEFAULT_HOST = "histomaps.org";
const MAX_DAYS = 7;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function startOfHour(date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function buildWindows(hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  const windows = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const next = new Date(Math.min(cursor.getTime() + 24 * 60 * 60 * 1000, end.getTime()));
    windows.push({ start: cursor.toISOString(), end: next.toISOString() });
    cursor = next;
  }
  return windows;
}

function looksLikePage(path) {
  if (!path || path.startsWith("/cdn-cgi/") || path.startsWith("/api/") || path.startsWith("/dashboard")) return false;
  return !/\.(?:avif|bmp|css|csv|gif|ico|jpe?g|js|json|map|mp3|mp4|pdf|png|svg|txt|webm|webp|woff2?|xml)$/i.test(path);
}

function add(map, key, value) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + Number(value || 0));
}

function top(map, limit = 8) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

const QUERY = `
query HistomapsAnalytics($zoneTag: string, $filter: filter) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      series: httpRequestsAdaptiveGroups(
        limit: 2000
        orderBy: [datetimeHour_ASC]
        filter: $filter
      ) {
        sum { visits }
        dimensions { datetimeHour }
      }
      paths: httpRequestsAdaptiveGroups(
        limit: 150
        orderBy: [count_DESC]
        filter: $filter
      ) {
        count
        dimensions { clientRequestPath }
      }
      referrers: httpRequestsAdaptiveGroups(
        limit: 100
        orderBy: [count_DESC]
        filter: $filter
      ) {
        count
        sum { visits }
        dimensions { clientRefererHost }
      }
      countries: httpRequestsAdaptiveGroups(
        limit: 100
        orderBy: [count_DESC]
        filter: $filter
      ) {
        count
        sum { visits }
        dimensions { clientCountryName }
      }
      devices: httpRequestsAdaptiveGroups(
        limit: 20
        orderBy: [count_DESC]
        filter: $filter
      ) {
        count
        sum { visits }
        dimensions { clientDeviceType }
      }
    }
  }
}`;

async function queryWindow(env, host, window) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        zoneTag: env.CLOUDFLARE_ZONE_ID,
        filter: {
          datetime_geq: window.start,
          datetime_lt: window.end,
          clientRequestHTTPHost: host,
          requestSource: "eyeball",
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.errors?.length) {
    const detail = payload?.errors?.map((error) => error.message).filter(Boolean).join("; ") || `Cloudflare returned HTTP ${response.status}`;
    throw new Error(detail);
  }

  const zone = payload?.data?.viewer?.zones?.[0];
  if (!zone) throw new Error("Cloudflare returned no analytics zone data. Check CLOUDFLARE_ZONE_ID and token access.");
  return zone;
}

export async function onRequestGet({ request, env }) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_ID || !env.DASHBOARD_PASSWORD) {
    return json({
      error: "Analytics is not configured yet.",
      missing: [
        !env.CLOUDFLARE_API_TOKEN && "CLOUDFLARE_API_TOKEN",
        !env.CLOUDFLARE_ZONE_ID && "CLOUDFLARE_ZONE_ID",
        !env.DASHBOARD_PASSWORD && "DASHBOARD_PASSWORD",
      ].filter(Boolean),
    }, 503);
  }

  const suppliedPassword = request.headers.get("x-dashboard-password") || "";
  if (!safeEqual(suppliedPassword, env.DASHBOARD_PASSWORD)) {
    return json({ error: "Incorrect dashboard password." }, 401);
  }

  const url = new URL(request.url);
  const requestedRange = url.searchParams.get("range") || "7d";
  const hours = requestedRange === "24h" ? 24 : MAX_DAYS * 24;
  const host = env.HISTOMAPS_ANALYTICS_HOST || DEFAULT_HOST;
  const windows = buildWindows(hours);

  const series = new Map();
  const pages = new Map();
  const referrers = new Map();
  const countries = new Map();
  const devices = new Map();

  try {
    for (const window of windows) {
      const zone = await queryWindow(env, host, window);

      for (const row of zone.series || []) {
        const hour = row?.dimensions?.datetimeHour;
        add(series, hour, row?.sum?.visits);
      }
      for (const row of zone.paths || []) {
        const path = row?.dimensions?.clientRequestPath;
        if (looksLikePage(path)) add(pages, path, row?.count);
      }
      for (const row of zone.referrers || []) {
        const raw = (row?.dimensions?.clientRefererHost || "").trim().toLowerCase();
        if (raw === host || raw === `www.${host}`) continue;
        add(referrers, raw || "Direct", row?.sum?.visits || row?.count);
      }
      for (const row of zone.countries || []) {
        add(countries, row?.dimensions?.clientCountryName || "Unknown", row?.sum?.visits || row?.count);
      }
      for (const row of zone.devices || []) {
        add(devices, row?.dimensions?.clientDeviceType || "Unknown", row?.sum?.visits || row?.count);
      }
    }

    const seriesRows = [...series.entries()]
      .map(([time, visits]) => ({ time, visits }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const visits = seriesRows.reduce((sum, row) => sum + row.visits, 0);
    const worldOpens = [...pages.entries()]
      .filter(([path]) => path === "/world" || path.startsWith("/world/"))
      .reduce((sum, [, value]) => sum + value, 0);

    return json({
      generatedAt: new Date().toISOString(),
      host,
      range: requestedRange === "24h" ? "24h" : "7d",
      visits,
      worldOpens,
      series: seriesRows,
      pages: top(pages, 10),
      referrers: top(referrers, 8),
      countries: top(countries, 8),
      devices: top(devices, 6),
      note: "Visits use Cloudflare's edge visit metric. Page rankings use requests to likely HTML routes and exclude common static asset extensions.",
    });
  } catch (error) {
    return json({
      error: "Cloudflare analytics query failed.",
      detail: error instanceof Error ? error.message : String(error),
    }, 502);
  }
}
