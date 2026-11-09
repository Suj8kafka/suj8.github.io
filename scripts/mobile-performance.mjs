// Local, cold-cache Chromium measurement; this is not a Lighthouse or CrUX score.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const browserPath = option('--browser', process.env.BROWSER_PATH || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe');
const url = option('--url', 'http://127.0.0.1:8000/');
const output = resolve(option('--output', '.tmp/mobile-performance.json'));
const mobile = !args.includes('--desktop'), fast = args.includes('--fast'), noJs = args.includes('--no-js');
const width = mobile ? 390 : 1440, height = mobile ? 844 : 1000, waitMs = fast ? 12000 : 16000;
const profile = await mkdtemp(join(tmpdir(), 'portfolio-performance-'));
const delay = ms => new Promise(done => setTimeout(done, ms));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  if (!port) throw new Error('Browser did not start. Supply --browser with a Chromium executable path.');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(done => socket.addEventListener('open', done, { once: true }));
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  // Avoid creating real visitor records during QA; fonts and local resources are included.
  await send('Network.setBlockedURLs', { urls: ['*firebase*', '*cloudflare*', '*identitytoolkit*'] });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await send('Emulation.setCPUThrottlingRate', { rate: fast ? 1 : 4 });
  await send('Network.emulateNetworkConditions', { offline: false, latency: fast ? 0 : 150, downloadThroughput: fast ? -1 : 1600000 / 8, uploadThroughput: fast ? -1 : 750000 / 8, connectionType: fast ? 'ethernet' : 'cellular4g' });
  if (noJs) await send('Emulation.setScriptExecutionDisabled', { value: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__lcp = [];
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__lcp.push({ time: e.startTime, size: e.size, url: e.url,
        element: e.element?.tagName, id: e.element?.id, className: e.element?.className });
    }).observe({type: 'largest-contentful-paint', buffered: true});
  ` });
  await send('Page.navigate', { url });
  await delay(waitMs);
  const result = await evaluate(`({
    lcp: window.__lcp?.at(-1), candidates: window.__lcp,
    paints: performance.getEntriesByType('paint').map(e => ({name:e.name, time:e.startTime})),
    resources: performance.getEntriesByType('resource').map(e => ({url:e.name,start:e.startTime,duration:e.duration,bytes:e.encodedBodySize,kind:e.initiatorType})),
    mobile: matchMedia('(max-width: 800px)').matches,
    loaderRunning: document.documentElement.classList.contains('loader-running'),
    heroSource: document.querySelector('.portrait-base')?.currentSrc,
    inlinePortrait: !!document.querySelector('.portrait-path-art'),
    motionEngine: document.documentElement.dataset.motionEngine,
    trail: !!document.querySelector('.scroll-trail'),
    fonts: document.fonts.status,
    overflow: document.documentElement.scrollWidth > innerWidth
  })`);
  const report = { url, measuredAt: new Date().toISOString(), conditions: { width, height, dpr:mobile ? 2 : 1, cpuSlowdown:fast ? 1 : 4, latencyMs:fast ? 0 : 150, downloadMbps:fast ? null : 1.6, javascript:!noJs, cache:'cold', thirdPartyVisitorServices:'blocked', waitMs }, ...result };
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  const screenshot = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
  await writeFile(output.replace(/\.json$/, '.png'), Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({output, lcp:result.lcp, paints:result.paints, loaderRunning:result.loaderRunning, heroSource:result.heroSource, inlinePortrait:result.inlinePortrait, motionEngine:result.motionEngine, trail:result.trail, overflow:result.overflow, fonts:result.fonts}));
  if (args.includes('--check-scroll') && !noJs) {
    await evaluate('window.scrollTo({top:500,behavior:"instant"})');
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await evaluate('document.documentElement.dataset.motionEngine === "gsap"')) break;
      await delay(100);
    }
    report.afterScroll = await evaluate('({motionEngine:document.documentElement.dataset.motionEngine,trail:!!document.querySelector(".scroll-trail"),secondaryFonts:!!document.getElementById("secondary-fonts"),pageStyles:document.documentElement.dataset.pageStyles})');
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({afterScroll:report.afterScroll}));
  }
  if (args.includes('--export-portrait')) {
    const widths = option('--export-widths', '440,640,880').split(',').map(Number);
    if (widths.some(width => !Number.isInteger(width) || width < 1 || width > 1145)) throw new Error('Portrait widths must be integers from 1 to 1145.');
    await send('Emulation.setCPUThrottlingRate', { rate:1 });
    const images = await evaluate(`(async () => {
      const image = new Image(); image.src = new URL('assets/images/sujeet-hero-%20vector2.svg', location.href).href;
      await image.decode();
      return ${JSON.stringify(widths)}.map(width => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.round(width * 1527 / 1145);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return {width, height:canvas.height, data:canvas.toDataURL('image/webp', width === 640 ? .76 : .82).split(',')[1]};
      });
    })()`);
    for (const image of images) {
      const path = resolve(`assets/images/sujeet-hero-${image.width}.webp`);
      const bytes = Buffer.from(image.data, 'base64'); await writeFile(path, bytes);
      console.log(JSON.stringify({path, width:image.width, height:image.height, bytes:bytes.length}));
    }
  }
  await send('Browser.close').catch(() => {});
} finally { socket?.close(); browser.kill(); }
