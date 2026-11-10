import { analyticsEndpoint, pageLabels, sectionLabels, interactionLabels, depthLabels } from './analytics-config.js?v=20261110-engagement';
import { validateUsage, formatDuration } from "./analytics-report.js?v=20261110-sidebar";
export { validateUsage, formatDuration };

const metrics = ['pages', 'referrers', 'countries', 'browsers', 'devices', 'interactions', 'sections', 'pageTime', 'sectionTime', 'scrollDepth'];
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function createPrivacyDashboard({ document, window, fetch = window.fetch.bind(window) }) {
  const usageStatus = document.querySelector('[data-usage-status]');
  const edgeStatus = document.querySelector('[data-edge-status]');
  const period = document.querySelector('[data-analytics-period]');
  const refresh = document.querySelector('[data-analytics-refresh]');
  const chart = document.querySelector('[data-daily-chart]');
  let active = null, version = 0, destroyed = false;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const number = value => new Intl.NumberFormat().format(value);
  let regionNames;
  try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch {}
  function label(metric, name) {
    if (metric === 'pages' || metric === 'pageTime') return pageLabels[name] || name;
    if (metric === 'sections' || metric === 'sectionTime') return sectionLabels[name] || name;
    if (metric === 'scrollDepth') return depthLabels[name] || name;
    if (metric === 'interactions') return interactionLabels[name] || name;
    if (metric === 'countries' && /^[A-Z]{2}$/.test(name)) return regionNames?.of(name) || name;
    return name;
  }
  function status(node, message, state) {
    node.textContent = message;
    node.dataset.state = state;
  }
  function list(metric, entries) {
    const node = document.querySelector(`[data-usage-list="${metric}"]`);
    node.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'analytics-empty';
      empty.textContent = 'No activity recorded in this period.';
      node.append(empty);
      return;
    }
    const maximum = Math.max(...entries.map(item => item.value), 1);
    entries.slice(0, 12).forEach(item => {
      const row = document.createElement('li');
      const name = document.createElement('span');
      const count = document.createElement('strong');
      name.textContent = label(metric, item.name);
      count.textContent = metric === 'pageTime' || metric === 'sectionTime' ? formatDuration(item.value) : number(item.value);
      row.style.setProperty('--bar-size', `${Math.round(item.value / maximum * 100)}%`);
      row.append(name, count);
      node.append(row);
    });
  }
  function clearUsage() {
    for (const metric of ['pageViews', 'interactions', 'activeTimeMs', 'averageActiveTimeMs']) document.querySelector(`[data-usage-stat="${metric}"]`).textContent = '—';
    chart.replaceChildren();
    metrics.forEach(metric => {
      const node = document.querySelector(`[data-usage-list="${metric}"]`);
      const empty = document.createElement('li');
      empty.className = 'analytics-empty';
      empty.textContent = 'Waiting for usage data.';
      node.replaceChildren(empty);
    });
  }
  async function loadUsage(signal, current) {
    clearUsage();
    status(usageStatus, 'Loading public usage data…', 'loading');
    const days = Number(period.value);
    try {
      const response = await fetch(`${analyticsEndpoint}/usage?days=${days}`, { signal, credentials: 'omit' });
      if (response.status === 503 || response.status === 404) throw new Error('setup');
      if (!response.ok) throw new Error('unavailable');
      const data = validateUsage(await response.json(), days);
      if (destroyed || current !== version) return;
      document.querySelector('[data-usage-stat="pageViews"]').textContent = number(data.pageViews);
      document.querySelector('[data-usage-stat="interactions"]').textContent = number(data.interactions);
      document.querySelector('[data-usage-stat="activeTimeMs"]').textContent = data.activeTimeMs || data.timingPageViews ? formatDuration(data.activeTimeMs) : '—';
      document.querySelector('[data-usage-stat="averageActiveTimeMs"]').textContent = data.averageActiveTimeMs === null ? '—' : formatDuration(data.averageActiveTimeMs);
      metrics.forEach(metric => list(metric, data.breakdowns[metric]));
      const maximum = Math.max(...data.daily.map(item => item.value), 1);
      data.daily.forEach(item => {
        const bar = document.createElement('li');
        const count = document.createElement('strong');
        const date = document.createElement('span');
        bar.style.setProperty('--bar-size', `${Math.round(item.value / maximum * 100)}%`);
        count.textContent = number(item.value);
        date.textContent = item.date.slice(5);
        bar.setAttribute('aria-label', `${item.date}: ${number(item.value)} page views`);
        bar.append(count, date);
        chart.append(bar);
      });
      const updated = new Date(data.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      status(usageStatus, `${data.pageViews ? 'Updated' : 'No page views recorded yet. Updated'} ${updated}. Days use UTC.`, 'ready');
    } catch (error) {
      if (destroyed || current !== version || signal.aborted) return;
      clearUsage();
      status(usageStatus, error.message === 'setup'
        ? 'Detailed usage analytics are not connected yet. Counts will appear here after the analytics service is configured.'
        : 'Usage analytics are temporarily unavailable. Please try refreshing.', 'error');
    }
  }
  async function loadEdge(signal, current) {
    ['requests', 'visits'].forEach(key => { document.querySelector(`[data-edge-stat="${key}"]`).textContent = '—'; });
    status(edgeStatus, 'Loading traffic estimates…', 'loading');
    try {
      const response = await fetch(analyticsEndpoint, { signal, credentials: 'omit' });
      if (response.status === 503) throw new Error('setup');
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (!isCount(data.requests) || !isCount(data.visits) || !validDate(data.updatedAt)) throw new Error('invalid');
      if (destroyed || current !== version) return;
      ['requests', 'visits'].forEach(key => { document.querySelector(`[data-edge-stat="${key}"]`).textContent = number(data[key]); });
      status(edgeStatus, `Last 24 hours · Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'ready');
    } catch (error) {
      if (destroyed || current !== version || signal.aborted) return;
      status(edgeStatus, error.message === 'setup' ? 'Cloudflare traffic analytics are not configured yet.'
        : 'Cloudflare traffic estimates are temporarily unavailable.', 'error');
    }
  }
  async function load() {
    active?.abort();
    const controller = new AbortController();
    active = controller;
    const current = ++version;
    const timer = window.setTimeout(() => controller.abort(), 10000);
    refresh.disabled = true;
    await Promise.allSettled([loadUsage(controller.signal, current), loadEdge(controller.signal, current)]);
    window.clearTimeout(timer);
    if (destroyed || current !== version) return;
    if (controller.signal.aborted) {
      [usageStatus, edgeStatus].forEach(node => {
        if (node.dataset.state === 'loading') status(node, 'Analytics request timed out. Please try refreshing.', 'error');
      });
    }
    refresh.disabled = false;
  }
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let themePreference = 'auto';
  try { themePreference = window.localStorage.getItem('portfolio-theme') || 'auto'; } catch {}
  function theme(value) {
    themePreference = ['light', 'dark'].includes(value) ? value : 'auto';
    document.documentElement.dataset.theme = themePreference === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : themePreference;
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === themePreference));
    });
  }
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    listen(button, 'click', () => {
      theme(button.dataset.themeChoice);
      try { window.localStorage.setItem('portfolio-theme', themePreference); } catch {}
    });
  });
  listen(systemTheme, 'change', () => { if (themePreference === 'auto') theme('auto'); });
  theme(themePreference);
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  listen(period, 'change', load);
  listen(refresh, 'click', load);
  listen(window, 'pagehide', event => {
    active?.abort();
    if (!event.persisted) destroy();
  });
  listen(window, 'pageshow', event => { if (event.persisted) load(); });
  function destroy() {
    destroyed = true;
    active?.abort();
    listeners.forEach(remove => remove());
  }
  load();
  return { destroy };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createPrivacyDashboard({ document, window });
