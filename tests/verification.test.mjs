import test from 'node:test';
import assert from 'node:assert/strict';
import { runVerification } from '../scripts/verify-project.mjs';

const steps = ['Regression tests', 'Generated files', 'Whitespace'].map(name => ({ name, command: 'check', args: [name] }));

test('a failed check is reported and cannot hide later verification results', () => {
  const calls = [], messages = [];
  const result = runVerification(steps, {
    run(command, args, options) {
      calls.push(args[0]);
      assert.equal(options.shell, false);
      return { status: args[0] === 'Generated files' ? 1 : 0 };
    },
    log: message => messages.push(message)
  });
  assert.deepEqual(calls, steps.map(step => step.name));
  assert.equal(result.passed, false);
  assert.deepEqual(result.failed, ['Generated files']);
  assert.match(messages.at(-1), /failed: Generated files/);
});

test('missing tools, terminated checks and thrown errors fail verification', () => {
  for (const outcome of [{ error: new Error('ENOENT'), status: null }, { signal: 'SIGTERM', status: null }, new Error('Cannot launch')]) {
    const result = runVerification([steps[0]], {
      run() { if (outcome instanceof Error) throw outcome; return outcome; }, log() {}
    });
    assert.equal(result.passed, false);
    assert.deepEqual(result.failed, [steps[0].name]);
  }
});

test('verification requires successful checks and cannot pass an empty plan', () => {
  assert.equal(runVerification(steps, { run: () => ({ status: 0 }), log() {} }).passed, true);
  assert.equal(runVerification([], { log() {} }).passed, false);
});
