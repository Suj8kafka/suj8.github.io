const clamp = value => Math.max(0, Math.min(1, value));

// Broad S-curves sweep through the page behind the reading layer.
export function createWavePath(height, width = 1200, amplitude = Math.min(width * .34, 400)) {
  const count = Math.max(1, Math.ceil(height / 760));
  const step = height / count, center = width / 2;
  let path = `M ${center} 0`;
  for (let index = 0; index < count; index++) {
    const bend = center + (index % 2 ? -1 : 1) * amplitude * 4 / 3;
    const y = index * step;
    const end = index === count - 1 ? height : (index + 1) * step;
    path += ` C ${bend} ${y + step / 3} ${bend} ${y + step * 2 / 3} ${center} ${end}`;
  }
  return path;
}

export function createScrollTrail({ document, window, gsap, ScrollTrigger, light = false }) {
  const main = document.querySelector('main');
  if (!main || !gsap || !ScrollTrigger) return { destroy() {} };
  const svgNS = 'http://www.w3.org/2000/svg';
  const element = (name, attributes) => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  const svg = element('svg', { class: 'scroll-trail', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
  const path = element('path', { class: 'scroll-trail-line', fill: 'none' });
  svg.append(path);
  const state = { progress: 0 };
  let length = 0, height = 0, width = 0, tween, resizeFrame = 0, destroyed = false;
  function render(progress = state.progress) {
    if (destroyed || !length) return;
    const distance = clamp(progress) * length;
    // Leave the ribbon drawn behind the reader; scrolling back retracts it.
    path.style.strokeDasharray = `${length} ${length}`;
    path.style.strokeDashoffset = `${length - distance}`;
  }
  function measure() {
    const bounds = main.getBoundingClientRect();
    height = Math.max(1, bounds.height);
    width = Math.max(1, bounds.width);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    path.setAttribute('d', createWavePath(height, width));
    length = path.getTotalLength();
  }
  // Measure and render before showing the decoration, including restored scroll positions.
  main.append(svg);
  measure();
  tween = gsap.fromTo(state, { progress: 0 }, {
    progress: 1, duration: 1, ease: 'none', immediateRender: false,
    onUpdate: () => render(),
    scrollTrigger: {
      id: 'portfolio-scroll-trail', trigger: main,
      start: 'top 65%', end: 'bottom 65%', scrub: light ? .15 : .3,
      onRefresh: self => { measure(); render(self.progress); }
    }
  });
  tween.progress(tween.scrollTrigger.progress);
  render();
  svg.classList.add('is-ready');

  // ScrollTrigger handles viewport resize; this covers late images and live content changes.
  const observer = window.ResizeObserver ? new window.ResizeObserver(() => {
    if (destroyed || resizeFrame) return;
    const bounds = main.getBoundingClientRect();
    if (Math.abs(bounds.height - height) < 1 && Math.abs(bounds.width - width) < 1) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!destroyed) tween.scrollTrigger.refresh();
    });
  }) : null;
  observer?.observe(main);
  const onVisibility = () => {
    if (document.hidden) {
      tween.scrollTrigger.disable(false, false);
      tween.scrollTrigger.getTween()?.pause();
    } else {
      tween.scrollTrigger.enable(false);
      tween.scrollTrigger.refresh();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    window.cancelAnimationFrame(resizeFrame);
    document.removeEventListener('visibilitychange', onVisibility);
    tween.scrollTrigger.kill();
    tween.kill();
    svg.remove();
  } };
}
