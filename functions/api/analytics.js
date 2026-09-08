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

function normalizeIP(value) {
  if (typeof value !== "string" || value.length > 45) return null;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    const parts = value.split(".");
    return parts.every(part => Number(part) <= 255 && String(Number(part)) === part) ? value : null;
  }
  if (!/^[0-9a-f:]+$/i.test(value) || !value.includes(":")) return null;
  try { return new URL(`http://[${value}]/`).hostname.slice(1, -1); } catch { return null; }
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

const PUBLIC_PAGES = new Set([
  "/", "/world", "/starwars", "/about", "/journal",
  "/journal/a-histomap-is-an-argument",
  "/journal/every-map-chooses-what-deserves-space",
]);

function looksLikePage(path) {
  if (!path) return false;
  const normalized = path.toLowerCase().replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  return PUBLIC_PAGES.has(normalized);
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
query HistomapsAnalytics($zoneTag: string, $filter: filter, $attributionFilter: filter) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      arrivals: httpRequestsAdaptiveGroups(limit: 1000, orderBy: [count_DESC], filter: $attributionFilter) {
        count
        dimensions { clientRequestPath }
      }
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

async function queryWindow(env, host, window, includeReferrers = true, excludedIPs = []) {
  const query = includeReferrers ? QUERY : QUERY.replace(/      referrers: httpRequestsAdaptiveGroups\([\s\S]*?dimensions \{ clientRefererHost \}\n      \}\n/, "");
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: env.CLOUDFLARE_ZONE_ID,
        attributionFilter: {
          datetime_geq: window.start, datetime_lt: window.end,
          clientRequestHTTPHost: host, requestSource: "eyeball",
          clientRequestPath_like: "/api/attribution/%", edgeResponseStatus: 204,
          ...(excludedIPs.length ? { clientIP_notin: excludedIPs } : {}),
        },
        filter: {
          datetime_geq: window.start,
          datetime_lt: window.end,
          clientRequestHTTPHost: host,
          requestSource: "eyeball",
          ...(excludedIPs.length ? { clientIP_notin: excludedIPs } : {}),
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (includeReferrers && payload?.errors?.some(error => error.extensions?.code === "authz" && /clientrefererhost/i.test(error.message))) {
    return queryWindow(env, host, window, false, excludedIPs);
  }
  if (!response.ok || !payload || payload.errors?.length) {
    const detail = payload?.errors?.map((error) => error.message).filter(Boolean).join("; ") || `Cloudflare returned HTTP ${response.status}`;
    throw new Error(detail);
  }

  const zone = payload?.data?.viewer?.zones?.[0];
  if (!zone) throw new Error("Cloudflare returned no analytics zone data. Check CLOUDFLARE_ZONE_ID and token access.");
  return { ...zone, referrersAvailable: includeReferrers };
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
  const excludeOwn = url.searchParams.get("excludeOwn") !== "0";
  const currentIP = normalizeIP(request.headers.get("cf-connecting-ip"));
  let savedIPs = [];
  if (excludeOwn) {
    try {
      const raw = request.headers.get("x-excluded-ips") || "[]";
      if (raw.length > 2048) throw new Error();
      savedIPs = JSON.parse(raw);
      if (!Array.isArray(savedIPs) || savedIPs.length > 20 || savedIPs.some(ip => !normalizeIP(ip))) throw new Error();
    } catch { return json({ error: "Invalid saved connection exclusions." }, 400); }
  }
  const excludedIPs = excludeOwn ? [...new Set([currentIP, ...savedIPs.map(normalizeIP)].filter(Boolean))].slice(0, 20) : [];
  const requestedRange = url.searchParams.get("range") || "7d";
  const hours = requestedRange === "24h" ? 24 : MAX_DAYS * 24;
  const host = env.HISTOMAPS_ANALYTICS_HOST || DEFAULT_HOST;
  const windows = buildWindows(hours);

  const series = new Map();
  const pages = new Map();
  const referrers = new Map();
  const countries = new Map();
  const devices = new Map();
  const arrivalSources = new Map(), arrivalCampaigns = new Map(), arrivalPosts = new Map(), arrivalReferrers = new Map(), arrivalLandings = new Map();
  let trackedArrivals = 0, directArrivals = 0;

  let referrersAvailable = true;
  try {
    for (const window of windows) {
      const zone = await queryWindow(env, host, window, referrersAvailable, excludedIPs);
      referrersAvailable = zone.referrersAvailable;

      for (const row of zone.arrivals || []) {
        const path = row?.dimensions?.clientRequestPath || "";
        if (!path.startsWith("/api/attribution/")) continue;
        const fields = path.slice("/api/attribution/".length).split("/");
        if (fields.length !== 6 || fields.some(x => !/^[a-z0-9._-]{1,80}$/.test(x))) continue;
        const [source, medium, campaign, content, referrer, landing] = fields;
        const count = Number(row.count || 0);
        trackedArrivals += count;
        if (source === "direct") directArrivals += count;
        add(arrivalSources, source === "direct" ? "Direct / unknown" : source, count);
        add(arrivalReferrers, referrer === "-" ? "Direct / hidden" : referrer, count);
        add(arrivalLandings, landing, count);
        if (campaign !== "-") add(arrivalCampaigns, `${source} · ${campaign}` + (medium !== "-" ? ` (${medium})` : ""), count);
        if (content !== "-") add(arrivalPosts, `${source} · ${campaign === "-" ? "untagged" : campaign} · ${content}`, count);
      }
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
        add(referrers, raw || "Direct", row?.sum?.visits ?? 0);
      }
      for (const row of zone.countries || []) {
        add(countries, row?.dimensions?.clientCountryName || "Unknown", row?.sum?.visits ?? 0);
      }
      for (const row of zone.devices || []) {
        add(devices, row?.dimensions?.clientDeviceType || "Unknown", row?.sum?.visits ?? 0);
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
      exclusions: { enabled: excludeOwn, currentIP: excludeOwn ? currentIP : null, count: excludedIPs.length },
      host,
      range: requestedRange === "24h" ? "24h" : "7d",
      visits,
      referrersAvailable,
      directShare: !referrersAvailable ? null : visits > 0 ? Math.round((referrers.get("Direct") || 0) / visits * 100) : 0,
      worldOpens,
      attribution: {
        arrivals: trackedArrivals,
        directShare: trackedArrivals ? Math.round(directArrivals / trackedArrivals * 100) : null,
        sources: top(arrivalSources, 12), campaigns: top(arrivalCampaigns, 12),
        posts: top(arrivalPosts, 12), referrers: top(arrivalReferrers, 12), landings: top(arrivalLandings, 8),
        note: "Tracked arrivals start when tracking is deployed. Repeat navigation is suppressed within a 30-minute tab session. These browser-reported counts differ from edge visits and may be sampled, blocked or missing a referrer. Connection exclusions apply. Top 1,000 tracking paths per daily query are included.",
      },
      series: seriesRows,
      pages: top(pages, 10),
      referrers: top(referrers, 8),
      countries: top(countries, 8),
      devices: top(devices, 6),
      note: "Visits use Cloudflare's edge visit metric. Page rankings show requests to published Histomaps pages and exclude unrelated scan paths. These are edge metrics, not unique people; automated traffic may be included." + (referrersAvailable ? "" : " Referrer and direct-traffic data are unavailable on the current Cloudflare plan."),
    });
  } catch (error) {
    return json({
      error: "Cloudflare analytics query failed.",
      detail: error instanceof Error ? error.message : String(error),
    }, 502);
  }
}
