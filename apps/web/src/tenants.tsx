/**
 * Tenant context — Phase 1 shell change, wired to the real API.
 *
 * Unlike the prototype (a hardcoded FXTENANTS array), the tenant list here comes from
 * GET /api/me's `memberships` (real tenant_memberships rows). The selected tenant drives
 * the X-Tenant header on every subsequent api-client call, and its currency/locale/timezone
 * drive display formatting — there is no local source of truth for tenant metadata anymore.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FxApiClient, Membership } from '@fxpms/api-client';
import { createApiClient } from './api.js';

export const FXGROUP: Membership = {
  tenant_id: 'all', slug: 'all', name: 'Flexistore group', role: 'viewer', currency: 'ZAR', locale: 'en-ZA', timezone: 'Africa/Johannesburg', country: 'ZA',
};

function shortCode(m: Membership): string {
  return m.slug === 'all' ? 'ALL' : m.slug.toUpperCase();
}

function readTenantSlug(): string | null {
  try {
    return localStorage.getItem('fx.tenant');
  } catch {
    return null;
  }
}
function writeTenantSlug(slug: string) {
  try {
    localStorage.setItem('fx.tenant', slug);
  } catch {
    // ignore — private browsing or blocked storage; the in-memory selection still works this session
  }
}

type TenantState = {
  loading: boolean;
  memberships: Membership[];
  canSwitchToGroup: boolean;
  current: Membership;
  setTenant: (slug: string) => void;
  /** X-Tenant-scoped client for the currently selected tenant — every screen fetches through this. */
  client: FxApiClient;
};

const TenantContext = createContext<TenantState | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  // No X-Tenant header: per selectScope() in apps/api/src/auth.ts this resolves to the caller's
  // single membership, or "all" scope for an org admin / multi-tenant staff member — either way
  // enough to bootstrap the membership list before a tenant is chosen.
  const bootstrapClient = useMemo(() => createApiClient(), []);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [slug, setSlug] = useState<string>(readTenantSlug() ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bootstrapClient.me().then((me) => {
      if (cancelled) return;
      setMemberships(me.memberships);
      setIsOrgAdmin(me.user.is_org_admin);
      setLoading(false);
      setSlug((prev) => (prev && (prev === 'all' || me.memberships.some((m) => m.slug === prev)) ? prev : (me.memberships[0]?.slug ?? '')));
    });
    return () => {
      cancelled = true;
    };
  }, [bootstrapClient]);

  const setTenant = useCallback((next: string) => {
    setSlug(next);
    writeTenantSlug(next);
  }, []);

  const current = useMemo<Membership>(() => {
    if (slug === 'all') return FXGROUP;
    return memberships.find((m) => m.slug === slug) ?? memberships[0] ?? FXGROUP;
  }, [memberships, slug]);

  const client = useMemo(() => createApiClient(current.slug === 'all' ? undefined : current.slug), [current.slug]);

  const value = useMemo<TenantState>(
    () => ({ loading, memberships, canSwitchToGroup: isOrgAdmin, current, setTenant, client }),
    [loading, memberships, isOrgAdmin, current, setTenant, client],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant() must be used inside <TenantProvider>');
  return ctx;
}

export function useApiClient(): FxApiClient {
  return useTenant().client;
}

const SYMBOLS: Record<string, string> = { ZAR: 'R', NOK: 'kr', EUR: '€' };
const LOCALES: Record<string, string> = { ZAR: 'en-ZA', NOK: 'nb-NO', EUR: 'fi-FI' };

/**
 * Formats an API `Money` value ({ amount_minor: string, currency }). Every tenant currency here
 * has 2 minor-unit decimals (cents/øre); that's a Phase 1 assumption, not a general one.
 */
export function formatMoney(amountMinor: string | number, currency: string): { symbol: string; number: string } {
  const symbol = SYMBOLS[currency] ?? currency;
  const locale = LOCALES[currency] ?? 'en-ZA';
  const major = Number(amountMinor) / 100;
  const n = Math.abs(major).toLocaleString(locale, { maximumFractionDigits: 0 });
  return { symbol, number: major < 0 ? `-${n}` : n };
}

export function TenantSwitcher() {
  const { current, memberships, canSwitchToGroup, setTenant } = useTenant();
  if (memberships.length <= 1 && !canSwitchToGroup) {
    return <span className="badge badge--neutral" title={current.name}>{shortCode(current)}</span>;
  }
  const opts = canSwitchToGroup ? [...memberships, FXGROUP] : memberships;
  return (
    <div style={{ display: 'flex', background: 'var(--ink-100)', borderRadius: 7, padding: 2, gap: 2 }} title="Tenant scope">
      {opts.map((o) => (
        <button
          key={o.slug}
          onClick={() => setTenant(o.slug)}
          style={{
            border: 'none',
            background: current.slug === o.slug ? 'white' : 'transparent',
            color: current.slug === o.slug ? 'var(--ink-900)' : 'var(--ink-500)',
            padding: '4px 10px',
            borderRadius: 5,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: current.slug === o.slug ? 'var(--shadow-xs)' : 'none',
            transition: 'all 0.12s',
          }}
        >
          {shortCode(o)}
        </button>
      ))}
    </div>
  );
}
