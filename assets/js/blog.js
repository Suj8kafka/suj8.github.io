import { createBlogMotion } from './blog-motion.js?v=20261115-design-loop';

export function createBlogController({ document, window }) {
  let motion;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const choices = [...document.querySelectorAll('[data-theme-choice]')];
  let preference = 'auto';
  try {
    const stored = window.localStorage.getItem('portfolio-theme');
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {}
  function renderTheme() {
    root.dataset.theme = preference === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : preference;
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.themeChoice === preference)));
  }
  choices.forEach(choice => listen(choice, 'click', () => {
    preference = choice.dataset.themeChoice;
    try { window.localStorage.setItem('portfolio-theme', preference); } catch {}
    renderTheme();
  }));
  listen(systemTheme, 'change', renderTheme);
  renderTheme();
  const themeControls = document.querySelector('[data-blog-theme]');
  if (themeControls) themeControls.hidden = false;

  const filters = document.querySelector('[data-notebook-filters]');
  const search = document.querySelector('[data-notebook-search]');
  const topics = [...document.querySelectorAll('[data-notebook-topic]')];
  const cards = [...document.querySelectorAll('[data-notebook-card]')];
  const count = document.querySelector('[data-notebook-count]');
  const empty = document.querySelector('[data-notebook-empty]');
  let topic = 'all';
  function filter() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach(card => {
      const text = card.textContent.toLocaleLowerCase();
      card.hidden = !(topic === 'all' || card.dataset.topic === topic) || !terms.every(term => text.includes(term));
      if (!card.hidden) visible++;
    });
    count.textContent = `${visible} ${visible === 1 ? 'story' : 'stories'}`;
    empty.hidden = visible !== 0;
    topics.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.notebookTopic === topic)));
    motion?.refresh();
  }
  if (filters && search && count && empty) {
    listen(filters, 'submit', event => event.preventDefault());
    listen(search, 'input', filter);
    topics.forEach(button => listen(button, 'click', () => {
      topic = button.dataset.notebookTopic;
      filter();
    }));
    filter();
    filters.hidden = false;
  }
  motion = createBlogMotion({ document, window });
  return {
    destroy() {
      motion.destroy();
      listeners.forEach(remove => remove());
      cards.forEach(card => { card.hidden = false; });
      if (filters) filters.hidden = true;
      if (empty) empty.hidden = true;
      if (themeControls) themeControls.hidden = true;
      if (count) count.textContent = `${cards.length} ${cards.length === 1 ? 'story' : 'stories'}`;
    }
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createBlogController({ document, window });
}
