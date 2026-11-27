const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const inside = (point, rect) => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

function intersects(from, to, rect) {
  let enter = 0, leave = 1;
  for (const [axis, min, max] of [['x', 'left', 'right'], ['y', 'top', 'bottom']]) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < .001) {
      if (from[axis] < rect[min] || from[axis] > rect[max]) return false;
    } else {
      const first = (rect[min] - from[axis]) / delta, last = (rect[max] - from[axis]) / delta;
      enter = Math.max(enter, Math.min(first, last));
      leave = Math.min(leave, Math.max(first, last));
      if (enter > leave) return false;
    }
  }
  return true;
}

// Expanded rectangles protect the overhead figure's footprint, including corners.
export function planFooterRoute({ from, to, width, height, obstacles, radius = 22 }) {
  const blocks = obstacles.map(rect => ({ left: rect.left - radius, right: rect.right + radius, top: rect.top - radius, bottom: rect.bottom + radius }));
  const clear = point => point.x >= radius && point.x <= width - radius && point.y >= radius && point.y <= height - radius && !blocks.some(rect => inside(point, rect));
  const visible = (a, b) => !blocks.some(rect => intersects(a, b, rect));
  if (!clear(from) || !clear(to)) return [];
  if (visible(from, to)) return [from, to];
  const nodes = [from, to];
  for (const rect of blocks) for (const x of [rect.left - 1, rect.right + 1]) for (const y of [rect.top - 1, rect.bottom + 1]) {
    const point = { x, y };
    if (clear(point)) nodes.push(point);
  }
  const costs = nodes.map(() => Infinity), parents = nodes.map(() => -1), done = new Set();
  costs[0] = 0;
  while (done.size < nodes.length) {
    let nearest = -1;
    for (let index = 0; index < nodes.length; index++) if (!done.has(index) && (nearest === -1 || costs[index] < costs[nearest])) nearest = index;
    if (nearest === -1 || !Number.isFinite(costs[nearest])) break;
    if (nearest === 1) {
      const path = [];
      for (let cursor = 1; cursor !== -1; cursor = parents[cursor]) path.unshift(nodes[cursor]);
      return path;
    }
    done.add(nearest);
    for (let next = 0; next < nodes.length; next++) {
      if (done.has(next) || !visible(nodes[nearest], nodes[next])) continue;
      const cost = costs[nearest] + distance(nodes[nearest], nodes[next]);
      if (cost < costs[next]) { costs[next] = cost; parents[next] = nearest; }
    }
  }
  return [];
}

// Pick a standing space near a target without covering text, artwork or links.
export function findFooterStop({ target, width, height, obstacles, preferredHeight = 136, occupied = [] }) {
  let best = null, bestScore = Infinity;
  const spread = Math.max(96, Math.min(180, width * .14, height * .26));
  for (const size of [preferredHeight, 112, 96, 80, 72]) {
    const rows = [];
    for (let y = size + 8; y <= height - 22; y += 12) rows.push(y);
    rows.push(height - 22);
    for (let x = 32; x <= width - 32; x += 20) for (const y of rows) {
      const body = { left: x - size / 4 - 6, right: x + size / 4 + 6, top: y - size - 6, bottom: y + 6 };
      if (body.left < 0 || body.right > width) continue;
      if (obstacles.some(rect => body.left < rect.right && body.right > rect.left && body.top < rect.bottom && body.bottom > rect.top)) continue;
      if (obstacles.some(rect => x > rect.left - 22 && x < rect.right + 22 && y > rect.top - 22 && y < rect.bottom + 22)) continue;
      const separation = occupied.length ? Math.min(...occupied.map(point => distance({ x, y }, point))) : spread;
      const score = distance({ x, y: y - size / 2 }, target) + (preferredHeight - size) * 1.25 + Math.max(0, spread - separation) * 3;
      if (score < bestScore) { best = { x, y, size }; bestScore = score; }
    }
  }
  return best;
}

// Place a standing character's bubble in nearby free space using cached scene
// geometry. Nothing here measures the DOM or runs on walking frames.
export function placeFooterBubble({ anchor, width, height, bubbleWidth, bubbleHeight, obstacles = [] }) {
  const gap = 6, inset = 8;
  if (bubbleWidth > width - inset * 2 || bubbleHeight > height - inset * 2) return null;
  // The atlas cell includes transparent space on both sides of the figure.
  const body = { left: anchor.x - anchor.size * .12, right: anchor.x + anchor.size * .12, top: anchor.y - anchor.size, bottom: anchor.y };
  const head = { x: anchor.x, y: body.top + anchor.size * .13 };
  const blocks = [...obstacles, body];
  const xs = [head.x - bubbleWidth / 2, body.left - bubbleWidth - gap, body.right + gap,
    head.x - bubbleWidth + 16, head.x - 16];
  const ys = [body.top - bubbleHeight - gap, head.y - 16, head.y - bubbleHeight / 2, head.y - bubbleHeight + 16];
  let best = null, score = Infinity;
  for (const x of xs) for (const y of ys) {
    const left = Math.max(inset, Math.min(width - bubbleWidth - inset, x));
    const top = Math.max(inset, Math.min(height - bubbleHeight - inset, y));
    const rect = { left, top, right: left + bubbleWidth, bottom: top + bubbleHeight };
    if (blocks.some(block => rect.left < block.right + 4 && rect.right > block.left - 4 && rect.top < block.bottom + 4 && rect.bottom > block.top - 4)) continue;
    const side = rect.right <= body.left ? 'left' : rect.left >= body.right ? 'right' : rect.bottom <= body.top ? 'above' : null;
    if (!side) continue;
    // A tail must reach toward the head. Never move a bubble into remote free
    // space just because the area beside the figure is occupied.
    const tail = side === 'above' ? head.x - left : head.y - top;
    const length = side === 'above' ? bubbleWidth : bubbleHeight;
    if (tail < 12 || tail > length - 12) continue;
    const nearest = { x: Math.max(rect.left, Math.min(rect.right, head.x)), y: Math.max(rect.top, Math.min(rect.bottom, head.y)) };
    const separation = distance(nearest, head);
    if (separation > Math.max(28, anchor.size * .14 + gap)) continue;
    const candidate = separation + distance({ x: left + bubbleWidth / 2, y: top + bubbleHeight / 2 }, head) * .1;
    if (candidate < score) {
      score = candidate;
      best = { left, top, side, tail };
    }
  }
  return best;
}
