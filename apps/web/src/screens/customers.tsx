import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CustomerListItem } from '@fxpms/api-client';
import { Avatar, Badge, Btn, Card, Empty, Money as MoneyView, Tabs } from '../components.js';
import { Icon } from '../icons.js';
import { useApiClient } from '../tenants.js';

function statusBadge(status: string) {
  if (status === 'arrears') return <Badge tone="bad" dot>Arrears</Badge>;
  if (status === 'active') return <Badge tone="good" dot>Active</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

function CustomersList({ onSelect }: { onSelect: (id: string) => void }) {
  const client = useApiClient();
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', client, q],
    queryFn: () => client.customers({ q: q || undefined, limit: 50 }),
  });
  const items = data?.items ?? [];

  return (
    <div data-screen-label="Customers">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Customers</h1>
          <div className="page-hd__sub">{isLoading ? 'Loading…' : `${items.length} shown`}</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="filter">Filter</Btn>
          <Btn kind="primary" icon="plus" disabled>New customer</Btn>
        </div>
      </div>

      <Card padding={false}>
        <div style={{ padding: '14px 18px 12px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--ink-150)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, phone, account…"
              style={{ width: '100%', padding: '7px 11px 7px 32px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'white' }}
            />
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>{items.length}{data?.next_cursor ? '+' : ''}</div>
        </div>

        {error && <div style={{ padding: 18 }}><Empty icon="alert" title="Couldn't load customers" sub={String((error as Error).message)} /></div>}
        {!error && !isLoading && items.length === 0 && <div style={{ padding: 18 }}><Empty icon="users" title="No customers match" /></div>}

        {items.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Account</th>
                <th>KYC</th>
                <th>Status</th>
                <th>Customer since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p: CustomerListItem) => (
                <tr key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={p.full_name ?? p.email ?? '?'} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{p.full_name ?? '—'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{p.email ?? p.phone ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted mono" style={{ fontSize: 11.5 }}>{p.account_number ?? '—'}</td>
                  <td className="muted">{p.kyc_status}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{p.customer_since ? new Date(p.customer_since).toLocaleDateString() : '—'}</td>
                  <td className="right"><Icon name="chevron-right" size={14} style={{ color: 'var(--ink-400)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

type Tab = 'overview' | 'subs' | 'payments' | 'invoices' | 'timeline' | 'legacy';

function Field({ label, val }: { label: string; val: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500 }}>{val}</div>
    </div>
  );
}

function Customer360({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const client = useApiClient();
  const [tab, setTab] = useState<Tab>('overview');
  const { data, isLoading, error } = useQuery({ queryKey: ['customer', client, customerId], queryFn: () => client.customer(customerId) });
  const timeline = useQuery({ queryKey: ['customer-timeline', client, customerId], queryFn: () => client.customerTimeline(customerId, { limit: 50 }), enabled: tab === 'timeline' });
  const legacy = useQuery({ queryKey: ['customer-legacy', client, customerId], queryFn: () => client.customerLegacy(customerId), enabled: tab === 'legacy' });

  if (isLoading) return <Card><Empty icon="sparkles" title="Loading…" /></Card>;
  if (error) return <Card><Empty icon="alert" title="Couldn't load this customer" sub={String((error as Error).message)} /></Card>;
  if (!data) return <Card><Empty title="Not found" /></Card>;

  const c = data.customer as Record<string, unknown>;
  const fullName = (c.full_name as string | null) ?? '—';
  const status = (c.status as string | null) ?? 'unknown';

  return (
    <div data-screen-label="Customer 360">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron-right" size={12} style={{ transform: 'rotate(180deg)' }} />
          Customers
        </button>
        <span className="muted">/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{fullName}</span>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <Avatar name={fullName} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{fullName}</h2>
              {statusBadge(status)}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="user" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{(c.account_number as string | null) ?? '—'}</span>
              {c.email != null && <span style={{ whiteSpace: 'nowrap' }}><Icon name="mail" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{c.email as string}</span>}
              {c.phone != null && <span style={{ whiteSpace: 'nowrap' }}><Icon name="phone" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{c.phone as string}</span>}
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="shield" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />KYC {(c.kyc_status as string | null) ?? 'unknown'}</span>
              {c.customer_since != null && <span style={{ whiteSpace: 'nowrap' }}><Icon name="clock" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Customer since {new Date(c.customer_since as string).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'subs', label: 'Subscriptions', count: data.subscriptions.length },
          { id: 'payments', label: 'Payments', count: data.recent_payments.length },
          { id: 'invoices', label: 'Invoices' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'legacy', label: 'Legacy' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card title="Active subscription" icon="invoice">
              {data.subscriptions.length === 0 ? (
                <Empty icon="invoice" title="No active subscription" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Facility" val={data.subscriptions[0]!.site.name} />
                  <Field label="Unit number" val={<span className="mono">{data.subscriptions[0]!.unit.number}</span>} />
                  <Field label="Contracted price" val={<MoneyView value={data.subscriptions[0]!.price} />} />
                  <Field label="Status" val={data.subscriptions[0]!.status} />
                  <Field label="Started" val={data.subscriptions[0]!.started_at ? new Date(data.subscriptions[0]!.started_at!).toLocaleDateString() : '—'} />
                  <Field label="Next bill" val={data.subscriptions[0]!.next_bill_at ? new Date(data.subscriptions[0]!.next_bill_at!).toLocaleDateString() : '—'} />
                </div>
              )}
            </Card>

            <Card title="Recent communications" icon="inbox" subtitle="WhatsApp · chat · email — unified">
              {data.recent_messages.length === 0 ? (
                <Empty icon="inbox" title="No messages yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {data.recent_messages.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-800)', marginBottom: 2 }} className="truncate">{m.subject ?? m.snippet ?? m.channel}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{m.direction} · {m.channel} · {new Date(m.sent_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Tags" padding={true}>
              {data.tags.length === 0 ? <span className="muted" style={{ fontSize: 12.5 }}>No tags yet</span> : (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {data.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                </div>
              )}
            </Card>
            <Card title="Notes" padding={true}>
              {data.notes.length === 0 ? <span className="muted" style={{ fontSize: 12.5 }}>No notes yet</span> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.notes.map((n) => (
                    <div key={n.id} style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>{n.body_md}</div>
                  ))}
                </div>
              )}
            </Card>
            <Card title="Documents" padding={true}>
              {data.documents.length === 0 ? <span className="muted" style={{ fontSize: 12.5 }}>No documents yet</span> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.documents.map((d) => <div key={d.id} style={{ fontSize: 12.5 }}>{d.name}</div>)}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'subs' && (
        <Card title="Subscriptions" padding={false}>
          {data.subscriptions.length === 0 ? <div style={{ padding: 18 }}><Empty icon="invoice" title="No subscriptions" /></div> : (
            <table className="tbl">
              <thead><tr><th>Unit</th><th>Facility</th><th className="num">Monthly</th><th>Status</th><th>Started</th><th>Next bill</th></tr></thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.unit.number}</td>
                    <td>{s.site.name}</td>
                    <td className="num"><MoneyView value={s.price} /></td>
                    <td>{statusBadge(s.status)}</td>
                    <td className="muted">{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</td>
                    <td className="muted">{s.next_bill_at ? new Date(s.next_bill_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'payments' && (
        <Card title="Recent payments" padding={false}>
          {data.recent_payments.length === 0 ? <div style={{ padding: 18 }}><Empty icon="wallet" title="No payments recorded" /></div> : (
            <table className="tbl">
              <thead><tr><th>Method</th><th className="num">Amount</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {data.recent_payments.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{p.method}</td>
                    <td className="num"><MoneyView value={p.amount} /></td>
                    <td>{statusBadge(p.status)}</td>
                    <td className="muted">{p.received_at ? new Date(p.received_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'invoices' && (
        <Card padding={true}>
          <Empty icon="invoice" title="Invoicing ships in Phase 2" sub="Sprint 4/5 (Money) adds real invoices with line items and PDF generation." />
        </Card>
      )}

      {tab === 'timeline' && (
        <Card title="Full timeline" icon="history" padding={false}>
          {timeline.isLoading && <div style={{ padding: 18 }}><Empty icon="sparkles" title="Loading…" /></div>}
          {timeline.data && timeline.data.items.length === 0 && <div style={{ padding: 18 }}><Empty icon="history" title="No activity recorded" /></div>}
          {timeline.data && timeline.data.items.length > 0 && (
            <div style={{ padding: 18 }}>
              {timeline.data.items.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', gap: 14, paddingBottom: i < timeline.data!.items.length - 1 ? 14 : 0, position: 'relative' }}>
                  {i < timeline.data!.items.length - 1 && <div style={{ position: 'absolute', top: 28, left: 13, bottom: 0, width: 1, background: 'var(--ink-150)' }} />}
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: e.actor_kind === 'bot' ? 'var(--ai-50)' : 'var(--ink-100)', color: e.actor_kind === 'bot' ? 'var(--ai-700)' : 'var(--ink-600)', display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1 }}>
                    <Icon name="history" size={13} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 500 }}>
                      {e.summary ?? e.action}
                      {e.actor_kind === 'bot' && <span style={{ marginLeft: 6, color: 'var(--ai-700)', fontSize: 10, fontWeight: 700, letterSpacing: 0.04, textTransform: 'uppercase' }}>AI</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{new Date(e.ts).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'legacy' && (
        <Card title="Zoho legacy record" icon="settings" padding={true}>
          {legacy.isLoading && <Empty icon="sparkles" title="Loading…" />}
          {legacy.data && !legacy.data.available && <Empty icon="settings" title="No legacy record" sub="This customer wasn't sourced from the Zoho import." />}
          {legacy.data?.available && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-700)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>{legacy.data.counts.reservations} legacy reservations · {legacy.data.counts.payments} legacy payments · {legacy.data.counts.communications} legacy communications</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export function CustomersScreen({ customerId, onSelect, onBack }: { customerId: string | null; onSelect: (id: string) => void; onBack: () => void }) {
  if (customerId) return <Customer360 customerId={customerId} onBack={onBack} />;
  return <CustomersList onSelect={onSelect} />;
}
