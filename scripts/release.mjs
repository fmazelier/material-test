#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline/promises';

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });
const execOut = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

function abort(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function deleteLocalTagIfExists(tag) {
  try {
    execSync(`git tag -d ${tag}`, { stdio: 'ignore' });
    log('🗑️ ', `Local tag ${tag} removed (was created by npm)`);
  } catch {
    // Tag didn't exist locally, nothing to do
  }
}

function updateConfigJson(version, deployedAt) {
  const configPath = new URL('../public/config.json', import.meta.url).pathname;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  config.version = version;
  config.deployedAt = deployedAt;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return configPath;
}

// ─── Read current version ──────────────────────────────────────────
const pkgPath = new URL('../package.json', import.meta.url).pathname;
const lockPath = new URL('../package-lock.json', import.meta.url).pathname;

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version.replace('-snapshot', '');
const [mj, mn, pt] = currentVersion.split('.').map(Number);

const versionMap = {
  1: { type: 'patch', next: `${mj}.${mn}.${pt + 1}` },
  2: { type: 'minor', next: `${mj}.${mn + 1}.0` },
  3: { type: 'major', next: `${mj + 1}.0.0` },
};

// ─── Interactive prompts ───────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`
╔════════════════════════════════════════╗
║           🚢 Release Tool              ║
╚════════════════════════════════════════╝`);

log('📦', `Current version : ${pkg.version}\n`);
console.log('Release type:');
Object.entries(versionMap).forEach(([k, { type, next }]) =>
  console.log(`  ${k}) ${type.padEnd(6)} → ${next}`)
);

const choice = await rl.question('\nChoice [1/2/3]: ');
const selected = versionMap[choice.trim()];
if (!selected) {
  rl.close();
  abort('Invalid choice.');
}

const { next: newVersion } = selected;
const tagName = `v${newVersion}`;
const snapshotVersion = `${newVersion}-snapshot`;

const confirm = await rl.question(
  `\nRelease ${tagName}? This will create a tag and push to origin. [y/N]: `
);
rl.close();

if (confirm.trim().toLowerCase() !== 'y') {
  console.log('\nAborted.\n');
  process.exit(0);
}

// ─── Pre-flight checks ─────────────────────────────────────────────
console.log('\n🔍 Running pre-flight checks...');

const branch = execOut('git rev-parse --abbrev-ref HEAD');
if (!['main', 'master'].includes(branch))
  abort(`Must be on main/master (current branch: ${branch})`);
log('✅', `Branch : ${branch}`);

const status = execOut('git status --porcelain');
if (status) abort('Working tree is not clean. Commit or stash your changes first.');
log('✅', 'Working tree is clean');

exec('git fetch --tags');
log('✅', 'Remote tags fetched');

const existingTags = execOut('git tag').split('\n');
if (existingTags.includes(tagName)) abort(`Tag ${tagName} already exists on remote.`);
log('✅', `Tag ${tagName} is available`);

const behind = execOut(`git rev-list HEAD..origin/${branch} --count`);
if (behind !== '0')
  abort(`Local branch is ${behind} commit(s) behind origin/${branch}. Pull first.`);
log('✅', 'Branch is up to date with remote');

console.log('\n✅ Pre-flight checks passed\n');

// ─── 1. Bump package.json + package-lock.json to release version ───
console.log('─'.repeat(44));
log('🔖', `Step 1/3 — Bump to release version ${newVersion}`);
console.log('─'.repeat(44));

exec(`npm version ${newVersion} --no-git-tag-version`);
log('📄', 'package.json + package-lock.json updated');

// npm may create a lightweight tag despite --no-git-tag-version
deleteLocalTagIfExists(tagName);

// Inject release version + null deployedAt into config.json
updateConfigJson(newVersion, null);
log('⚙️ ', `config.json → version: "${newVersion}", deployedAt: null`);

exec('git add package.json package-lock.json public/config.json');
exec(`git commit -m "chore(release): ${tagName}"`);
log('💾', `Commit created: chore(release): ${tagName}`);

exec(`git tag -a ${tagName} -m "Release ${tagName}"`);
log('🏷️ ', `Annotated tag ${tagName} created`);

// ─── 2. Bump to next snapshot version ─────────────────────────────
console.log('\n' + '─'.repeat(44));
log('📝', `Step 2/3 — Bump to ${snapshotVersion}`);
console.log('─'.repeat(44));

const freshPkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
freshPkg.version = snapshotVersion;
writeFileSync(pkgPath, JSON.stringify(freshPkg, null, 2) + '\n');
log('📄', `package.json → ${snapshotVersion}`);

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.version = snapshotVersion;
if (lock.packages?.['']) lock.packages[''].version = snapshotVersion;
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
log('📄', `package-lock.json → ${snapshotVersion}`);

// Inject snapshot version + null deployedAt into config.json
updateConfigJson(snapshotVersion, null);
log('⚙️ ', `config.json → version: "${snapshotVersion}", deployedAt: null`);

exec('git add package.json package-lock.json public/config.json');
exec(`git commit -m "chore: bump version to ${snapshotVersion}"`);
log('💾', `Commit created: chore: bump version to ${snapshotVersion}`);

// ─── 3. Push commits and tag ───────────────────────────────────────
console.log('\n' + '─'.repeat(44));
log('📡', `Step 3/3 — Push to origin/${branch}`);
console.log('─'.repeat(44));

exec(`git push origin ${branch}`);
log('✅', `Branch ${branch} pushed`);

exec(`git push origin ${tagName}`);
log('✅', `Tag ${tagName} pushed`);

// ─── Summary ───────────────────────────────────────────────────────
console.log(`
╔════════════════════════════════════════╗
║        ✨ Release successful!          ║
╠════════════════════════════════════════╣
║  Tag     : ${tagName.padEnd(28)}║
║  Branch  : ${branch.padEnd(28)}║
║  Next    : ${snapshotVersion.padEnd(28)}║
╚════════════════════════════════════════╝
`);
