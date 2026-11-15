// The visible link and meta refresh remain usable when scripts are unavailable.
const destination = document.querySelector('[data-blog-destination]');
if (destination) {
  const target = new URL(destination.getAttribute('href'), window.location.origin);
  target.search = window.location.search;
  target.hash = window.location.hash;
  destination.href = target.href;
  window.location.replace(target.href);
}
