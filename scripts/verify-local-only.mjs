import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, 'src');

const sourceFiles = [];
const collect = directory => {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path);
    else if (/\.(?:js|jsx)$/.test(entry)) sourceFiles.push(path);
  }
};
collect(sourceRoot);

const forbiddenNetworkApis = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
];

const violations = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbiddenNetworkApis) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}
assert.deepEqual(violations, [], `Network-capable APIs found:\n${violations.join('\n')}`);

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
assert.deepEqual(
  Object.keys(packageJson.dependencies || {}).sort(),
  ['lucide-react', 'react', 'react-dom'],
  'Unexpected runtime dependency added.',
);

const viteConfig = readFileSync(resolve(root, 'vite.config.js'), 'utf8');
assert.match(viteConfig, /"connect-src 'none'"/);
assert.doesNotMatch(viteConfig, /report-(?:uri|to)/);

console.log(`Verified ${sourceFiles.length} source files: no network APIs and no unexpected runtime dependencies.`);
