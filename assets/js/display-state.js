// Keep this function self-contained: scripts/sync-display-preferences.mjs inlines it before paint.
export function hydrateDisplayPreferences({ document, window }) {
  const key = 'sk-a11y-prefs';
  const allowed = {
    theme: ['mono', 'original', 'dark', 'auto'],
    layout: ['crafted', 'reader'], motion: ['full', 'reduced'], sound: ['on', 'off'],
    contrast: ['standard', 'high'], textScale: ['100', '115', '130'], dyslexiaSpacing: ['off', 'on']
  };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = window.matchMedia('(prefers-contrast: more)');
  const colourScheme = window.matchMedia('(prefers-color-scheme: dark)');
  function normalize(value) {
    const clean = {};
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(allowed).forEach(name => {
        if (Object.hasOwn(value, name) && allowed[name].includes(value[name])) clean[name] = value[name];
      });
    }
    return clean;
  }
  function read() {
    try {
      const stored = normalize(JSON.parse(window.localStorage.getItem(key)));
      return stored;
    } catch { return {}; }
  }
  function resolve(overrides) {
    overrides = normalize(overrides);
    const prefs = { theme: 'mono', layout: 'crafted', motion: motion.matches ? 'reduced' : 'full',
      contrast: contrast.matches ? 'high' : 'standard', textScale: '100', dyslexiaSpacing: 'off', ...overrides };
    prefs.sound = overrides.sound || (prefs.motion === 'reduced' ? 'off' : 'on');
    return prefs;
  }
  function apply(overrides) {
    const prefs = resolve(overrides);
    Object.keys(allowed).forEach(name => {
      if (name !== 'theme') document.documentElement.dataset[name] = prefs[name];
    });
    document.documentElement.dataset.theme = prefs.theme === 'auto'
      ? (colourScheme.matches ? 'dark' : 'original') : prefs.theme;
    return prefs;
  }
  const overrides = read();
  const initial = apply(overrides);
  // The homepage normally defers below-fold CSS until its portrait decodes. Saved
  // reading layouts need the complete sheet before paint, even with a slow image.
  if (document.documentElement.hasAttribute?.('data-page-styles')
    && (initial.layout === 'reader' || initial.textScale !== '100' || initial.dyslexiaSpacing === 'on')) {
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet'; sheet.href = '/assets/css/site.css?v=20261119-footer-labels';
    sheet.setAttribute('blocking', 'render');
    document.head.append(sheet);
  }
  return { key, allowed, motion, contrast, colourScheme, normalize, read, resolve, apply, overrides };
}

// The explicit preference takes precedence over the OS; Reader also suspends decorative work.
export function motionIsReduced(root, media) {
  return root?.dataset?.layout === 'reader' || (root?.dataset?.motion
    ? root.dataset.motion === 'reduced' : Boolean(media?.matches));
}
