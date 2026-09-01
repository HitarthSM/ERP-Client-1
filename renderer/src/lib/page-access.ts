/** Roles that skip page-access config checks. Super admin is platform-wide; org admin is org-wide. */
export const FULL_PAGE_ACCESS_ROLES: readonly string[] = ['super_admin', 'org_admin'];

/** Backend APIs for these nav keys are SuperAdmin-only — hide from org_admin full-access bypass. */
export const SUPER_ADMIN_ONLY_PAGE_KEYS: readonly string[] = ['organizations'];

export function isFullPageAccessRole(role: string): boolean {
  return FULL_PAGE_ACCESS_ROLES.includes(role);
}

export function canAccessPage(
  roles: readonly string[] | undefined,
  pageKey: string,
  accessMap: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const userRoles = roles ?? [];
  if (SUPER_ADMIN_ONLY_PAGE_KEYS.includes(pageKey) && !userRoles.includes('super_admin')) {
    return false;
  }
  if (userRoles.some((role) => isFullPageAccessRole(role))) {
    return true;
  }
  const allowed = accessMap.get(pageKey);
  if (!allowed) {
    return false;
  }
  return userRoles.some((role) => allowed.has(role));
}
