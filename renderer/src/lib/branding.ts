/** Display name for app chrome (not organization / receipt branding). */
const DEFAULT_APP_NAME = 'Pramukh Digital';

export function getAppName(): string {
  const fromEnv = import.meta.env.VITE_APP_NAME?.trim();
  return fromEnv || DEFAULT_APP_NAME;
}

/** Single-letter badge for sidebar (first alphanumeric of app name). */
export function getAppInitial(): string {
  const match = getAppName().match(/[A-Za-z0-9]/);
  return (match?.[0] ?? 'P').toUpperCase();
}
