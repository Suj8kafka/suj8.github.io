import { pageLabels, sectionLabels, interactionLabels, depthLabels } from '../assets/js/analytics-config.js';

const dayMs = 86400000;
const referrerGroups = new Map([
  ['google.com', 'Google'], ['bing.com', 'Bing'], ['duckduckgo.com', 'DuckDuckGo'],
  ['linkedin.com', 'LinkedIn'], ['lnkd.in', 'LinkedIn'], ['github.com', 'GitHub'],
  ['facebook.com', 'Facebook'], ['instagram.com', 'Instagram'], ['t.co', 'X'],
  ['twitter.com', 'X'], ['x.com', 'X'], ['medium.com', 'Medium'], ['behance.net', 'Behance']
]);

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'cache-control': status >= 400 ? 'no-store' : 'public, max-age=300'
  } });
}

function allowedOrigin(request, env) {
  const hostname = env.SITE_HOSTNAME || 'www.sujeetkhadka.com.np';
  const bare = hostname.replace(/^www\./, '');
  const origin = request.headers.get('origin');
  return [ `https://${bare}`, `https://www.${bare}` ].includes(origin) ? origin : null;
}

function referrerGroup(value) {
  if (!value) return 'Direct / unknown';
  // Store a fixed category, never an arbitrary hostname, path, query or campaign tag.
  if (typeof value !== 'string' || !/^[a-z0-9.-]{1,253}$/i.test(value)) return 'Other websites';
  const host = value.toLowerCase();
  for (const [domain, label] of referrerGroups) {
    if (host === domain || host.endsWith(`.${domain}`)) return label;
  }
  return 'Other websites';
}

