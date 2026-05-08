import { readFileSync, writeFileSync } from 'node:fs';

const log = (msg) => process.stdout.write(`  ${msg}\n`);
const fail = (msg) => {
  process.stderr.write(`  ❌  ${msg}\n`);
  process.exit(1);
};

log('');
log('📦 Preparing build...');
log('');

let pkg;
try {
  pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
} catch (e) {
  fail(`Cannot read package.json — ${e.message}`);
}

const appName = pkg.name;

writeFileSync('.app-name', appName);

log(`  ✅  App name  : ${appName}`);
log('');
