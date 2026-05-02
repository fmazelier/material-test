#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline/promises';

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });
const execOut = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// ─── Read current version ──────────────────────────────────────────
const pkgPath = new URL('../package.json', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const currentVersion = pkg.version.replace('-snapshot', '');
const [major, minor, patch] = currentVersion.split('.').map(Number);

// ─── Select bump type ──────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`\n📦 Current version: ${pkg.version}`);
console.log(`\nRelease type:`);
console.log(`  1) patch  → ${major}.${minor}.${patch + 1}`);
console.log(`  2) minor  → ${major}.${minor + 1}.0`);
console.log(`  3) major  → ${major + 1}.0.0`);

const choice = await rl.question('\nChoice [1/2/3]: ');

let bumpType;
switch (choice.trim()) {
  case '1':
    bumpType = 'patch';
    break;
  case '2':
    bumpType = 'minor';
    break;
  case '3':
    bumpType = 'major';
    break;
  default:
    console.error('❌ Invalid choice.');
    rl.close();
    process.exit(1);
}

// ─── Confirmation ──────────────────────────────────────────────────
const newVersion = execOut(`npm version ${bumpType} --dry-run 2>&1 || true`).replace('v', '');

// npm version dry-run isn't reliable across all versions, compute manually
const [mj, mn, pt] = currentVersion.split('.').map(Number);
const computed =
  bumpType === 'patch'
    ? `${mj}.${mn}.${pt + 1}`
    : bumpType === 'minor'
      ? `${mj}.${mn + 1}.0`
      : `${mj + 1}.0.0`;

const confirm = await rl.question(
  `\nRelease v${computed}? This will push commits and a tag. [y/N]: `
);
rl.close();

if (confirm.trim().toLowerCase() !== 'y') {
  console.log('Aborted.');
  process.exit(0);
}

const tagName = `v${computed}`;
const snapshotVersion = `${computed}-snapshot`;

// ─── Guards ────────────────────────────────────────────────────────
const branch = execOut('git rev-parse --abbrev-ref HEAD');
if (!['main', 'master'].includes(branch)) {
  console.error(`❌ Must be on main/master (current branch: ${branch})`);
  process.exit(1);
}

const status = execOut('git status --porcelain');
if (status) {
  console.error('❌ Working tree is not clean. Commit or stash your changes first.');
  process.exit(1);
}

const existingTags = execOut('git tag').split('\n');
if (existingTags.includes(tagName)) {
  console.error(`❌ Tag ${tagName} already exists.`);
  process.exit(1);
}

console.log(`\n🚀 Releasing ${tagName}...\n`);

// ─── 1. Bump to release version ────────────────────────────────────
// npm version updates both package.json and package-lock.json atomically
// --no-git-tag-version: we handle the commit/tag manually for full control
exec(`npm version ${computed} --no-git-tag-version`);

exec('git add package.json package-lock.json');
exec(`git commit -m "chore(release): ${tagName}"`);
exec(`git tag -a ${tagName} -m "Release ${tagName}"`);

console.log(`✅ Tag ${tagName} created`);

// ─── 2. Bump to next snapshot version ─────────────────────────────
// Manually write snapshot version — npm version doesn't support pre-release
// suffixes like -snapshot natively without --preid flags
const updatedPkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
updatedPkg.version = snapshotVersion;
writeFileSync(pkgPath, JSON.stringify(updatedPkg, null, 2) + '\n');

// Update package-lock.json version field as well
const lockPath = new URL('../package-lock.json', import.meta.url).pathname;
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.version = snapshotVersion;
if (lock.packages?.['']) lock.packages[''].version = snapshotVersion;
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

exec('git add package.json package-lock.json');
exec(`git commit -m "chore: bump version to ${snapshotVersion}"`);

console.log(`✅ Version bumped to ${snapshotVersion}`);

// ─── 3. Push commits and tag ───────────────────────────────────────
exec('git push');
exec('git push --tags');

console.log(`\n✨ Successfully released ${tagName}!`);
console.log(`   → Tag    : ${tagName}`);
console.log(`   → Next   : ${snapshotVersion}\n`);