function browserGroup(agent) {
  if (/Edg(?:e|A|iOS)?\//.test(agent)) return 'Edge';
  if (/OPR\/|Opera\//.test(agent)) return 'Opera';
  if (/Firefox\/|FxiOS\//.test(agent)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(agent)) return 'Chrome';
  if (/Safari\//.test(agent)) return 'Safari';
  return 'Other';
}

async function readEvent(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}

async function collect(request, env) {
  const origin = allowedOrigin(request, env);
  if (!origin) return json({ error: 'Origin not allowed' }, 403);
  const headers = {
    'access-control-allow-origin': origin, 'cache-control': 'no-store', 'vary': 'Origin'
  };
  // Respect browser privacy signals even if a caller bypasses the browser tracker.
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') {
    return new Response(null, { status: 204, headers });
  }
  if (!env.ANALYTICS_DB) return json({ error: 'Usage analytics is not configured yet' }, 503, origin);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) {
    return json({ error: 'Expected JSON' }, 415, origin);
  }
  const event = await readEvent(request);
  const fields = {
    pageview: ['type', 'path', 'referrer', 'timing'], interaction: ['type', 'path', 'name'],
    section: ['type', 'path', 'name'], depth: ['type', 'path', 'name'],
    engagement: ['type', 'path', 'milliseconds', 'sections']
  };
  if (!event || typeof event !== 'object' || Array.isArray(event)
    || !Object.hasOwn(fields, event.type) || Object.keys(event).some(key => !fields[event.type].includes(key))
    || !Object.hasOwn(pageLabels, event.path)) return json({ error: 'Invalid event' }, 400, origin);
  const metrics = [];
  if (event.type === 'pageview' && (event.timing === undefined || typeof event.timing === 'boolean')
    && (event.referrer === undefined || (typeof event.referrer === 'string' && event.referrer.length <= 253))) {
    const agent = request.headers.get('user-agent') || '';
    const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent) ? 'Tablet'
      : /Mobile|iPhone|iPod/i.test(agent) ? 'Mobile' : 'Desktop';
    const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'Unknown';
    metrics.push(['pageviews', 'all'], ['pages', event.path], ['referrers', referrerGroup(event.referrer)],
      ['browsers', browserGroup(agent)], ['devices', device], ['countries', country]);
    if (event.timing === true) metrics.push(['timingPageViews', 'all']);
  } else if (event.type === 'interaction' && Object.hasOwn(interactionLabels, event.name) && event.referrer === undefined) {
    metrics.push(['interactions', event.name]);
  } else if (event.type === 'section' && event.path === '/' && Object.hasOwn(sectionLabels, event.name) && event.referrer === undefined) {
    metrics.push(['sections', event.name]);
  } else if (event.type === 'depth' && event.path === '/' && Object.hasOwn(depthLabels, event.name)) {
    metrics.push(['scrollDepth', event.name]);
  } else if (event.type === 'engagement') {
    if (!Number.isSafeInteger(event.milliseconds) || event.milliseconds < 1 || event.milliseconds > 30000
      || !event.sections || typeof event.sections !== 'object' || Array.isArray(event.sections)) {
      return json({ error: 'Invalid engagement sample' }, 400, origin);
    }
    const sections = Object.entries(event.sections);
    if ((event.path !== '/' && sections.length) || sections.some(([name, value]) => !Object.hasOwn(sectionLabels, name)
      || !Number.isSafeInteger(value) || value < 1 || value > event.milliseconds)
      || sections.reduce((sum, [, value]) => sum + value, 0) > event.milliseconds) {
      return json({ error: 'Invalid engagement sample' }, 400, origin);
    }
    metrics.push(['pageTime', event.path, event.milliseconds]);
    sections.forEach(([name, value]) => metrics.push(['sectionTime', name, value]));
  } else return json({ error: 'Invalid event' }, 400, origin);

  const day = new Date().toISOString().slice(0, 10);
  try {
    const results = await env.ANALYTICS_DB.batch(metrics.map(([metric, label, value = 1]) => env.ANALYTICS_DB.prepare(
      'INSERT INTO daily_metrics (day, metric, label, count) VALUES (?, ?, ?, ?) '
      + 'ON CONFLICT(day, metric, label) DO UPDATE SET count = count + excluded.count'
    ).bind(day, metric, label, value)));
    if (results.some(result => result.success !== true)) throw new Error('Write failed');
    return new Response(null, { status: 204, headers });
  } catch { return json({ error: 'Usage analytics could not be saved' }, 502, origin); }
}

async function report(request, env) {
  if (!env.ANALYTICS_DB) return json({ error: 'Usage analytics is not configured yet' }, 503);
  const rawDays = new URL(request.url).searchParams.get('days') || '7';
  if (!['1', '7', '30'].includes(rawDays)) return json({ error: 'Choose 1, 7 or 30 days' }, 400);
  const days = Number(rawDays);
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - (days - 1) * dayMs);
  try {
    const result = await env.ANALYTICS_DB.prepare(
      "SELECT CASE WHEN metric = 'pageviews' THEN day ELSE '' END AS day, metric, label, SUM(count) AS count "
      + 'FROM daily_metrics WHERE day >= ? AND day <= ? '
      + "GROUP BY metric, label, CASE WHEN metric = 'pageviews' THEN day ELSE '' END ORDER BY day"
    ).bind(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).all();
    if (result.success !== true || !Array.isArray(result.results)) throw new Error('Read failed');
    const totals = { pages: {}, referrers: {}, browsers: {}, devices: {}, countries: {}, interactions: {}, sections: {},
      pageTime: {}, sectionTime: {}, scrollDepth: {} };
    const daily = new Map(Array.from({ length: days }, (_, i) => [
      new Date(start.getTime() + i * dayMs).toISOString().slice(0, 10), 0
    ]));
    let pageViews = 0, timingPageViews = 0;
    for (const row of result.results) {
      if (!Number.isSafeInteger(row.count) || row.count < 0) throw new Error('Invalid count');
      if (row.metric === 'pageviews') {
        pageViews += row.count;
        if (daily.has(row.day)) daily.set(row.day, daily.get(row.day) + row.count);
      } else if (row.metric === 'timingPageViews') timingPageViews += row.count;
      else if (Object.hasOwn(totals, row.metric)) {
        const group = totals[row.metric];
        // Labels are controlled by the collector; use own properties defensively.
        Object.defineProperty(group, row.label, { value: (Object.hasOwn(group, row.label) ? group[row.label] : 0) + row.count,
          enumerable: true, configurable: true });
      }
    }
    const lists = Object.fromEntries(Object.entries(totals).map(([metric, values]) => [metric,
      Object.entries(values).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    ]));
    const activeTimeMs = lists.pageTime.reduce((sum, item) => sum + item.value, 0);
    return json({ days, pageViews, interactions: lists.interactions.reduce((sum, item) => sum + item.value, 0),
      activeTimeMs, timingPageViews, averageActiveTimeMs: timingPageViews ? Math.round(activeTimeMs / timingPageViews) : null,
      daily: [...daily].map(([date, value]) => ({ date, value })), breakdowns: lists, updatedAt: end.toISOString() });
  } catch { return json({ error: 'Usage analytics are temporarily unavailable' }, 502); }
}

export async function handleUsage(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== '/collect' && path !== '/usage') return null;
  if (request.method === 'OPTIONS') {
    const origin = path === '/collect' ? allowedOrigin(request, env) : '*';
    if (!origin) return json({ error: 'Origin not allowed' }, 403);
    return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': origin, 'access-control-allow-methods': path === '/collect' ? 'POST, OPTIONS' : 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type', 'access-control-max-age': '86400',
      'cache-control': 'no-store', 'vary': 'Origin'
    } });
  }
  if (path === '/collect' && request.method === 'POST') return collect(request, env);
  if (path === '/usage' && request.method === 'GET') return report(request, env);
  return json({ error: 'Method not allowed' }, 405);
}

export async function pruneUsage(env) {
  if (!env.ANALYTICS_DB) return;
  const cutoff = new Date(Date.now() - 89 * dayMs).toISOString().slice(0, 10);
  const result = await env.ANALYTICS_DB.prepare('DELETE FROM daily_metrics WHERE day < ?').bind(cutoff).run();
  if (result.success !== true) throw new Error('Analytics retention cleanup failed');
}
