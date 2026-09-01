import { describe, expect, it } from 'vitest';
import { canAccessPage, isFullPageAccessRole } from './page-access';

describe('canAccessPage', () => {
  const emptyMap = new Map<string, ReadonlySet<string>>();
  const usersOnlyForStoreManager = new Map<string, ReadonlySet<string>>([
    ['users', new Set(['store_manager'])],
  ]);

  it('grants super_admin every page when configs are empty', () => {
    expect(canAccessPage(['super_admin'], 'users', emptyMap)).toBe(true);
  });

  it('grants org_admin every page when configs are empty', () => {
    expect(canAccessPage(['org_admin'], 'users', emptyMap)).toBe(true);
  });

  it('grants org_admin a page even when the config omits org_admin', () => {
    expect(canAccessPage(['org_admin'], 'users', usersOnlyForStoreManager)).toBe(true);
  });

  it('denies org_admin SuperAdmin-only pages like organizations', () => {
    expect(canAccessPage(['org_admin'], 'organizations', emptyMap)).toBe(false);
  });

  it('grants super_admin SuperAdmin-only pages', () => {
    expect(canAccessPage(['super_admin'], 'organizations', emptyMap)).toBe(true);
  });

  it('denies store_staff when configs are empty', () => {
    expect(canAccessPage(['store_staff'], 'users', emptyMap)).toBe(false);
  });

  it('allows store_manager only when the page lists that role', () => {
    expect(canAccessPage(['store_manager'], 'users', usersOnlyForStoreManager)).toBe(true);
    expect(canAccessPage(['store_manager'], 'dashboard', usersOnlyForStoreManager)).toBe(false);
  });
});

describe('isFullPageAccessRole', () => {
  it('treats org_admin as a full-access role', () => {
    expect(isFullPageAccessRole('org_admin')).toBe(true);
  });

  it('does not treat store_manager as a full-access role', () => {
    expect(isFullPageAccessRole('store_manager')).toBe(false);
  });
});
