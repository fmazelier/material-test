#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline/promises';

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });
const execOut = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

// ─── Lecture du package.json ───────────────────────────────────────
const pkgPath = new URL('../package.json', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const currentVersion = pkg.version.replace('-snapshot', '');
const [major, minor, patch] = currentVersion.split('.').map(Number);

// ─── Choix du type de bump ─────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(`\n📦 Version actuelle : ${pkg.version}`);
console.log(`\nType de release :`);
console.log(`  1) patch  → ${major}.${minor}.${patch + 1}`);
console.log(`  2) minor  → ${major}.${minor + 1}.0`);
console.log(`  3) major  → ${major + 1}.0.0`);

const choice = await rl.question('\nChoix [1/2/3] : ');
rl.close();

let newVersion;
switch (choice.trim()) {
  case '1':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
  case '2':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case '3':
    newVersion = `${major + 1}.0.0`;
    break;
  default:
    console.error('❌ Choix invalide.');
    process.exit(1);
}

const snapshotVersion = `${newVersion}-snapshot`;
const tagName = `v${newVersion}`;

// ─── Vérification : branche et working tree propre ────────────────
const branch = execOut('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main' && branch !== 'master') {
  console.error(`❌ Tu dois être sur main/master (branche actuelle : ${branch})`);
  process.exit(1);
}

const status = execOut('git status --porcelain');
if (status) {
  console.error('❌ Working tree non propre. Commit ou stash tes changements.');
  process.exit(1);
}

// ─── Vérification : tag inexistant ────────────────────────────────
const existingTags = execOut('git tag');
if (existingTags.split('\n').includes(tagName)) {
  console.error(`❌ Le tag ${tagName} existe déjà.`);
  process.exit(1);
}

console.log(`\n🚀 Release ${newVersion} en cours...\n`);

// ─── 1. Tag git avec la version propre (sans -snapshot) ───────────
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

exec('git add package.json');
exec(`git commit -m "chore(release): ${tagName}"`);
exec(`git tag -a ${tagName} -m "Release ${tagName}"`);

console.log(`✅ Tag ${tagName} créé`);

// ─── 2. Bump vers -snapshot pour la suite du dev ──────────────────
pkg.version = snapshotVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

exec('git add package.json');
exec(`git commit -m "chore: bump version to ${snapshotVersion}"`);

console.log(`✅ Version bumped à ${snapshotVersion}`);

// ─── 3. Push commits + tag ────────────────────────────────────────
// exec('git push');
// exec('git push --tags');

console.log(`\n✨ Release ${tagName} publiée avec succès !`);
console.log(`   → Tag : ${tagName}`);
console.log(`   → Version courante : ${snapshotVersion}\n`);
