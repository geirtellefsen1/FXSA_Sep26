import { FxApiClient } from '@fxpms/api-client';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/**
 * Phase 1 auth is the dev-only X-Dev-User header (see apps/api/src/auth.ts); there's no login
 * screen until Sprint 2 Day 7. Override with VITE_DEV_USER for a different fixture user.
 */
const DEV_USER = (import.meta.env.VITE_DEV_USER as string | undefined) ?? 'geir@flexistore.no';

export function createApiClient(tenant?: string): FxApiClient {
  return new FxApiClient({ baseUrl: BASE_URL, devUser: DEV_USER, tenant });
}
