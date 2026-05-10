import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fail, log } from './logger.mjs';

log('');
log('🔍 Reading base href from built index.html...');
log('');

const appName = readFileSync('./.app-name', 'utf8');
const indexPath = resolve(`./dist/${appName}/browser/index.html`);

let html;
try {
  html = readFileSync(indexPath, 'utf8');
} catch (e) {
  fail(`index.html not found at ${indexPath} — ${e.message}`);
}

const match = html.match(/<base href="([^"]+)"/);
if (!match) fail('No <base href="..."> found in index.html');

const baseHref = match[1];
writeFileSync('.base-href', baseHref);

log(`  ✅  Base href resolved : ${baseHref}`);
log('');
