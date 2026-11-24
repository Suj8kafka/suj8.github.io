import { createInteractionFrame } from './interaction-studies.js';

export function createFooterGraphics({ document, window }) {
  const box = document.querySelector('.footer-box');
  const elements = [...(box?.querySelectorAll?.('.footer-graphic') || [])];
  const surfaces = elements.map(element => {
    const canvas = element.querySelector('canvas');
    let context;
    try { context = canvas?.getContext('2d'); } catch { /* The static SVG remains visible. */ }
    return { element, canvas, context, face: element.parentElement, variant: element.dataset.studyVariant };
  });
  if (!surfaces.length || !surfaces.some(surface => surface.context)) return { setRunning() {}, destroy() {} };
  let width = 0, height = 0, dpr = 1, frame = 0, running = false, destroyed = false;
  let previous = null, lastPaint = -Infinity, elapsed = 0, faceAnimation;
  const sequence = [0, 1, 2, 3, 0, 4, 2, 5, 0];
  function paint(surface) {
    if (!surface.context || !width || !height) return;
    const ctx = surface.context;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const shape of createInteractionFrame({ variant: surface.variant, time: elapsed, width, height })) {
      ctx.beginPath();
      shape.points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      if (shape.closed) ctx.closePath();
      ctx.globalAlpha = shape.opacity;
      if (shape.fill) { ctx.fillStyle = shape.fill; ctx.fill(); }
      if (shape.stroke) { ctx.strokeStyle = shape.stroke; ctx.lineWidth = shape.lineWidth; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    surface.element.dataset.graphicReady = 'true';
  }
  function resize() {
    if (destroyed) return;
    width = box.clientWidth; height = box.clientHeight;
    if (!width || !height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    surfaces.forEach(surface => {
      if (!surface.context) return;
      surface.canvas.width = Math.round(width * dpr);
      surface.canvas.height = Math.round(height * dpr);
      paint(surface);
    });
  }
  function tick(now) {
    frame = 0;
    if (!running || destroyed) return;
    if (previous !== null) elapsed += Math.min((now - previous) / 1000, .05);
    previous = now;
    if (now - lastPaint >= 1000 / 30) {
      lastPaint = now;
      if (!faceAnimation) faceAnimation = surfaces[0].face.getAnimations?.()[0];
      const phase = ((faceAnimation?.currentTime ?? elapsed * 1000) % 32000 + 32000) % 32000;
      const step = Math.floor(phase / 4000);
      paint(surfaces[sequence[step]]);
      // Prepare the next study before its face begins to open.
      if (phase % 4000 >= 2300) paint(surfaces[sequence[step + 1]]);
    }
    frame = window.requestAnimationFrame(tick);
  }
  const observer = window.ResizeObserver ? new window.ResizeObserver(resize) : null;
  observer?.observe(box);
  if (!observer) window.addEventListener('resize', resize);
  resize();
  return {
    setRunning(value) {
      if (destroyed || running === value) return;
      running = value;
      previous = null; lastPaint = -Infinity;
      if (running) {
        faceAnimation = surfaces[0].face.getAnimations?.()[0];
        frame = window.requestAnimationFrame(tick);
      } else { window.cancelAnimationFrame(frame); frame = 0; }
    },
    destroy() {
      destroyed = true; running = false;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      surfaces.forEach(surface => {
        delete surface.element.dataset.graphicReady;
        if (surface.context) { surface.canvas.width = 0; surface.canvas.height = 0; }
      });
    }
  };
}
