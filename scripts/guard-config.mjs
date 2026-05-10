import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { fail, log } from './logger.mjs';

log('');
log('🛡️  Checking config.json...');
log('');

const configPath = 'public/config.json';

if (!existsSync(configPath)) fail(`config.json not found at ${configPath}`);

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (e) {
  fail(`Invalid JSON in config.json — ${e.message}`);
}

config.deployedAt = null;
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

log(`  ✅  config.json ready`);
log('');
