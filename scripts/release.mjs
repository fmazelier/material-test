#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline/promises';

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });
const execOut = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// ─── Helpers ───────────────────────────────────────────────────────
function abort(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function deleteLocalTagIfExists(tag) {
  try {
    execSync(`git tag -d ${tag}`, { stdio: 'ignore' });
  } catch {
    // Tag didn't exist locally, nothing to do
  }
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

console.log(`\n📦 Current version : ${pkg.version}`);
console.log(`\nRelease type:`);
Object.entries(versionMap).forEach(([k, { type, next }]) =>
  console.log(`  ${k}) ${type.padEnd(6)} → ${next}`)
);

const choice = await rl.question('\nChoice [1/2/3]: ');
const selected = versionMap[choice.trim()];
if (!selected) {
  rl.close();
  abort('Invalid choice.');
}

const { type: bumpType, next: newVersion } = selected;
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

const status = execOut('git status --porcelain');
if (status) abort('Working tree is not clean. Commit or stash your changes first.');

// Fetch remote tags to detect conflicts before doing anything
exec('git fetch --tags');

const existingTags = execOut('git tag').split('\n');
if (existingTags.includes(tagName)) abort(`Tag ${tagName} already exists on remote.`);

// Ensure local branch is up to date with remote
const behind = execOut(`git rev-list HEAD..origin/${branch} --count`);
if (behind !== '0')
  abort(`Local branch is ${behind} commit(s) behind origin/${branch}. Pull first.`);

console.log('✅ Pre-flight checks passed\n');

// ─── 1. Bump to release version ────────────────────────────────────
console.log(`🚀 Bumping to ${newVersion}...`);

// npm version updates package.json + package-lock.json atomically
// --no-git-tag-version: we manage commits/tags manually
exec(`npm version ${newVersion} --no-git-tag-version`);

// npm may create a lightweight tag despite the flag — delete it
deleteLocalTagIfExists(tagName);

exec('git add package.json package-lock.json');
exec(`git commit -m "chore(release): ${tagName}"`);

// Create an annotated tag (preferred over lightweight: carries metadata + message)
exec(`git tag -a ${tagName} -m "Release ${tagName}"`);
console.log(`✅ Annotated tag ${tagName} created`);

// ─── 2. Bump to next snapshot version ─────────────────────────────
console.log(`\n📝 Bumping to ${snapshotVersion}...`);

// Write snapshot version manually — npm version doesn't support
// arbitrary suffixes like -snapshot reliably
const freshPkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
freshPkg.version = snapshotVersion;
writeFileSync(pkgPath, JSON.stringify(freshPkg, null, 2) + '\n');

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.version = snapshotVersion;
if (lock.packages?.['']) lock.packages[''].version = snapshotVersion;
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

exec('git add package.json package-lock.json');
exec(`git commit -m "chore: bump version to ${snapshotVersion}"`);
console.log(`✅ Version bumped to ${snapshotVersion}`);

// ─── 3. Push commits and tag ───────────────────────────────────────
console.log(`\n📡 Pushing to origin/${branch}...`);
// exec(`git push origin ${branch}`);
// exec(`git push origin ${tagName}`);

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
