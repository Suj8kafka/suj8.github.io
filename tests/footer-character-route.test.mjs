import test from 'node:test';
import assert from 'node:assert/strict';
import { findFooterStop, planFooterRoute } from '../assets/js/footer-character-route.js';

test('routes use a direct path in clear space and go around protected controls', () => {
  const args = { from: { x: 50, y: 150 }, to: { x: 450, y: 150 }, width: 500, height: 300, radius: 20 };
  assert.equal(planFooterRoute({ ...args, obstacles: [] }).length, 2);
  const obstacle = { left: 200, right: 300, top: 90, bottom: 210 };
  const route = planFooterRoute({ ...args, obstacles: [obstacle] });
  assert.ok(route.length > 2);
  assert.deepEqual(route[0], args.from);
  assert.deepEqual(route.at(-1), args.to);
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1], b = route[index];
    for (let step = 0; step <= 100; step++) {
      const x = a.x + (b.x - a.x) * step / 100, y = a.y + (b.y - a.y) * step / 100;
      assert.ok(x >= 20 && x <= 480 && y >= 20 && y <= 280);
      assert.ok(x < obstacle.left - 20 || x > obstacle.right + 20 || y < obstacle.top - 20 || y > obstacle.bottom + 20);
    }
  }
});

test('unreachable or obstructed endpoints return no route instead of crossing controls', () => {
  const args = { from: { x: 50, y: 150 }, to: { x: 450, y: 150 }, width: 500, height: 300 };
  assert.deepEqual(planFooterRoute({ ...args, obstacles: [{ left: 200, right: 300, top: 0, bottom: 300 }] }), []);
  assert.deepEqual(planFooterRoute({ ...args, obstacles: [{ left: 0, right: 80, top: 0, bottom: 300 }] }), []);
});

test('standing stops fit within the footer and leave occupied content clear', () => {
  const obstacles = [{ left: 100, right: 330, top: 20, bottom: 200 }, { left: 400, right: 580, top: 260, bottom: 390 }];
  const stop = findFooterStop({ target: { x: 300, y: 140 }, width: 600, height: 400, obstacles });
  assert.ok(stop);
  const body = { left: stop.x - stop.size / 4 - 6, right: stop.x + stop.size / 4 + 6, top: stop.y - stop.size - 6, bottom: stop.y + 6 };
  assert.ok(body.left >= 0 && body.right <= 600 && body.top >= 0 && body.bottom <= 400);
  for (const rect of obstacles) assert.ok(body.right <= rect.left || body.left >= rect.right || body.bottom <= rect.top || body.top >= rect.bottom);
  assert.equal(findFooterStop({ target: { x: 200, y: 100 }, width: 400, height: 200, obstacles: [{ left: 0, right: 400, top: 0, bottom: 200 }] }), null);
});

test('nearby landmarks prefer separate standing stops when space permits', () => {
  const args = { target: { x: 400, y: 350 }, width: 700, height: 500, obstacles: [] };
  const first = findFooterStop(args);
  const next = findFooterStop({ ...args, occupied: [first] });
  assert.ok(Math.hypot(next.x - first.x, next.y - first.y) >= 40);
});

test('the bottom standing row can use the safe space beside footer navigation and credits', () => {
  const stop = findFooterStop({ target: { x: 200, y: 350 }, width: 600, height: 400, obstacles: [
    { left: 0, right: 600, top: 0, bottom: 270 },
    { left: 0, right: 120, top: 270, bottom: 400 },
    { left: 400, right: 600, top: 270, bottom: 400 }
  ] });
  assert.ok(stop);
  assert.equal(stop.y, 378);
  assert.ok(stop.y - stop.size - 6 >= 270);
});
