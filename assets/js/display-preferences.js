import { hydrateDisplayPreferences } from './display-state.js?v=20261115-display';

const groups = [
  ['layout', 'Layout', [['crafted', 'Crafted'], ['reader', 'Reader / Minimal']]],
  ['motion', 'Motion', [['full', 'Full'], ['reduced', 'Reduced']]],
  ['sound', 'Video sound', [['on', 'On'], ['off', 'Off']]],
  ['contrast', 'Contrast', [['standard', 'Standard'], ['high', 'High']]],
  ['textScale', 'Text size', [['100', '100%'], ['115', '115%'], ['130', '130%']]],
  ['dyslexiaSpacing', 'Reading spacing', [['off', 'Default'], ['on', 'Extra']]]
];

export function createDisplayPreferences({ document, window }) {
  const host = document.querySelector('.header-tools, .blog-header');
  if (!host) return { destroy() {} };
  const state = window.skDisplayPreferences || hydrateDisplayPreferences({ document, window });
  let overrides = state.overrides, destroyed = false, legacyOpen = false;
  const listeners = [];
  const listen = (target, name, callback, options) => {
    target.addEventListener(name, callback, options);
    listeners.push(() => target.removeEventListener(name, callback, options));
  };
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'display-trigger';
  trigger.setAttribute('popovertarget', 'a11y-popover');
  trigger.setAttribute('aria-label', 'Display and accessibility preferences');
  trigger.setAttribute('aria-controls', 'a11y-popover');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h7m4 0h5M4 17h3m4 0h9M11 4v6M7 14v6"/></svg><span>Display</span>';
  const panel = document.createElement('div');
  panel.id = 'a11y-popover';
  panel.className = 'display-popover';
  panel.setAttribute('popover', 'auto');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'display-title');
  panel.setAttribute('aria-describedby', 'display-description');
  panel.innerHTML = `<div class="display-heading"><h2 id="display-title">Make yourself comfortable.</h2>
    <button type="button" class="display-close" popovertarget="a11y-popover" popovertargetaction="hide" aria-label="Close display preferences">×</button></div>
    <p id="display-description">A few ways to make this portfolio yours.</p>
    ${groups.map(([name, legend, choices]) => `<fieldset><legend>${legend}</legend><div class="display-options">${choices.map(([value, label]) =>
      `<label><input type="radio" name="display-${name}" data-display-pref="${name}" value="${value}"><span>${label}</span></label>`).join('')}</div></fieldset>`).join('')}
    <p class="display-note">Reduced motion mutes video unless you choose Sound on. Playback always starts with you. Extra spacing increases letter, word and line spacing.</p>
    <button type="button" class="display-reset">Reset to System Defaults</button>
    <p class="display-status" role="status" aria-live="polite" aria-atomic="true"></p>`;
  host.append(trigger);
  document.body.append(panel);
  const controls = [...panel.querySelectorAll('[data-display-pref]')];
  const status = panel.querySelector('.display-status');
  function render(message = '') {
    state.overrides = overrides;
    const preferences = state.apply(overrides);
    controls.forEach(control => { control.checked = preferences[control.dataset.displayPref] === control.value; });
    if (message) status.textContent = message;
    document.dispatchEvent(new window.CustomEvent('display-preferences:change', { detail: { ...preferences } }));
  }
  function persist(reset = false) {
    try {
      if (reset) window.localStorage.removeItem(state.key);
      else window.localStorage.setItem(state.key, JSON.stringify(overrides));
      return reset ? 'System defaults restored.' : 'Preferences saved on this browser.';
    } catch { return 'Applied for this visit. Browser storage is unavailable.'; }
  }
  listen(panel, 'change', event => {
    const { displayPref: name } = event.target.dataset || {};
    if (!state.allowed[name]?.includes(event.target.value)) return;
    overrides = { ...overrides, [name]: event.target.value };
    render(persist());
  });
  listen(panel.querySelector('.display-reset'), 'click', () => {
    overrides = {};
    render(persist(true));
  });
  listen(state.motion, 'change', () => render());
  listen(state.contrast, 'change', () => render());
  listen(window, 'storage', event => {
    if (event.key !== null && event.key !== state.key) return;
    overrides = state.read();
    render('Preferences updated.');
  });
  // Native video controls and the popover share one mute preference. Never call play() here.
  document.querySelectorAll('audio, video').forEach(media => {
    const sync = () => {
      const muted = document.documentElement.dataset.sound === 'off';
      if (media.muted !== muted) media.muted = muted;
      const label = document.querySelector('[data-intro-play-label]');
      if (media.id === 'introVid' && label) label.textContent = muted ? 'Play video (muted)' : 'Play with sound';
    };
    listen(document, 'display-preferences:change', sync);
    listen(media, 'volumechange', () => {
      if (media.muted === (document.documentElement.dataset.sound === 'off')) return;
      overrides = { ...overrides, sound: media.muted ? 'off' : 'on' };
      render(persist());
    });
    sync();
  });
  if (typeof panel.showPopover !== 'function') {
    // Small fallback for older browsers; current browsers own dismissal and focus themselves.
    panel.hidden = true;
    panel.removeAttribute('popover');
    panel.classList.add('display-popover-fallback');
    const close = (restore = false) => {
      panel.hidden = true; legacyOpen = false;
      trigger.setAttribute('aria-expanded', 'false');
      if (restore) trigger.focus({ preventScroll: true });
    };
    listen(trigger, 'click', () => {
      if (legacyOpen) close();
      else {
        panel.hidden = false; legacyOpen = true;
        trigger.setAttribute('aria-expanded', 'true');
        panel.querySelector('.display-close').focus({ preventScroll: true });
      }
    });
    listen(panel.querySelector('.display-close'), 'click', () => close(true));
    listen(document, 'pointerdown', event => {
      if (legacyOpen && !panel.contains(event.target) && !trigger.contains(event.target)) close();
    });
    listen(document, 'keydown', event => {
      if (legacyOpen && event.key === 'Escape') { event.preventDefault(); close(true); }
    });
  }
  render();
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    listeners.forEach(remove => remove());
    trigger.remove(); panel.remove();
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createDisplayPreferences({ document, window });
