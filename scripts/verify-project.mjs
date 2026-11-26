import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function verificationSteps({ root = projectRoot, esbuildModule = resolve(root, '.tmp/performance-tools/node_modules/esbuild') } = {}) {
  const node = (name, args) => ({ name, command: process.execPath, args });
  const tests = readdirSync(resolve(root, 'tests')).filter(name => name.endsWith('.test.mjs')).sort();
  if (!tests.length) throw new Error('No test files found; verification cannot pass without tests.');
  return [
    node('Node regression tests', ['--test', ...tests.map(name => `tests/${name}`)]),
    node('Welcome and startup CSP', ['scripts/sync-welcome.mjs', '--check']),
    node('Critical and embedded styles', ['scripts/build-critical-styles.mjs', '--check']),
    node('Public media versions', ['scripts/version-public-media.mjs', '--check']),
    node('Footer fallback artwork', ['scripts/build-footer-graphics.mjs', '--check']),
    node('Bundles, stylesheet and cache versions', ['scripts/build-performance-assets.mjs', '--esbuild-module', esbuildModule, '--check']),
    { name: 'Working-tree whitespace', command: 'git', args: ['-c', 'core.safecrlf=false', 'diff', '--check'] },
    { name: 'Staged whitespace', command: 'git', args: ['-c', 'core.safecrlf=false', 'diff', '--cached', '--check'] }
  ];
}

export function runVerification(steps, { cwd = projectRoot, run = spawnSync, log = console.log } = {}) {
  const failed = [];
  for (const step of steps) {
    log(`\nChecking: ${step.name}`);
    try {
      const result = run(step.command, step.args, { cwd, stdio: 'inherit', shell: false, windowsHide: true, timeout: 120000 });
      if (result.error || result.status !== 0 || result.signal) {
        failed.push(step.name);
        log(`FAILED: ${step.name}${result.error ? ` (${result.error.message})` : result.signal ? ` (${result.signal})` : ` (exit ${result.status})`}`);
      }
    } catch (error) {
      failed.push(step.name);
      log(`FAILED: ${step.name} (${error.message})`);
    }
  }
  const passed = steps.length > 0 && failed.length === 0;
  log(passed ? '\nProject verification passed. Browser and live-service checks remain separate.'
    : `\nProject verification failed: ${failed.length ? failed.join(', ') : 'no checks were run'}.`);
  return { passed, failed };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/verify-project.mjs [--esbuild-module <path>]\nRuns tests and read-only generated-asset checks. Does not install, regenerate or publish.');
  } else if (args.length && (args.length !== 2 || args[0] !== '--esbuild-module')) {
    console.error('Unknown or incomplete option. Use --help.');
    process.exitCode = 1;
  } else {
    const esbuildModule = resolve(args[1] || resolve(projectRoot, '.tmp/performance-tools/node_modules/esbuild'));
    if (!existsSync(esbuildModule)) {
      console.error(`Missing esbuild tooling: ${esbuildModule}. See docs/development.md for esbuild 0.28.2 setup. Bundle verification will fail; it is not skipped.`);
    }
    process.exitCode = runVerification(verificationSteps({ esbuildModule })).passed ? 0 : 1;
  }
}
