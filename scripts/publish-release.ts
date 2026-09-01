import { readFileSync, existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolveAppName } from './app-name';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const pkgPath = resolve(root, 'package.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const appName = resolveAppName();

console.log(`\n======================================================`);
console.log(`🚀 Preparing to publish ${appName} v${pkg.version}`);
console.log(`======================================================\n`);

// 1. Manual dotenv parsing
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

// 2. Validate GITHUB_DEPLOY_KEY
const token = process.env.GITHUB_DEPLOY_KEY;
if (!token) {
  console.error('❌ ERROR: GITHUB_DEPLOY_KEY not found in .env.');
  console.error('   Please add GITHUB_DEPLOY_KEY=<your_github_pat> to your .env file.');
  process.exit(1);
}

if (token.includes('github_pat_key') || token === 'ghp_or_github_pat_here') {
  console.error('❌ ERROR: The GITHUB_DEPLOY_KEY in .env is a placeholder.');
  console.error('   Please replace it with a real GitHub PAT (Personal Access Token) that has "Repo" scope.');
  process.exit(1);
}

// 3. Clean previous build artifacts
console.log('🧹 Cleaning previous build artifacts (dist/, release/)');
rmSync(resolve(root, 'dist'), { recursive: true, force: true });
rmSync(resolve(root, 'release'), { recursive: true, force: true });

// 4. Setup environment for electron-builder
process.env.GH_TOKEN = token;
process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= 'false'; // Skip code signing auto-discovery on unsigned builds

console.log('✅ Token loaded. Starting build and package process...\n');

// 5. Execute build & publish (productName from APP_NAME)
try {
  execSync(
    `npm run build && npx tsx scripts/run-electron-builder.ts --win --x64 --publish always`,
    {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
    },
  );
  console.log(`\n🎉 Successfully published v${pkg.version} to GitHub Releases!`);
  console.log(`   Don't forget to push your code and tags to the repository:`);
  console.log(`   git commit -am "chore: release v${pkg.version}"`);
  console.log(`   git tag v${pkg.version}`);
  console.log(`   git push && git push --tags\n`);
} catch {
  console.error('\n❌ Build or publish failed. Please check the logs above.');
  process.exit(1);
}
