/* ============================================================
   Subs & invoices
   The money screens. Subscriptions list, invoices list, focus
   on payment flow.
   ============================================================ */

function BillingScreen({ mode }) {
  const [tab, setTab] = React.useState('invoices');

  return (
    <div data-screen-label="Billing">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Subscriptions &amp; invoices</h1>
          <div className="page-hd__sub">842 active subscriptions · 1 247 invoices YTD · Xero sync on</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="paperclip">Export</Btn>
          <Btn kind="ghost" icon="refresh">Run billing batch</Btn>
          <Btn kind="primary" icon="plus">New invoice</Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Issued this month" prefix={FXTENANT.symbol} value="231 480" sub="842 invoices" />
        <Kpi label="Collected (settled)" prefix={FXTENANT.symbol} value="209 060" sub="90% · auto-recurring" tone="good" delta={4.2} />
        <Kpi label="Outstanding" prefix={FXTENANT.symbol} value="22 420" sub="9 customers · 3 in retry" tone={mode === 'crisis' ? 'bad' : null} />
        <Kpi label="Avg DSO" value="2.4 days" sub="Down from 4.1 last quarter" delta={-42} />
      </div>

      <Tabs
        tabs={[
          { id: 'invoices',     label: 'Invoices', count: 1247 },
          { id: 'subscriptions', label: 'Subscriptions', count: 842 },
          { id: 'payments',     label: 'Payments' },
          { id: 'pricing',      label: 'Pricing' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'invoices' && <InvoicesTab mode={mode} />}
      {tab === 'subscriptions' && <SubscriptionsTab mode={mode} />}
      {tab === 'payments' && <PaymentsTab mode={mode} />}
      {tab === 'pricing' && <PricingTab mode={mode} />}
    </div>
  );
}

function InvoicesTab({ mode }) {
  const rows = invoiceList(mode);

  return (
    <Card padding={false}>
      <div style={{ padding: '14px 18px 12px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--ink-150)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Icon name="search" size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
          <input placeholder="Search invoices…" style={{ width: '100%', padding: '7px 11px 7px 32px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'white' }} />
        </div>
        <Btn size="sm" kind="ghost">All statuses <Icon name="chevron-down" size={11} /></Btn>
        <Btn size="sm" kind="ghost">May 2026 <Icon name="chevron-down" size={11} /></Btn>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn size="sm" kind="ghost" icon="filter">Filters</Btn>
          <Btn size="sm" kind="ghost" icon="paperclip">Export</Btn>
        </div>
      </div>

      <table className="tbl" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 130 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 100 }} />
          <col />
          <col />
          <col />
          <col style={{ width: 130 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 130 }} />
        </colgroup>
        <thead><tr><th>Invoice</th><th>Customer</th><th>Period</th><th className="num">Subtotal</th><th className="num">VAT</th><th className="num">Total</th><th>Status</th><th>Due</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.num} style={{ cursor: 'pointer' }}>
              <td className="mono" style={{ fontWeight: 600, fontSize: 11.5 }}>{r.num}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Avatar name={r.customer} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer}</div>
                    <div className="muted truncate" style={{ fontSize: 11 }}>{r.unit}</div>
                  </div>
                </div>
              </td>
              <td className="muted">{r.period}</td>
              <td className="num">{(r.total / 1.15).toFixed(0)}</td>
              <td className="num">{(r.total - r.total / 1.15).toFixed(0)}</td>
              <td className="num bold">{r.total.toLocaleString(FXTENANT.locale)}</td>
              <td>
                {r.status === 'paid' && <Badge tone="good" dot>Paid</Badge>}
                {r.status === 'overdue' && <Badge tone="bad" dot>Overdue {r.days}d</Badge>}
                {r.status === 'pending' && <Badge tone="watch" dot>Pending</Badge>}
                {r.status === 'retry' && <Badge tone="watch" dot>Retry · D+{r.attempt}</Badge>}
              </td>
              <td className="muted">{r.due}</td>
              <td className="right">
                <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                  {r.status === 'overdue' && <Btn size="sm" kind="accent">Remind</Btn>}
                  <Btn size="sm" kind="quiet" icon="more" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SubscriptionsTab() {
  const subs = FXDATA.PEOPLE.filter(p => p.site).slice(0, 8);
  return (
    <Card padding={false}>
      <table className="tbl">
        <thead><tr><th>Customer</th><th>Site · Unit</th><th>Started</th><th className="num">Monthly</th><th>Discount</th><th>Status</th><th>Next bill</th><th></th></tr></thead>
        <tbody>
          {subs.map(s => (
            <tr key={s.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={`${s.first} ${s.last}`} size="sm" />
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.first} {s.last}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{s.id}</div>
                  </div>
                </div>
              </td>
              <td>{({ rivonia: 'RIV', rosebank: 'RBK', eikestad: 'EIK', bellville: 'BVL', rembrandt: 'RMB', riverside: 'RVS' })[s.site]} · <span className="mono">{s.unit}</span></td>
              <td className="muted">12 Jan 2025</td>
              <td className="num"><span className="muted" style={{ fontWeight: 500 }}>R </span>{FXDATA.priceFor(s)}</td>
              <td>{s.type === 'business' ? <Badge tone="info">B2B · 5%</Badge> : <span className="muted">—</span>}</td>
              <td><Badge tone="good" dot>Active</Badge></td>
              <td className="muted">1 Jun</td>
              <td className="right"><Btn size="sm" kind="quiet" icon="chevron-right" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PaymentsTab() {
  const payments = [
    { ref: 'pst_1k9j2m', method: 'Paystack · card', customer: 'Marilet Theron', amount: 959, status: 'settled', time: '25 May · 02:01' },
    { ref: 'pst_1k9k0a', method: 'Paystack · card', customer: 'Anand Naidoo', amount: 5220, status: 'settled', time: '25 May · 06:30' },
    { ref: 'EFT-2026052501', method: 'EFT', customer: 'Sipho Dlamini', amount: 16500, status: 'settled', time: '25 May · 09:14' },
    { ref: 'pst_1k9l9b', method: 'Paystack · recurring', customer: 'Kerry van Wyk', amount: 5220, status: 'failed', time: '25 May · 03:00' },
    { ref: 'pst_1k9l9c', method: 'Paystack · card', customer: 'Tinus Greyling', amount: 2750, status: 'failed', time: '25 May · 03:11' },
  ];
  return (
    <Card padding={false}>
      <table className="tbl">
        <thead><tr><th>Reference</th><th>Method</th><th>Customer</th><th className="num">Amount</th><th>Status</th><th>Time</th><th></th></tr></thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.ref}>
              <td className="mono" style={{ fontSize: 11.5 }}>{p.ref}</td>
              <td>{p.method}</td>
              <td>{p.customer}</td>
              <td className="num bold">{FXTENANT.symbol} {p.amount.toLocaleString(FXTENANT.locale)}</td>
              <td>
                {p.status === 'settled' && <Badge tone="good" dot>Settled</Badge>}
                {p.status === 'failed' && <Badge tone="bad" dot>Declined</Badge>}
                {p.status === 'pending' && <Badge tone="watch" dot>Pending</Badge>}
              </td>
              <td className="muted">{p.time}</td>
              <td className="right">{p.status === 'failed' ? <Btn size="sm" kind="accent">Retry</Btn> : <Btn size="sm" kind="quiet">Details</Btn>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PricingTab({ mode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <Card title="Listed prices by site" icon="trending-up" padding={false}>
        <table className="tbl">
          <thead><tr><th>Site</th><th>Unit type</th><th>Listed</th><th>Occupancy</th><th>Band</th></tr></thead>
          <tbody>
            <PriceRow site="Rosebank" type="Small (1–4 m²)" price={220} occ={0.91} band="High demand · +15%" tone="good" />
            <PriceRow site="Rosebank" type="Medium" price={195} occ={0.85} band="Normal" tone="neutral" />
            <PriceRow site="Rivonia" type="Small" price={195} occ={0.94} band="High demand · +10%" tone="good" />
            <PriceRow site="Eikestad" type="Medium" price={175} occ={0.92} band="High demand · +5%" tone="good" />
            <PriceRow site="Riverside" type="Small" price={125} occ={0.61} band="Under-utilised" tone="bad" />
            <PriceRow site="Riverside" type="Medium" price={140} occ={0.58} band="Under-utilised" tone="bad" />
            <PriceRow site="Paarl" type="Medium" price={150} occ={0.77} band="Normal" tone="neutral" />
          </tbody>
        </table>
      </Card>
      <Card title="AI pricing recommendations" icon="sparkles" tone="ai">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AiCard task={{
            title: 'Drop Riverside Junction prices 8% for 30 days',
            rationale: 'Occupancy stuck at 61% for 30 days. Comparable units at competitor "StorageRSA Mbombela" listed at R 145/m². Promo should clear 6–8 units.',
            affects: ['Riverside Junction · 12 vacant units'],
            impact: '+R 7 200 MRR if 50% conversion',
            confidence: 0.88,
            action: 'Schedule price drop',
          }} />
          <AiCard task={{
            title: 'Raise Rosebank Small units 5%',
            rationale: 'Occupancy at 91% for 6 weeks. Waitlist of 4 customers. Last price increase 8 months ago.',
            affects: ['Rosebank · Zone A small'],
            impact: '+R 4 380 MRR',
            confidence: 0.91,
            action: 'Schedule increase',
          }} />
        </div>
      </Card>
    </div>
  );
}

function PriceRow({ site, type, price, occ, band, tone }) {
  return (
    <tr>
      <td>{site}</td>
      <td className="muted">{type}</td>
      <td className="num bold"><span className="muted" style={{ fontWeight: 500 }}>R </span>{price}/m²</td>
      <td><span style={{ display: 'inline-block', width: 50, background: 'var(--ink-100)', borderRadius: 3, position: 'relative', height: 6, marginRight: 6, verticalAlign: 'middle' }}><span style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3, width: `${occ * 100}%`, background: tone === 'bad' ? 'var(--bad-600)' : tone === 'good' ? 'var(--good-600)' : 'var(--watch-600)' }} /></span><span className="num" style={{ fontSize: 12 }}>{Math.round(occ * 100)}%</span></td>
      <td><Badge tone={tone === 'neutral' ? 'neutral' : tone}>{band}</Badge></td>
    </tr>
  );
}

function invoiceList(mode) {
  const rows = [
    { num: 'INV-202605-1124', customer: 'Tinus Greyling', unit: 'Rosebank · D-08', period: 'May 2026', total: 2750, status: 'overdue', days: 7, due: '18 May' },
    { num: 'INV-202605-1125', customer: 'Pieter Botha', unit: 'Paarl · B-15', period: 'May 2026', total: 4200, status: 'overdue', days: 14, due: '11 May' },
    { num: 'INV-202605-1126', customer: 'Cobus du Plessis', unit: 'Bellville · B-04', period: 'May 2026', total: 1320, status: 'overdue', days: 3, due: '22 May' },
    { num: 'INV-202605-1127', customer: 'Kerry van Wyk', unit: 'Eikestad · 112', period: 'May 2026', total: 5220, status: 'retry', attempt: 2, due: '25 May' },
    { num: 'INV-202605-1128', customer: 'Marilet Theron', unit: 'Eikestad · 058', period: 'May 2026', total: 959, status: 'paid', due: '25 May' },
    { num: 'INV-202605-1129', customer: 'Anand Naidoo', unit: 'Rivonia · C-04', period: 'May 2026', total: 5220, status: 'paid', due: '25 May' },
    { num: 'INV-202605-1130', customer: 'Sipho Dlamini', unit: 'Bellville · A-22', period: 'May 2026', total: 16500, status: 'paid', due: '25 May' },
    { num: 'INV-202605-1131', customer: 'Megan Roberts', unit: 'Rosebank · E-11', period: 'May 2026', total: 1100, status: 'pending', due: '1 Jun' },
    { num: 'INV-202605-1132', customer: 'Lerato Khumalo', unit: 'Rosebank · F-07', period: 'May 2026', total: 1100, status: 'paid', due: '25 May' },
    { num: 'INV-202605-1133', customer: 'Asha Patel', unit: 'Rivonia · A-10', period: 'May 2026', total: 1170, status: 'paid', due: '25 May' },
  ];
  return rows;
}

window.BillingScreen = BillingScreen;
