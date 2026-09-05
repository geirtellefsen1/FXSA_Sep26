/* ============================================================
   Flexistore PMS — tenant context (Phase 1 shell change)
   The console is multi-tenant. Org staff can switch tenant (or view
   the whole group); tenant staff are pinned to theirs. In production
   the list comes from GET /api/me (tenant_memberships) and the choice
   sets the API's tenant scope; here it drives currency/locale/branding.
   ============================================================ */

const FXTENANTS = [
  { slug: 'fxsa', name: 'Flexistore South Africa', short: 'FXSA', country: 'ZA', currency: 'ZAR', symbol: 'R',  locale: 'en-ZA', timezone: 'Africa/Johannesburg', sizeUnit: 'm²', sourceOfRecord: 'zoho' },
  { slug: 'fxno', name: 'Flexistore Norway',       short: 'FXNO', country: 'NO', currency: 'NOK', symbol: 'kr', locale: 'nb-NO', timezone: 'Europe/Oslo',         sizeUnit: 'm³', sourceOfRecord: 'zoho' },
  { slug: 'fxfi', name: 'Flexistore Finland',      short: 'FXFI', country: 'FI', currency: 'EUR', symbol: '€',  locale: 'fi-FI', timezone: 'Europe/Helsinki',     sizeUnit: 'm³', sourceOfRecord: 'zoho' },
];
const FXGROUP = { slug: 'all', name: 'Flexistore group', short: 'ALL', currency: 'ZAR', symbol: 'R', locale: 'en-ZA', sizeUnit: 'm²' };

function readTenantSlug() {
  try { return localStorage.getItem('fx.tenant') || 'fxsa'; } catch (e) { return 'fxsa'; }
}
function tenantBySlug(slug) { return slug === 'all' ? FXGROUP : (FXTENANTS.find(t => t.slug === slug) || FXTENANTS[0]); }

window.FXTENANT = tenantBySlug(readTenantSlug());
window.setTenant = function (slug) {
  window.FXTENANT = tenantBySlug(slug);
  try { localStorage.setItem('fx.tenant', slug); } catch (e) {}
  window.dispatchEvent(new CustomEvent('fx:tenant', { detail: window.FXTENANT }));
};

// Money formatting. Amounts in the mock data are major units; the API returns minor units + currency,
// so the real client divides by 100 first and never assumes the tenant currency for a row that carries its own.
function formatMoney(amount, currency) {
  const t = window.FXTENANT || FXGROUP;
  const cur = currency || t.currency;
  const tenantFor = FXTENANTS.find(x => x.currency === cur) || t;
  const n = Math.abs(amount).toLocaleString(tenantFor.locale, { maximumFractionDigits: 0 });
  return { symbol: tenantFor.symbol || cur, number: amount < 0 ? `-${n}` : n };
}

function useTenant() {
  const [t, setT] = React.useState(window.FXTENANT);
  React.useEffect(() => {
    const fn = (e) => setT(e.detail);
    window.addEventListener('fx:tenant', fn);
    return () => window.removeEventListener('fx:tenant', fn);
  }, []);
  return t;
}

function TenantSwitcher({ canSwitch = true }) {
  const t = useTenant();
  const opts = [...FXTENANTS, FXGROUP];
  if (!canSwitch) {
    return <span className="badge badge--neutral" title={t.name}>{t.short}</span>;
  }
  return (
    <div style={{ display: 'flex', background: 'var(--ink-100)', borderRadius: 7, padding: 2, gap: 2 }} title="Tenant scope">
      {opts.map(o => (
        <button key={o.slug} onClick={() => window.setTenant(o.slug)}
          style={{ border: 'none', background: t.slug === o.slug ? 'white' : 'transparent', color: t.slug === o.slug ? 'var(--ink-900)' : 'var(--ink-500)',
                   padding: '4px 10px', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', boxShadow: t.slug === o.slug ? 'var(--shadow-xs)' : 'none', transition: 'all 0.12s' }}>
          {o.short}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { FXTENANTS, FXGROUP, formatMoney, useTenant, TenantSwitcher });
