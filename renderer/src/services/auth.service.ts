import { get, post } from '../api';

export interface MeResponse {
  id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  roles: string[];
  isOnboarded: boolean;
  organization?: { id: string; name: string; slug: string; logoUrl?: string };
  membership?: { id: string; roleId: string; status: string; joinedAt?: string };
  locationIds?: string[];
  hasOrgWideAccess?: boolean;
  currencyCode?: string;
}

export const AuthService = {
  getMe: () => get<MeResponse>('/api/v1/auth/me'),

  sync: () => post<{ id: string; isOnboarded: boolean }>('/api/v1/auth/sync'),

  createOrganization: (payload: { name: string; slug: string; clerkOrgId?: string; logoUrl?: string }) =>
    post<{ organizationId: string; organizationName: string; membershipId: string; role: string }>(
      '/api/v1/auth/organizations',
      payload,
    ),
};
