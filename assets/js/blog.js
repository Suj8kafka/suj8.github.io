import { createBlogMotion } from './blog-motion.js?v=20261123-performance';

export function createBlogController({ document, window }) {
  let motion;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
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
      if (count) count.textContent = `${cards.length} ${cards.length === 1 ? 'story' : 'stories'}`;
    }
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createBlogController({ document, window });
}
