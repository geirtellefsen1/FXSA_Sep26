import { useQuery } from '@tanstack/react-query';
import type { Cockpit } from '@fxpms/api-client';
import { Btn, Card, Empty, Kpi, Money as MoneyView, SevDot, Spark } from '../components.js';
import { Icon } from '../icons.js';
import { useApiClient } from '../tenants.js';

function deviceIcon(kind: string): string {
  return ({ gateway: 'wifi', switch: 'route', door: 'door', camera: 'camera', electrical: 'zap', env: 'thermo' } as Record<string, string>)[kind] ?? 'cpu';
}
function kindLabel(kind: string): string {
  return ({ 'move-in': 'Move-in', 'move-out': 'Move-out', tour: 'Tour' } as Record<string, string>)[kind] ?? kind;
}

function DeviceMini({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: 'good' | 'watch' | 'bad' | 'neutral' }) {
  const colors = { good: 'var(--good-700)', watch: 'var(--watch-700)', bad: 'var(--bad-700)', neutral: 'var(--ink-500)' };
  const bgs = { good: 'var(--good-50)', watch: 'var(--watch-50)', bad: 'var(--bad-50)', neutral: 'var(--ink-100)' };
  return (
    <div style={{ padding: '10px 12px', border: '1px solid var(--ink-150)', borderRadius: 8, background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ width: 18, height: 18, borderRadius: 4, background: bgs[tone], color: colors[tone], display: 'grid', placeItems: 'center' }}>
          <Icon name={icon} size={11} />
        </span>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{label}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: tone === 'neutral' ? 'var(--ink-700)' : colors[tone], fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function TenantSection({ t }: { t: Cockpit['tenants'][number] }) {
  const k = t.kpis;
  const siteById = new Map(t.site_health.map((s) => [s.site_id, s]));
  const issues = t.site_health.filter((s) => s.occupancy_pct != null && s.occupancy_pct < 70);

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Monthly recurring" value={<MoneyView value={k.mrr} big />} sub={`${t.site_health.length} facilities`} />
        <Kpi label="Outstanding" value={<MoneyView value={k.outstanding} big />} tone={k.outstanding_count > 0 ? 'bad' : undefined} sub={`${k.outstanding_count} customer${k.outstanding_count === 1 ? '' : 's'} in arrears`} />
        <Kpi label="Collected today" value={<MoneyView value={k.collected_today} big />} tone="good" sub={`${k.payments_today} payments · ${k.payments_failed_today} failed`} />
        <Kpi label="Occupancy" value={k.occupancy_avg_pct == null ? '—' : `${Math.round(k.occupancy_avg_pct)}%`} sub={`${k.moveins_today} move-ins · ${k.moveouts_today} move-outs today`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="AI proposes" icon="sparkles" tone="ai" count={0}>
            <Empty icon="sparkles" title="No proposals yet" sub="AI-proposed actions ship in Phase 5 (Sprint 10+)." />
          </Card>

          <Card title="Facilities · live" icon="building">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {t.site_health.map((s) => {
                const sev = s.occupancy_pct == null ? 'neutral' : s.occupancy_pct < 70 ? 'bad' : s.occupancy_pct < 85 ? 'watch' : 'good';
                return (
                  <div key={s.site_id} style={{ padding: 14, border: '1px solid var(--ink-150)', borderRadius: 10, background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SevDot status={sev} />
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{s.short_code}</div>
                      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)', fontVariantNumeric: 'tabular-nums' }}>{s.occupancy_pct == null ? '—' : `${Math.round(s.occupancy_pct)}%`}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>{s.name} · {s.units_occupied}/{s.units_total} units</div>
                    <Spark data={s.spark_14d.length > 1 ? s.spark_14d : [0, 0]} color={sev === 'bad' ? 'var(--bad-600)' : sev === 'watch' ? 'var(--watch-600)' : 'var(--good-600)'} height={28} width={200} />
                    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>14-day status-change activity, not occupancy history</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Devices & sensors" icon="sensor"
            count={`${k.devices_online}/${k.devices_total}`}
            subtitle="Auto-ping every 60s"
          >
            <div className="grid grid--4" style={{ marginBottom: 14, gap: 10 }}>
              <DeviceMini icon="check-circle" label="Online" value={k.devices_online} tone="good" />
              <DeviceMini icon="alert" label="Degraded" value={k.devices_degraded} tone={k.devices_degraded > 0 ? 'watch' : 'neutral'} />
              <DeviceMini icon="wifi" label="Offline" value={k.devices_offline} tone={k.devices_offline > 0 ? 'bad' : 'neutral'} />
              <DeviceMini icon="shield" label="Anomalies" value={0} tone="neutral" />
            </div>
            {issues.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--ink-150)', borderRadius: 8, overflow: 'hidden' }}>
                {issues.slice(0, 4).map((s, i) => (
                  <div key={s.site_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none', background: 'white' }}>
                    <SevDot status="watch" />
                    <Icon name={deviceIcon('gateway')} size={15} style={{ color: 'var(--ink-500)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>Occupancy below 70%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--good-700)', fontSize: 12.5, fontWeight: 500, background: 'var(--good-50)', borderRadius: 8 }}>
                <Icon name="check-circle" size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                All facilities at or above 70% occupancy.
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Today's schedule" icon="calendar" count={t.schedule_today.length}>
            {t.schedule_today.length === 0 ? (
              <Empty icon="calendar" title="Nothing scheduled today" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {t.schedule_today.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{kindLabel(s.kind)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }} className="truncate">{s.site_id ? (siteById.get(s.site_id)?.name ?? s.site_id) : '—'}</div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 8 }}>Customer/unit names pending a schedule-view enrichment (Day 5 backlog)</div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CockpitScreen() {
  const client = useApiClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['cockpit', client], queryFn: () => client.cockpit() });

  return (
    <div data-screen-label="Ops cockpit">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Ops cockpit</h1>
          <div className="page-hd__sub">Real-time KPIs, facility health and today's schedule for every tenant in scope.</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="refresh">Refresh</Btn>
        </div>
      </div>

      {isLoading && <Card><Empty icon="sparkles" title="Loading…" /></Card>}
      {error && <Card><Empty icon="alert" title="Couldn't load the cockpit" sub={String((error as Error).message)} /></Card>}

      {data && data.tenants.length === 0 && (
        <Card><Empty icon="building" title="No tenants in scope" sub="This user has no tenant memberships." /></Card>
      )}

      {data?.tenants.map((t) => <TenantSection key={t.tenant_id} t={t} />)}

      {data && (
        <Card title="Live ops feed" icon="history" subtitle="Last hour">
          {data.live_feed.length === 0 ? (
            <Empty icon="history" title="No activity in the last hour" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.live_feed.map((e) => (
                <div key={e.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 60, fontSize: 10.5, color: 'var(--ink-400)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingTop: 2 }}>{new Date(e.ts).toLocaleTimeString()}</div>
                  <div style={{ width: 16, display: 'grid', placeItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                    <span className={`sev sev--${e.severity ?? 'good'}`} style={{ width: 6, height: 6, boxShadow: 'none' }} />
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--ink-800)' }}>{e.summary ?? `${e.actor_kind} · ${e.action}`}</span>
                    {e.actor_kind === 'bot' && <span style={{ marginLeft: 6, color: 'var(--ai-700)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>AI</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
