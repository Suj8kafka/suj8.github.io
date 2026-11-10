import { analyticsEndpoint, pageLabels, sectionLabels } from './analytics-config.js?v=20261110-engagement';
import { createEngagementTracker } from './engagement-tracker.js?v=20261110-engagement';

export function createUsageTracker({ document, window, fetch = window.fetch.bind(window) }) {
  const path = window.location.pathname === '/privacy' ? '/privacy/' : window.location.pathname;
  const production = ['sujeetkhadka.com.np', 'www.sujeetkhadka.com.np'].includes(window.location.hostname);
  const privateBrowser = () => window.navigator.doNotTrack === '1' || window.doNotTrack === '1'
    || window.navigator.globalPrivacyControl === true;
  if (!production || !Object.hasOwn(pageLabels, path) || privateBrowser()) return { destroy() {} };

  let destroyed = false, viewed = false, sent = 0, timeReports = 0, lastClick = -Infinity;
  const reached = new Set();
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  function send(type, details = {}, allowHidden = false) {
    if (destroyed || (!allowHidden && document.hidden) || privateBrowser()) return;
    if (type === 'engagement') { if (timeReports >= 240) return; timeReports++; }
    else { if (sent >= 80) return; sent++; }
    // Only fixed event labels and a known public path. Never read inputs or link text.
    try {
      Promise.resolve(fetch(`${analyticsEndpoint}/collect`, {
        method: 'POST', credentials: 'omit', mode: 'cors', cache: 'no-store',
        referrerPolicy: 'no-referrer', keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, path, ...details })
      })).catch(() => {});
    } catch { /* Analytics must not interrupt navigation or site interactions. */ }
  }
  function pageview() {
    if (viewed || document.hidden) return;
    viewed = true;
    let referrer = '';
    try {
      const url = new URL(document.referrer);
      if (['http:', 'https:'].includes(url.protocol)
        && !['sujeetkhadka.com.np', 'www.sujeetkhadka.com.np'].includes(url.hostname)) referrer = url.hostname;
    } catch {}
    send('pageview', { referrer, timing: true });
  }
  const sections = path === '/' ? [...document.querySelectorAll('main > section[id], main > section.hero')]
    .filter(node => Object.hasOwn(sectionLabels, node.id || 'hero')) : [];
  const engagement = createEngagementTracker({ document, window, sections,
    send: (type, details) => send(type, details, type === 'engagement') });
  const observer = window.IntersectionObserver ? new window.IntersectionObserver(entries => {
    if (document.hidden) return;
    entries.forEach(entry => {
      const name = entry.target.id || 'hero';
      if (entry.isIntersecting && !reached.has(name)) {
        reached.add(name);
        send('section', { name });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '-15% 0px -15% 0px' }) : null;
  const observe = () => sections.forEach(node => { if (!reached.has(node.id || 'hero')) observer?.observe(node); });

  listen(document, 'click', event => {
    if (event.defaultPrevented || event.button > 0 || document.hidden) return;
    const control = event.target.closest?.('a[href], button');
    if (!control) return;
    let name;
    if (control.matches('[data-theme-choice]')) name = 'theme-change';
    else if (control.matches('.skill-card-trigger')) name = 'skill-open';
    else if (control.matches('a[href]')) {
      const url = new URL(control.href, window.location.href);
      if (url.protocol === 'mailto:') name = 'contact-email';
      else if (url.pathname.endsWith('.pdf') && url.origin === window.location.origin) name = 'resume-download';
      else if (control.closest('.featured-work-card, .more-projects-grid')) name = 'project-open';
      else if (control.closest('.article-card')) name = 'article-open';
      else if (control.closest('.social-links')) name = 'social-link';
      else if (url.hostname === 'blog.sujeetkhadka.com.np') name = 'blog-open';
    }
    if (!name || Date.now() - lastClick < 250) return;
    lastClick = Date.now();
    send('interaction', { name });
  });
  listen(document, 'visibilitychange', () => {
    if (!document.hidden) { pageview(); observe(); }
  });
  listen(window, 'pagehide', event => {
    observer?.disconnect();
    if (!event.persisted) destroy();
  });
  listen(window, 'pageshow', event => { if (event.persisted) observe(); });
  function destroy() {
    engagement.destroy();
    destroyed = true;
    observer?.disconnect();
    listeners.forEach(remove => remove());
  }
  pageview();
  observe();
  return { destroy };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createUsageTracker({ document, window });
