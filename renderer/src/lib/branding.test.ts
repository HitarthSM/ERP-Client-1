import { describe, expect, it } from 'vitest';
import { getAppInitial, getAppName } from './branding';

describe('branding', () => {
  it('returns a non-empty app name (env or default)', () => {
    expect(getAppName().length).toBeGreaterThan(0);
  });

  it('returns a single uppercase initial', () => {
    expect(getAppInitial()).toMatch(/^[A-Z0-9]$/);
  });
});
