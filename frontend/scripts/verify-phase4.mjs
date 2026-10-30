import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'output/phase4/evidence');
mkdirSync(output, { recursive: true });
const tasks = [
  ['tests', 'node_modules/vitest/vitest.mjs', ['run', '--reporter=default', '--reporter=json', '--outputFile=output/phase4/evidence/test-results.json']],
  ['lint', 'node_modules/oxlint/bin/oxlint', ['--deny-warnings']],
  ['build', 'node_modules/vite/bin/vite.js', ['build']],
];
const checks = tasks.map(([name, executable, args]) => {
  const start = performance.now();
  const result = spawnSync(process.execPath, [resolve(root, executable), ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180000 });
  // eslint-disable-next-line no-control-regex -- Strip terminal ANSI colours from evidence logs.
  const log = ((result.stdout || '') + (result.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '');
  writeFileSync(resolve(output, name + '.log'), log);
  const check = { name, status: result.status === 0 ? 'pass' : 'fail', durationMs: Math.round(performance.now() - start), exitCode: result.status, error: result.error?.message };
  console.log(name + ': ' + check.status + ' (' + check.durationMs + ' ms)');
  return check;
});
let tests;
try { const result = JSON.parse(readFileSync(resolve(output, 'test-results.json'), 'utf8')); tests = { total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests }; } catch {}
const summary = { checkedAt: new Date().toISOString(), nodeVersion: process.version, platform: process.platform, checks, tests, scope: 'Automated local checks. Service tests use mocks. Live authenticated database CRUD, storage, browser interaction and account isolation require separate verification.' };
writeFileSync(resolve(output, 'verification.json'), JSON.stringify(summary, null, 2));
if (checks.some(check => check.status !== 'pass')) process.exitCode = 1;
