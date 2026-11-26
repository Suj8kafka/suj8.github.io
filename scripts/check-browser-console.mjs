// Optional real-browser QA. Loads third-party scripts; intercepts measurement
// POSTs after CSP evaluation rather than disabling the scripts being checked.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function redactUrl(value) {
  try {
    const url = new URL(value);
    const version = url.searchParams.get('v') || '';
    const assetVersion = /\.(?:js|css|webp|svg|png|jpe?g|ttf|woff2?)$/i.test(url.pathname) && /^[\w.-]{1,80}$/.test(version);
    return `${url.origin}${url.pathname}${assetVersion ? `?v=${encodeURIComponent(version)}` : ''}`;
  } catch { return String(value); }
}

export function redactText(value) {
  return String(value).replace(/https?:[^\s"'<>]+/g, redactUrl).replace(/AIza[\w-]+/g, '[redacted]');
}

export function consoleIssues({ violations = [], logs = [], failures = [], exceptions = [] }) {
  const preload = entry => /preload(?:ed)?[^\n]*not used/i.test(entry.text);
  return {
    csp: violations.length,
    preload: logs.filter(preload).length,
    otherWarnings: logs.filter(entry => entry.level === 'warning' && !preload(entry)).length,
    otherErrors: logs.filter(entry => entry.level === 'error' && entry.source !== 'security').length,
    network: failures.filter(entry => !entry.cancelled && entry.reason !== 'csp').length,
    runtime: exceptions.length
  };
}

export async function auditBrowserConsole({ browserPath, url, output, slow = false, waitMs = 14000, requireCloudflareBeacon = false }) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  await mkdir(resolve(root, '.tmp'), { recursive: true });
  const profile = await mkdtemp(resolve(root, '.tmp/console-browser-'));
  const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let launchError, socket, nextId = 0;
  browser.on('error', error => { launchError = error; });
  const delay = ms => new Promise(done => setTimeout(done, ms));
  const pending = new Map(), requests = new Map();
  const violations = [], logs = [], failures = [], exceptions = [], measurementPosts = [];
  const report = { checkedAt: new Date().toISOString(), url: redactUrl(url), conditions: { slow, requireCloudflareBeacon, measurementPosts: 'intercepted; scripts and CSP checks enabled' }, cases: [] };
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError;
      try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
      catch { await delay(100); }
    }
    if (!port) throw new Error('Browser did not start. Supply --browser with an installed Chromium executable.');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((done, reject) => {
      socket.addEventListener('open', done, { once: true });
      socket.addEventListener('error', () => reject(new Error('Browser connection failed.')), { once: true });
    });
    const send = (method, params = {}) => new Promise((done, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 20000);
      pending.set(id, { done: result => { clearTimeout(timer); done(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), data = message.params;
      const job = pending.get(message.id);
      if (job) {
        pending.delete(message.id);
        message.error ? job.reject(new Error(message.error.message)) : job.done(message.result);
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(redactText(data.exceptionDetails.exception?.description || data.exceptionDetails.text));
      if (message.method === 'Log.entryAdded' && ['warning', 'error'].includes(data.entry.level)) logs.push({ level: data.entry.level, source: data.entry.source, text: redactText(data.entry.text) });
      if (message.method === 'Runtime.bindingCalled' && data.name === 'auditCsp') {
        const entry = JSON.parse(data.payload);
        violations.push({ directive: entry.directive, blocked: redactUrl(entry.blocked), source: redactUrl(entry.source) });
      }
      if (message.method === 'Network.requestWillBeSent') requests.set(data.requestId, { url: redactUrl(data.request.url), type: data.type });
      if (message.method === 'Network.loadingFailed') failures.push({ ...requests.get(data.requestId), reason: data.blockedReason || data.errorText, cancelled: !!data.canceled });
      if (message.method === 'Fetch.requestPaused') {
        if (data.request.method === 'POST') {
          measurementPosts.push({ url: redactUrl(data.request.url) });
          send('Fetch.fulfillRequest', { requestId: data.requestId, responseCode: 204, responseHeaders: [
            { name: 'access-control-allow-origin', value: new URL(url).origin }, { name: 'access-control-allow-credentials', value: 'true' }
          ] }).catch(() => {});
        } else send('Fetch.continueRequest', { requestId: data.requestId }).catch(() => {});
      }
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(redactText(result.exceptionDetails.exception?.description || result.exceptionDetails.text));
      return result.result.value;
    };
    for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable', 'Page.bringToFront']) await send(method);
    await send('Runtime.addBinding', { name: 'auditCsp' });
    await send('Fetch.enable', { patterns: [
      { urlPattern: '*collect*', requestStage: 'Request' }, { urlPattern: '*/cdn-cgi/rum*', requestStage: 'Request' }
    ] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      document.addEventListener('securitypolicyviolation', event => auditCsp(JSON.stringify({
        directive: event.effectiveDirective, blocked: event.blockedURI, source: event.sourceFile
      })));
    ` });
    if (slow) {
      await send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
    }
    for (const [name, width, fresh, reload] of [
      ['desktop-first', 1440, true, false], ['desktop-reload', 1440, false, true],
      ['phone-first', 390, true, false], ['phone-reload', 390, false, true]
    ]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: width < 800 ? 2 : 1, mobile: width < 800 });
      await send('Emulation.setTouchEmulationEnabled', { enabled: width < 800 });
      if (fresh) {
        await send('Network.clearBrowserCache');
        await send('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'local_storage' });
        await evaluate(`if (location.origin === ${JSON.stringify(new URL(url).origin)}) sessionStorage.clear()`);
      }
      const starts = [violations.length, logs.length, failures.length, exceptions.length];
      await send(reload ? 'Page.reload' : 'Page.navigate', reload ? {} : { url });
      await delay(waitMs);
      const state = await evaluate(`({
        loader: document.documentElement.classList.contains('loader-running'), styles: document.documentElement.dataset.pageStyles,
        beaconScripts: [...document.scripts].map(script => script.src).filter(src => src.includes('cloudflareinsights')),
        preloads: [...document.querySelectorAll('link[rel="preload"]')].map(link => ({ href: link.href, as: link.as, crossOrigin: link.crossOrigin, srcset: link.imageSrcset })),
        hero: document.querySelector('.portrait-base')?.currentSrc,
        resources: performance.getEntriesByType('resource').map(entry => ({ url: entry.name, type: entry.initiatorType }))
      })`);
      state.resources = state.resources.map(entry => ({ ...entry, url: redactUrl(entry.url) }));
      state.preloads = state.preloads.map(entry => ({ ...entry, href: redactUrl(entry.href), srcset: redactText(entry.srcset) }));
      state.beaconScripts = state.beaconScripts.map(redactUrl);
      if (state.hero) state.hero = redactUrl(state.hero);
      if (reload) { await send('Page.navigate', { url: 'about:blank' }); await delay(400); }
      const entry = { name, state, violations: violations.slice(starts[0]), logs: logs.slice(starts[1]), failures: failures.slice(starts[2]), exceptions: exceptions.slice(starts[3]) };
      entry.issues = consoleIssues(entry);
      report.cases.push(entry);
      console.log(JSON.stringify({ name, issues: entry.issues, loader: state.loader, styles: state.styles, cloudflareBeaconPresent: state.beaconScripts.length > 0 }));
    }
    report.measurementPosts = measurementPosts;
    report.passed = report.cases.every(entry => Object.values(entry.issues).every(value => value === 0)
      && (!requireCloudflareBeacon || entry.state.beaconScripts.length > 0));
    await send('Browser.close');
  } catch (error) {
    report.failure = redactText(error.message);
    report.passed = false;
  } finally {
    for (const job of pending.values()) job.reject(new Error('Browser audit closed.'));
    pending.clear();
    socket?.close();
    browser.kill();
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  }
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  const value = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
  if (args.includes('--help')) console.log('Usage: node scripts/check-browser-console.mjs --browser <Chromium executable> [--url <URL>] [--output <JSON path>] [--slow] [--require-cloudflare-beacon]\nChecks first visits and reloads with scripts enabled; intercepts analytics measurement POSTs.');
  else {
    const result = await auditBrowserConsole({
      browserPath: value('--browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
      url: value('--url', 'http://127.0.0.1:5500/'), output: resolve(value('--output', '.tmp/browser-console.json')), slow: args.includes('--slow'), requireCloudflareBeacon: args.includes('--require-cloudflare-beacon')
    });
    console.log(JSON.stringify({ output: value('--output', '.tmp/browser-console.json'), passed: result.passed, failure: result.failure }));
    process.exitCode = result.passed ? 0 : 1;
  }
}
