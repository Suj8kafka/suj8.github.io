import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { securityHeaders } from '../cloudflare/security-headers.mjs';

const hosts = ['sujeetkhadka.com.np', 'www.sujeetkhadka.com.np'];
export const defaultTargets = hosts.flatMap(host => [
  `https://${host}/`, `https://${host}/login/`,
  `https://${host}/__security-header-check-not-found__`, `http://${host}/`
]);
const redirects = new Set([301, 302, 303, 307, 308]);
const normalize = value => value?.trim().replace(/\s+/g, ' ');

export async function auditSecurityHeaders({ fetchImpl = fetch, targets = defaultTargets, maxRedirects = 5 } = {}) {
  const checks = [];
  for (const target of targets) {
    let url;
    try { url = new URL(target); }
    catch { checks.push({ url: String(target), issues: ['Invalid URL'] }); continue; }
    const visited = new Set();
    for (let hop = 0; ; hop++) {
      const check = { url: url.href, issues: [] };
      checks.push(check);
      if (!['http:', 'https:'].includes(url.protocol)) { check.issues.push('Unsupported URL scheme'); break; }
      if (visited.has(url.href)) { check.issues.push('Redirect loop'); break; }
      visited.add(url.href);
      let response;
      try {
        response = await fetchImpl(url.href, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) });
      } catch { check.issues.push('Request failed'); break; }
      check.status = response.status;
      if (url.protocol === 'https:') {
        for (const [name, expected] of Object.entries(securityHeaders)) {
          const actual = response.headers.get(name);
          if (!actual) check.issues.push(`Missing ${name}`);
          else if (normalize(actual) !== normalize(expected)) check.issues.push(`Unexpected ${name}`);
        }
      }
      if (!redirects.has(response.status)) {
        if (url.protocol === 'http:') check.issues.push('HTTP must redirect to HTTPS');
        break;
      }
      const location = response.headers.get('Location');
      if (!location) { check.issues.push('Redirect has no Location'); break; }
      let next;
      try { next = new URL(location, url); }
      catch { check.issues.push('Invalid redirect Location'); break; }
      if (next.protocol !== 'https:') { check.issues.push('Redirect must use HTTPS'); break; }
      if (hop >= maxRedirects) { check.issues.push('Too many redirects'); break; }
      url = next;
    }
  }
  return { ok: checks.length > 0 && checks.every(check => check.issues.length === 0), checks };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const targets = process.argv.slice(2);
  const result = await auditSecurityHeaders(targets.length ? { targets } : {});
  for (const check of result.checks) {
    console.log(`${check.issues.length ? 'FAIL' : 'PASS'} ${check.status ?? '-'} ${check.url}${check.issues.length ? `: ${check.issues.join(', ')}` : ''}`);
  }
  console.log(result.ok ? 'All checked responses match the security policy.' : 'Security headers are not fully active.');
  process.exitCode = result.ok ? 0 : 1;
}
