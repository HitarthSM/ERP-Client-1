import { spawnSync } from 'child_process';
import { resolveAppName } from './app-name';

const appName = resolveAppName();
const passthrough = process.argv.slice(2);

const result = spawnSync(
  'npx',
  ['electron-builder', ...passthrough, `--config.productName=${appName}`],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

process.exit(result.status ?? 1);
