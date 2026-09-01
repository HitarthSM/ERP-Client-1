import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const DEFAULT_APP_NAME = 'Pramukh Digital';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Load root `.env` into process.env when keys are missing. */
export function loadRootEnv(): void {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) return;
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

/**
 * Single display name for UI + Electron + installer.
 * Prefer `APP_NAME` (root `.env`); optional `VITE_APP_NAME` override.
 */
export function resolveAppName(): string {
  loadRootEnv();
  return (
    process.env.APP_NAME?.trim() ||
    process.env.VITE_APP_NAME?.trim() ||
    DEFAULT_APP_NAME
  );
}

export { rootDir };
