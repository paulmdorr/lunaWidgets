import { readFileSync, writeFileSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bumpArg = args.find(arg => !arg.startsWith('--'));

if (!bumpArg) {
  console.error('Usage: bun scripts/bump-version.js <patch|minor|major|x.y.z> [--dry-run]');
  process.exit(1);
}

const currentVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (bumpArg === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (bumpArg === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpArg === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (/^\d+\.\d+\.\d+$/.test(bumpArg)) {
  newVersion = bumpArg;
} else {
  console.error(`Invalid argument: "${bumpArg}". Use patch, minor, major, or a version like 1.2.3`);
  process.exit(1);
}

if (dryRun) console.log('Dry run — no files will be changed.\n');

function write(path, content) {
  if (dryRun) return;
  writeFileSync(path, content);
}

// package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
packageJson.version = newVersion;
write('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log(`package.json:       ${currentVersion} -> ${newVersion}`);

// tauri.conf.json
const tauriConf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
tauriConf.version = newVersion;
write('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`tauri.conf.json:    ${currentVersion} -> ${newVersion}`);

// Cargo.toml
const cargoContent = readFileSync('src-tauri/Cargo.toml', 'utf8');
const updatedCargo = cargoContent.replace(/^version = "[\d.]+"$/m, `version = "${newVersion}"`);
write('src-tauri/Cargo.toml', updatedCargo);
console.log(`Cargo.toml:         ${currentVersion} -> ${newVersion}`);

// CHANGELOG.md
const today = new Date().toISOString().split('T')[0];
const newEntry = `## [v${newVersion}] - ${today}\n\n### Added\n\n-\n\n### Changed\n\n-\n\n### Fixed\n\n-\n`;

let changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '# Changelog\n';
const insertAt = changelog.indexOf('\n## ');
const updatedChangelog =
  insertAt === -1
    ? changelog.trimEnd() + '\n\n' + newEntry
    : changelog.slice(0, insertAt) + '\n\n' + newEntry + '\n' + changelog.slice(insertAt + 1);

write('CHANGELOG.md', updatedChangelog);
console.log(`CHANGELOG.md:       added entry for v${newVersion}`);

console.log(`
${dryRun ? '(dry run) ' : ''}Fill in CHANGELOG.md, then run:

  git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
  git commit -m "bump version to ${newVersion}"
  git tag v${newVersion}
  git push && git push --tags
`);
