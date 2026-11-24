export const interactionVariants = ['grid', 'bezier', 'morph', 'press', 'flow', 'ripple'];

const mix = (a, b, amount) => a + (b - a) * amount;
const circle = (x, y, radius, count = 32) => Array.from({ length: count }, (_, i) => {
  const angle = i / count * Math.PI * 2;
  return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
});
const curvePoint = (a, b, c, d, t) => {
  const u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y };
};
const roundedBox = (x, y, width, height, radius = 8) => {
  const points = [];
  for (let corner = 0; corner < 4; corner++) for (let step = 0; step <= 8; step++) {
    const angle = (-.5 + corner * .5 + step / 16) * Math.PI;
    const cx = x + (corner === 0 || corner === 1 ? width - radius : radius);
    const cy = y + (corner === 1 || corner === 2 ? height - radius : radius);
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
};

// Vector primitives are shared by the live canvas and the generated SVG fallback.
export function createInteractionFrame({ variant = 'grid', time = 0, width = 400, height = 178 } = {}) {
  const frame = [];
  const path = (points, { fill = null, stroke = null, lineWidth = 1, opacity = 1, closed = false } = {}) => frame.push({ points, fill, stroke, lineWidth, opacity, closed });
  const dot = (x, y, radius, fill = '#d4d4d4', opacity = 1) => path(circle(x, y, radius), { fill, opacity, closed: true });
  const line = (a, b, stroke = '#555555', opacity = 1) => path([a, b], { stroke, opacity });
  const outline = (points, stroke = '#d4d4d4', lineWidth = 1.5, opacity = 1) => path(points, { stroke, lineWidth, opacity, closed: true });
  const cx = width / 2, cy = height / 2;
  if (variant === 'grid') {
    const columns = 8, rows = 4, span = Math.min(width * .72, height * 1.6);
    const alignment = .5 - .5 * Math.cos(time * 1.6);
    const left = cx - span / 2, top = height * .23, gapY = height * .18;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const x = left + column * span / (columns - 1), y = top + row * gapY;
      const jitterX = Math.sin(column * 2.3 + row * 3.1) * height * .085;
      const jitterY = Math.cos(column * 3.7 - row * 1.9) * height * .065;
      dot(x + jitterX * (1 - alignment), y + jitterY * (1 - alignment), height * .014, '#d8d8d8', .55 + alignment * .45);
    }
    line({ x: left, y: height * .85 }, { x: left + span, y: height * .85 }, '#666666', .35);
    dot(left + span * alignment, height * .85, 2, '#ededed');
  } else if (variant === 'bezier') {
    const a = { x: width * .17, y: height * .7 }, d = { x: width * .83, y: height * .3 };
    const b = { x: width * .38, y: height * (.24 + .12 * Math.sin(time)) };
    const c = { x: width * .62, y: height * (.76 + .12 * Math.cos(time * .85)) };
    line(a, b, '#747474'); line(c, d, '#747474');
    const points = Array.from({ length: 61 }, (_, i) => curvePoint(a, b, c, d, i / 60));
    path(points, { stroke: '#e4e4e4', lineWidth: 2.4 });
    for (const p of [a, d]) path(roundedBox(p.x - 4, p.y - 4, 8, 8, 1), { fill: '#e0e0e0', closed: true });
    for (const p of [b, c]) { dot(p.x, p.y, 4.5, '#202020'); outline(circle(p.x, p.y, 4.5), '#dedede', 1.3); }
  } else if (variant === 'morph') {
    const radius = height * .29, exponent = 2 + 5 * (.5 + .5 * Math.sin(time * 1.4));
    const angle = Math.sin(time * .6) * .18;
    const points = Array.from({ length: 96 }, (_, i) => {
      const t = i / 96 * Math.PI * 2, a = Math.cos(t), b = Math.sin(t);
      const x = Math.sign(a) * Math.abs(a) ** (2 / exponent) * radius;
      const y = Math.sign(b) * Math.abs(b) ** (2 / exponent) * radius;
      return { x: cx + x * Math.cos(angle) - y * Math.sin(angle), y: cy + x * Math.sin(angle) + y * Math.cos(angle) };
    });
    outline(circle(cx, cy, radius + height * .065), '#575757', 1, .6);
    path(points, { fill: '#c7c7c7', closed: true });
    dot(cx, cy, 2, '#555555');
  } else if (variant === 'press') {
    const w = Math.min(width * .52, height * 1.25), h = height * .36;
    const impulse = Math.max(0, Math.sin(time * 1.9)) ** 8;
    const compression = impulse * height * .075;
    path(roundedBox(cx - w / 2, cy - h / 2 + 12, w, h, 10), { fill: '#080808', closed: true });
    path(roundedBox(cx - w / 2, cy - h / 2 + compression, w, h - compression * .35, 10), { fill: '#bdbdbd', closed: true });
    line({ x: cx - w * .3, y: cy + compression }, { x: cx + w * .3, y: cy + compression }, '#888888', .65);
    const touch = { x: cx + w * .24, y: cy - height * .19 + compression };
    dot(touch.x, touch.y, 4, '#f2f2f2');
    outline(circle(touch.x, touch.y, 6 + impulse * 13), '#eeeeee', 1.3, .8 - impulse * .6);
  } else if (variant === 'flow') {
    const nodes = [{ x: width * .16, y: cy }, { x: width * .38, y: cy }, { x: width * .62, y: height * .27 }, { x: width * .62, y: height * .73 }, { x: width * .84, y: cy }];
    const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];
    edges.forEach(([from, to], index) => {
      const a = nodes[from], d = nodes[to], middle = mix(a.x, d.x, .5);
      const b = { x: middle, y: a.y }, c = { x: middle, y: d.y };
      path(Array.from({ length: 31 }, (_, i) => curvePoint(a, b, c, d, i / 30)), { stroke: '#626262', lineWidth: 1.3 });
      const progress = ((time * .32 + index * .19) % 1 + 1) % 1;
      const p = curvePoint(a, b, c, d, progress);
      dot(p.x, p.y, 2.4, '#ececec');
    });
    nodes.forEach((p, index) => {
      path(roundedBox(p.x - 7, p.y - 7, 14, 14, index === 0 || index === 4 ? 7 : 3), { fill: '#191919', stroke: '#b0b0b0', lineWidth: 1.4, closed: true });
    });
  } else if (variant === 'ripple') {
    const x = cx + Math.sin(time * .55) * width * .19, y = cy + Math.cos(time * .7) * height * .1;
    for (let i = 4; i >= 0; i--) {
      const progress = ((time * .33 + i / 5) % 1 + 1) % 1;
      outline(circle(x, y, height * (.035 + progress * .3), 64), '#dddddd', 1.25, .8 * (1 - progress) ** 1.6);
    }
    dot(x, y, 3.5, '#eeeeee');
  }
  return frame;
}
