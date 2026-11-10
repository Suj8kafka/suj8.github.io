import { analyticsEndpoint, sectionLabels } from './analytics-config.js?v=20261110-sidebar';
import { validateTraffic, validateUsage, formatDuration } from './analytics-report.js?v=20261110-sidebar';

export function createVisitorPanel({ document, window, fetch = window.fetch.bind(window), now = () => Date.now() }) {
  const panel = document.querySelector('.presence-panel');
  const trigger = document.querySelector('.live-presence');
  if (!panel || !trigger) return { destroy() {} };
  const closeButton = panel.querySelector('.presence-panel-close');
  const refreshButton = panel.querySelector('[data-cloudflare-refresh]');
  const trafficStatus = panel.querySelector('.cloudflare-analytics-status');
  const usageStatus = panel.querySelector('[data-sidebar-usage-status]');
  const trafficGrid = panel.querySelector('.cloudflare-analytics-grid');
  const usageGrid = panel.querySelector('[data-sidebar-usage-grid]');
  const sections = panel.querySelector('[data-sidebar-section-time]');
  const lists = [...panel.querySelectorAll('[data-cloudflare-list]')];
  const listeners = [];
  let controller = null, pending = false, loadedAt = -Infinity, destroyed = false, requestVersion = 0;
  const listen = (target, name, callback) => {
    target?.addEventListener(name, callback);
    listeners.push(() => target?.removeEventListener(name, callback));
  };
  const number = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  function status(node, message, error = false) {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', error);
  }
  function rows(node, entries, duration = false) {
    node.replaceChildren();
    entries.slice(0, 5).forEach(({ name, value }) => {
      const row = document.createElement('div'); row.className = 'cloudflare-list-row';
      const label = document.createElement('span'), count = document.createElement('strong');
      label.textContent = duration ? sectionLabels[name] || name : name;
      count.textContent = duration ? formatDuration(value) : number(value);
      row.append(label, count); node.append(row);
    });
  }
  async function traffic(signal, version) {
    trafficGrid.hidden = true;
    lists.forEach(node => { node.hidden = true; });
    status(trafficStatus, 'Loading Cloudflare traffic…');
    try {
      const response = await fetch(analyticsEndpoint, { signal, credentials: 'omit' });
      if (response.status === 503) throw new Error('setup');
      if (!response.ok) throw new Error('unavailable');
      const data = validateTraffic(await response.json());
      if (destroyed || version !== requestVersion) return false;
      panel.querySelectorAll('[data-cloudflare-stat]').forEach(node => { node.textContent = number(data[node.dataset.cloudflareStat]); });
      trafficGrid.hidden = false;
      lists.forEach(node => {
        const entries = data[node.dataset.cloudflareList];
        rows(node.querySelector('.cloudflare-list-items'), entries);
        node.hidden = entries.length === 0;
      });
      status(trafficStatus, `Last 24 hours · Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
      return true;
    } catch (error) {
      if (destroyed || version !== requestVersion || signal.aborted) return false;
      status(trafficStatus, error.message === 'setup' ? 'Cloudflare traffic analytics are not configured yet.'
        : 'Cloudflare traffic is temporarily unavailable. Try refreshing.', true);
      return false;
    }
  }
  async function usage(signal, version) {
    usageGrid.hidden = true;
    sections.replaceChildren();
    status(usageStatus, 'Loading site usage…');
    try {
      const response = await fetch(`${analyticsEndpoint}/usage?days=7`, { signal, credentials: 'omit' });
      if (response.status === 503 || response.status === 404) throw new Error('setup');
      if (!response.ok) throw new Error('unavailable');
      const data = validateUsage(await response.json(), 7);
      if (destroyed || version !== requestVersion) return false;
      panel.querySelectorAll('[data-sidebar-usage-stat]').forEach(node => {
        const key = node.dataset.sidebarUsageStat;
        node.textContent = key === 'averageActiveTimeMs' ? (data[key] === null ? '—' : formatDuration(data[key]))
          : key === 'activeTimeMs' ? (data[key] || data.timingPageViews ? formatDuration(data[key]) : '—') : number(data[key]);
      });
      usageGrid.hidden = false;
      rows(sections, data.breakdowns.sectionTime.slice(0, 3), true);
      if (!data.breakdowns.sectionTime.length) sections.textContent = 'No section time recorded yet.';
      status(usageStatus, 'Last 7 days, including today · UTC');
      return true;
    } catch (error) {
      if (destroyed || version !== requestVersion || signal.aborted) return false;
      status(usageStatus, error.message === 'setup' ? 'Site usage analytics are not connected yet.'
        : 'Site usage is temporarily unavailable. Try refreshing.', true);
      return false;
    }
  }
  async function load() {
    if (pending || destroyed) return;
    pending = true;
    controller = new AbortController();
    const active = controller, version = ++requestVersion;
    refreshButton.disabled = true;
    const timer = window.setTimeout(() => active.abort(), 9000);
    try {
      const results = await Promise.allSettled([traffic(active.signal, version), usage(active.signal, version)]);
      if (destroyed || version !== requestVersion) return;
      if (active.signal.aborted) {
        if (trafficGrid.hidden) status(trafficStatus, 'Cloudflare traffic timed out. Try refreshing.', true);
        if (usageGrid.hidden) status(usageStatus, 'Site usage timed out. Try refreshing.', true);
      } else if (results.every(result => result.status === 'fulfilled' && result.value)) loadedAt = now();
    } finally {
      window.clearTimeout(timer);
      if (version === requestVersion) { pending = false; refreshButton.disabled = false; }
    }
  }
  function open() {
    panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true'); closeButton.focus({ preventScroll: true });
    if (now() - loadedAt > 300000) load();
  }
  function close() {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    const returnTarget = trigger.getClientRects?.().length === 0 ? document.querySelector('.wordmark') : trigger;
    returnTarget?.focus({ preventScroll: true });
  }
  listen(trigger, 'click', open);
  listen(document.querySelector('.live-presence-list'), 'click', event => {
    if (event.target.closest('[data-open-analytics]')) open();
  });
  listen(closeButton, 'click', close);
  listen(panel, 'click', event => { if (event.target.hasAttribute('data-presence-close')) close(); });
  listen(refreshButton, 'click', load);
  listen(document, 'keydown', event => {
    if (!panel.classList.contains('is-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll('button:not(:disabled), input, a[href]')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  listen(window, 'pagehide', event => {
    controller?.abort();
    if (!event.persisted) destroy();
  });
  listen(window, 'pageshow', event => {
    if (event.persisted && panel.classList.contains('is-open') && now() - loadedAt > 300000) load();
  });
  function destroy() {
    destroyed = true; controller?.abort(); listeners.forEach(remove => remove());
  }
  trigger.disabled = false;
  trigger.dataset.analyticsReady = 'true';
  return { destroy, load };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createVisitorPanel({ document, window });
