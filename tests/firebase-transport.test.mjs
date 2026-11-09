import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../assets/js/${path}`, import.meta.url), 'utf8');

test('all database consumers use the shared WebSocket transport before connecting', async () => {
  const calls = [];
  const source = read('firebase-database.js');
  assert.match(source, /export \* from 'https:\/\/www\.gstatic\.com\/firebasejs\/13\.0\.0\/firebase-database\.js'/);
  const executable = source.replace(/^import .*;$/gm, '').replace(/^export .*;$/gm, '');
  vm.runInNewContext(executable, { forceWebSockets: () => calls.push('websocket') });
  assert.deepEqual(calls, ['websocket']);
  for (const file of ['firebase-presence.js', 'availability-client.js', 'admin.js']) {
    assert.match(read(file), /from ['"]\.\/firebase-database\.js['"]/);
    assert.doesNotMatch(read(file), /gstatic\.com.*firebase-database/);
  }
});
