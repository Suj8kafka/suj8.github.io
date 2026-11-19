const defaultEndpoint = 'https://portfolio-assistant.sujeetkhadka00001.workers.dev/api/chat';
const requestTimeoutMs = 25000;

export function isSafeAssistantLink(value, siteOrigin) {
  try {
    const url = new URL(value, siteOrigin);
    return url.protocol === 'https:' || url.origin === siteOrigin;
  } catch {
    return false;
  }
}

function visitorId(windowObject) {
  const key = 'portfolio-assistant-visitor';
  try {
    const existing = windowObject.localStorage.getItem(key);
    if (/^[a-f0-9-]{36}$/i.test(existing || '')) return existing;
  } catch {}
  let value;
  try {
    value = windowObject.crypto.randomUUID();
  } catch {
    const bytes = new Uint8Array(16);
    windowObject.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  try { windowObject.localStorage.setItem(key, value); } catch {}
  return value;
}

export function createPortfolioAssistant({ document, window, fetchFn = window.fetch.bind(window) }) {
  const root = document.querySelector('[data-portfolio-assistant]');
  if (!root) return { destroy() {} };
  const launcher = root.querySelector('[data-assistant-launcher]');
  const panel = root.querySelector('[data-assistant-panel]');
  const closeButton = root.querySelector('[data-assistant-close]');
  const conversation = root.querySelector('[data-assistant-conversation]');
  const messages = root.querySelector('[data-assistant-messages]');
  const suggestions = root.querySelector('[data-assistant-suggestions]');
  const form = root.querySelector('[data-assistant-form]');
  const input = root.querySelector('[data-assistant-input]');
  const sendButton = root.querySelector('[data-assistant-send]');
  const front = root.querySelector('[data-assistant-front]');
  const endpoint = root.dataset.endpoint || defaultEndpoint;
  const id = visitorId(window);
  let pendingController = null;
  let focusFrame = 0;
  let closeTimer = 0;

  function scrollToLatest() {
    window.cancelAnimationFrame(focusFrame);
    focusFrame = window.requestAnimationFrame(() => {
      conversation.scrollTop = conversation.scrollHeight;
    });
  }

  function openPanel() {
    window.clearTimeout(closeTimer);
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    front?.setAttribute('aria-hidden', 'true');
    front?.setAttribute('inert', '');
    launcher.setAttribute('aria-expanded', 'true');
    root.setAttribute('data-open', '');
    window.cancelAnimationFrame(focusFrame);
    focusFrame = window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function closePanel() {
    root.removeAttribute('data-open');
    panel.setAttribute('aria-hidden', 'true');
    front?.removeAttribute('aria-hidden');
    front?.removeAttribute('inert');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus({ preventScroll: true });
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => { panel.hidden = true; }, 560);
  }

  function appendMessage(role, text, options = {}) {
    const message = document.createElement('article');
    message.className = 'assistant-message';
    message.dataset.role = role;
    if (options.state) message.dataset.state = options.state;
    const body = document.createElement('p');
    body.textContent = text;
    message.append(body);

    const verifiedLinks = Array.isArray(options.links) ? options.links.filter(link =>
      link && typeof link.label === 'string' && typeof link.url === 'string'
      && isSafeAssistantLink(link.url, window.location.origin)
    ).slice(0, 3) : [];
    if (verifiedLinks.length) {
      const linkList = document.createElement('div');
      linkList.className = 'assistant-message-links';
      for (const link of verifiedLinks) {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.textContent = `${link.label} ↗`;
        const target = new URL(link.url, window.location.origin);
        if (target.origin !== window.location.origin) {
          anchor.target = '_blank';
          anchor.rel = 'noreferrer';
        }
        linkList.append(anchor);
      }
      message.append(linkList);
    }
    messages.append(message);
    scrollToLatest();
    return message;
  }

  function appendThinking() {
    const message = document.createElement('article');
    message.className = 'assistant-message';
    message.dataset.role = 'assistant';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-label', 'Sujeet’s assistant is thinking');
    const dots = document.createElement('span');
    dots.className = 'assistant-thinking';
    for (let index = 0; index < 3; index += 1) dots.append(document.createElement('i'));
    message.append(dots);
    messages.append(message);
    scrollToLatest();
    return message;
  }

  function setPending(pending) {
    input.disabled = pending;
    sendButton.disabled = pending;
    root.toggleAttribute('data-pending', pending);
  }

  async function ask(question) {
    const cleaned = String(question || '').replace(/\s+/g, ' ').trim();
    if (!cleaned || pendingController) return;
    appendMessage('visitor', cleaned);
    input.value = '';
    suggestions.hidden = true;
    const thinking = appendThinking();
    pendingController = new AbortController();
    const timeout = window.setTimeout(() => pendingController?.abort(), requestTimeoutMs);
    setPending(true);
    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        signal: pendingController.signal,
        headers: { 'content-type': 'application/json', 'x-portfolio-visitor': id },
        body: JSON.stringify({ question: cleaned })
      });
      const payload = await response.json().catch(() => ({}));
      thinking.remove();
      if (!response.ok) throw new Error(payload.error || 'The assistant could not answer right now.');
      if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('The assistant returned an empty answer.');
      appendMessage('assistant', payload.answer.trim(), { links: payload.links });
    } catch (error) {
      thinking.remove();
      const message = error?.name === 'AbortError'
        ? 'The assistant took too long to respond. Please try again.'
        : (error?.message || 'The assistant is temporarily unavailable. Please try again.');
      appendMessage('assistant', message, { state: 'error' });
    } finally {
      window.clearTimeout(timeout);
      pendingController = null;
      setPending(false);
      input.focus({ preventScroll: true });
    }
  }

  function submit(event) {
    event.preventDefault();
    ask(input.value);
  }

  function keydown(event) {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      closePanel();
    } else if (event.target === input && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  }

  function suggestedQuestion(event) {
    const button = event.target.closest('[data-assistant-question]');
    if (button) ask(button.dataset.assistantQuestion);
  }

  launcher.addEventListener('click', openPanel);
  closeButton.addEventListener('click', closePanel);
  form.addEventListener('submit', submit);
  suggestions.addEventListener('click', suggestedQuestion);
  document.addEventListener('keydown', keydown);

  return {
    destroy() {
      pendingController?.abort();
      window.clearTimeout(closeTimer);
      window.cancelAnimationFrame(focusFrame);
      root.removeAttribute('data-open');
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      front?.removeAttribute('aria-hidden');
      front?.removeAttribute('inert');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.removeEventListener('click', openPanel);
      closeButton.removeEventListener('click', closePanel);
      form.removeEventListener('submit', submit);
      suggestions.removeEventListener('click', suggestedQuestion);
      document.removeEventListener('keydown', keydown);
    }
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createPortfolioAssistant({ document, window });
}
