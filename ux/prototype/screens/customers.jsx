/* ============================================================
   Customers — list + 360
   The CRM's beating heart. List view, then a deep 360 view
   with tabs (Overview / Subs / Invoices / Comms / Timeline).
   ============================================================ */

function CustomersScreen({ mode }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const [q, setQ] = React.useState('');

  const all = FXDATA.PEOPLE.filter(p => p.type !== 'lead');

  if (selectedId) {
    return <Customer360 customerId={selectedId} onBack={() => setSelectedId(null)} mode={mode} />;
  }

  const filtered = all.filter(p => {
    if (!q) return true;
    const s = `${p.first} ${p.last} ${p.email} ${p.id}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div data-screen-label="Customers">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Customers</h1>
          <div className="page-hd__sub">{all.length} active · {all.filter(p => p.type === 'business').length} business accounts · sorted by recent activity</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="filter">Filter</Btn>
          <Btn kind="ghost" icon="paperclip">Export</Btn>
          <Btn kind="primary" icon="plus">New customer</Btn>
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
          <Btn size="sm" kind="ghost">All sites <Icon name="chevron-down" size={11} /></Btn>
          <Btn size="sm" kind="ghost">All statuses <Icon name="chevron-down" size={11} /></Btn>
          <Btn size="sm" kind="ghost">Plan size <Icon name="chevron-down" size={11} /></Btn>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>{filtered.length} of {all.length}</div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Account</th>
              <th>Facility · Unit</th>
              <th>Plan</th>
              <th className="num">Monthly</th>
              <th>Status</th>
              <th>Last contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isArrears = FXDATA.ARREARS.some(a => a.customerId === p.id);
              return (
                <tr key={p.id} onClick={() => setSelectedId(p.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={`${p.first} ${p.last}`} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{p.first} {p.last}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted mono" style={{ fontSize: 11.5 }}>{p.id}</td>
                  <td>{p.site ? `${siteShort(p.site)} · ${p.unit}` : <span className="muted">—</span>}</td>
                  <td className="muted">{p.plan} m²</td>
                  <td className="num"><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{FXDATA.priceFor(p)}</td>
                  <td>
                    {p.type === 'business' ? <Badge tone="info" icon="users">B2B · {p.company}</Badge> :
                     isArrears ? <Badge tone="bad" dot>Arrears</Badge> :
                     <Badge tone="good" dot>Active</Badge>}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>{recentContactFor(p)}</td>
                  <td className="right"><Icon name="chevron-right" size={14} style={{ color: 'var(--ink-400)' }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// —————————————————————— 360 view ——————————————————————
function Customer360({ customerId, onBack, mode }) {
  const p = FXDATA.PEOPLE_BY_ID[customerId];
  if (!p) return <Empty title="Not found" />;
  const [tab, setTab] = React.useState('overview');

  const isArrears = FXDATA.ARREARS.find(a => a.customerId === p.id);
  const monthly = FXDATA.priceFor(p);

  return (
    <div data-screen-label="Customer 360">
      {/* Breadcrumb / back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron-right" size={12} style={{ transform: 'rotate(180deg)' }} />
          Customers
        </button>
        <span className="muted">/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{p.first} {p.last}</span>
      </div>

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <Avatar name={`${p.first} ${p.last}`} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{p.first} {p.last}</h2>
              {isArrears ? <Badge tone="bad" dot>Arrears · {FXTENANT.symbol} {isArrears.amount} · {isArrears.days}d</Badge> :
                p.type === 'business' ? <Badge tone="info" icon="users">{p.company}</Badge> :
                <Badge tone="good" dot>Active</Badge>}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="user" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{p.id}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="mail" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{p.email}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="phone" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{p.phone}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="check-circle" size={11} style={{ verticalAlign: -1, marginRight: 4, color: 'var(--good-600)' }} />KYC verified · SumSub</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="clock" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Customer since Jan 2025</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn kind="ghost" icon="message">Message</Btn>
            <Btn kind="ghost" icon="invoice">New invoice</Btn>
            <Btn kind="ghost" icon="more" />
          </div>
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--ink-100)' }}>
          <MiniK lbl="Lifetime value" val={<><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{(monthly * 16).toLocaleString(FXTENANT.locale)}</>} sub="16 months" />
          <MiniK lbl="Monthly" val={<><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{monthly.toLocaleString(FXTENANT.locale)}</>} sub="Billing 1st of month" />
          <MiniK lbl="Open invoices" val={isArrears ? "1" : "0"} sub={isArrears ? <span style={{ color: 'var(--bad-700)' }}>{FXTENANT.symbol} {isArrears.amount}</span> : "All paid"} />
          <MiniK lbl="Door activity" val="14" sub="Last 7 days · normal" />
          <MiniK lbl="Bot resolved" val="12" sub="0 escalated · 100%" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview',    label: 'Overview' },
          { id: 'subs',        label: 'Subscriptions', count: 1 },
          { id: 'invoices',    label: 'Invoices', count: 16 },
          { id: 'comms',       label: 'Communications', count: 47 },
          { id: 'timeline',    label: 'Timeline' },
          { id: 'access',      label: 'Door access' },
          { id: 'docs',        label: 'Documents', count: 3 },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview'    && <Overview360 p={p} mode={mode} isArrears={isArrears} />}
      {tab === 'subs'        && <Subs360 p={p} />}
      {tab === 'invoices'    && <Invoices360 p={p} isArrears={isArrears} />}
      {tab === 'comms'       && <Comms360 p={p} />}
      {tab === 'timeline'    && <Timeline360 p={p} mode={mode} />}
      {tab === 'access'      && <Access360 p={p} />}
      {tab === 'docs'        && <Docs360 p={p} />}
    </div>
  );
}

function MiniK({ lbl, val, sub }) {
  return (
    <div style={{ paddingRight: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{lbl}</div>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--ink-900)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ——— Overview ———
function Overview360({ p, mode, isArrears }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* AI snapshot */}
        <Card title="AI summary" icon="sparkles" tone="ai">
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-700)', margin: 0 }}>
            {p.first} is a <b>{p.type === 'business' ? 'B2B' : 'long-term individual'}</b> customer renting a <b>{p.plan} m²</b> unit at {siteName(p.site)}.
            They\'ve paid <b>16 of 16</b> invoices on time historically.
            {isArrears ? <> Their <b>May invoice ({FXTENANT.symbol} {isArrears.amount}) is {isArrears.days} days overdue</b> — card declined "insufficient funds". Pattern matches 12 similar customers who recovered within 24h of a single WhatsApp nudge. <b style={{ color: 'var(--ai-700)' }}>Suggested action: send card-update link via WhatsApp.</b></> : <> No open issues. Standard renewal expected on the 1st.</>}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {isArrears && <Btn size="sm" kind="ai" icon="send">Send card-update link</Btn>}
            <Btn size="sm" kind="ghost" icon="sparkles">Ask AI about this customer</Btn>
          </div>
        </Card>

        {/* Current subscription */}
        <Card title="Active subscription" icon="invoice" action={<Btn size="sm" kind="ghost">Manage</Btn>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Facility"      val={siteName(p.site)} />
            <Field label="Unit number"   val={<span className="mono">{p.unit}</span>} />
            <Field label="Plan size"     val={`${p.plan} m²`} />
            <Field label="Contracted price" val={<><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{FXDATA.priceFor(p)} / month</>} />
            <Field label="Billing day"   val="1st of month" />
            <Field label="Next invoice"  val="1 Jun 2026" />
            <Field label="Started"       val="12 Jan 2025" />
            <Field label="Notice given"  val={<span className="muted">No</span>} />
          </div>
        </Card>

        {/* Recent communications */}
        <Card
          title="Recent communications"
          icon="inbox"
          subtitle="WhatsApp · chat · email — unified"
          action={<Btn size="sm" kind="quiet">View all 47 →</Btn>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sampleComms(p).map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none' }}>
                <ChannelChip channel={c.channel} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-800)', marginBottom: 2 }} className="truncate">{c.text}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{c.by} · {c.t}</div>
                </div>
                {c.resolved && <Badge tone="good" dot>Resolved</Badge>}
                {c.escalated && <Badge tone="watch" dot>Escalated</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Quick actions" padding={false}>
          <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column' }}>
            {[
              { i: 'message',  l: 'Send WhatsApp' },
              { i: 'mail',     l: 'Send email' },
              { i: 'invoice',  l: 'New invoice' },
              { i: 'wallet',   l: 'Record payment' },
              { i: 'unlock',   l: 'Remote-unlock unit' },
              { i: 'pin',      l: 'Add note' },
              { i: 'tag',      l: 'Tag customer' },
              { i: 'x',        l: 'Suspend', danger: true },
            ].map(a => (
              <button key={a.i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a.danger ? 'var(--bad-700)' : 'var(--ink-700)', borderRadius: 6 }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Icon name={a.i} size={14} style={{ color: a.danger ? 'var(--bad-600)' : 'var(--ink-500)' }} />
                {a.l}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Tags" padding={true}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <Badge tone="info">long-term</Badge>
            <Badge tone="info">student-discount</Badge>
            <Badge tone="neutral">whatsapp-preferred</Badge>
            {p.type === 'business' && <Badge tone="info">B2B · Dlamini</Badge>}
            <button style={{ background: 'transparent', border: '1px dashed var(--ink-200)', borderRadius: 999, padding: '2px 10px', fontSize: 11, color: 'var(--ink-500)', cursor: 'pointer', fontWeight: 600 }}>+ Add tag</button>
          </div>
        </Card>

        <Card title="Banking · Xero" padding={true}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            <div>Linked to Xero contact <span className="mono">{p.id}-{p.first.slice(0,2).toUpperCase()}{p.last.slice(0,2).toUpperCase()}</span></div>
            <div style={{ marginTop: 4 }}>Last sync · 3 min ago</div>
          </div>
          <Btn size="sm" kind="ghost" icon="arrow-right" style={{ marginTop: 10 }}>Open in Xero</Btn>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, val }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 500 }}>{val}</div>
    </div>
  );
}

// ——— Subs tab ———
function Subs360({ p }) {
  return (
    <Card title="Subscriptions" padding={false}>
      <table className="tbl">
        <thead>
          <tr><th>Unit</th><th>Facility</th><th>Plan</th><th className="num">Monthly</th><th>Status</th><th>Started</th><th>Next bill</th><th></th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">{p.unit}</td>
            <td>{siteName(p.site)}</td>
            <td>{p.plan} m²</td>
            <td className="num"><span className="muted" style={{fontWeight:500}}>R </span>{FXDATA.priceFor(p)}</td>
            <td><Badge tone="good" dot>Active</Badge></td>
            <td className="muted">12 Jan 2025</td>
            <td className="muted">1 Jun 2026</td>
            <td className="right"><Btn size="sm" kind="ghost">Manage</Btn></td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

// ——— Invoices tab ———
function Invoices360({ p, isArrears }) {
  const m = FXDATA.priceFor(p);
  const rows = [
    { num: 'INV-202605-1124', date: '1 May 2026', total: isArrears?.amount || m, status: isArrears ? 'overdue' : 'paid' },
    { num: 'INV-202604-0998', date: '1 Apr 2026', total: m, status: 'paid' },
    { num: 'INV-202603-0871', date: '1 Mar 2026', total: m, status: 'paid' },
    { num: 'INV-202602-0744', date: '1 Feb 2026', total: m, status: 'paid' },
    { num: 'INV-202601-0617', date: '1 Jan 2026', total: m, status: 'paid' },
  ];
  return (
    <Card title="Invoices" padding={false} action={<Btn size="sm" kind="primary" icon="plus">New invoice</Btn>}>
      <table className="tbl">
        <thead><tr><th>Invoice #</th><th>Date</th><th className="num">Total</th><th>Status</th><th>Period</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.num}>
              <td className="mono" style={{ fontWeight: 600 }}>{r.num}</td>
              <td className="muted">{r.date}</td>
              <td className="num"><span className="muted" style={{fontWeight:500}}>R </span>{r.total}</td>
              <td>
                {r.status === 'paid' && <Badge tone="good" dot>Paid</Badge>}
                {r.status === 'overdue' && <Badge tone="bad" dot>Overdue · 7d</Badge>}
              </td>
              <td className="muted">May 2026 · {p.plan}m²</td>
              <td className="right">
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {r.status === 'overdue' && <Btn size="sm" kind="accent">Record payment</Btn>}
                  <Btn size="sm" kind="quiet" icon="eye" />
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

function Comms360({ p }) {
  return <Card padding={true}><Empty icon="inbox" title="See full comms in Inbox" sub="Click any conversation in the Inbox to see the full thread." /></Card>;
}

function Timeline360({ p, mode }) {
  const events = [
    { t: '14:32', d: 'today', text: 'AI replied to WhatsApp · "What are operating hours?"', kind: 'comms', bot: true },
    { t: '11:14', d: 'today', text: 'Door unlocked · Zone A · Rosebank', kind: 'door' },
    { t: '08:03', d: 'today', text: 'Door unlocked · Zone A · Rosebank', kind: 'door' },
    { t: '—',     d: 'yesterday', text: 'Bot resolved "share digital key" query', kind: 'comms', bot: true },
    { t: '—',     d: '3 days ago', text: 'Payment received · R 5 220 via Paystack', kind: 'money' },
    { t: '—',     d: '12 days ago', text: 'KYC re-verified · SumSub APPROVED', kind: 'kyc' },
    { t: '—',     d: '3 mo ago', text: 'Renewed subscription', kind: 'sub' },
    { t: '—',     d: 'Jan 2025', text: 'Customer created · welcome email sent', kind: 'lifecycle' },
  ];
  const iconFor = { comms: 'message', door: 'unlock', money: 'wallet', kyc: 'shield', sub: 'invoice', lifecycle: 'user' };
  return (
    <Card title="Full timeline" icon="history" padding={false}>
      <div style={{ padding: 18 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < events.length - 1 ? 14 : 0, position: 'relative' }}>
            {i < events.length - 1 && <div style={{ position: 'absolute', top: 28, left: 13, bottom: 0, width: 1, background: 'var(--ink-150)' }} />}
            <div style={{ width: 28, height: 28, borderRadius: 7, background: e.bot ? 'var(--ai-50)' : 'var(--ink-100)', color: e.bot ? 'var(--ai-700)' : 'var(--ink-600)', display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1 }}>
              <Icon name={iconFor[e.kind]} size={13} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 500 }}>{e.text}{e.bot && <span style={{ marginLeft: 6, color: 'var(--ai-700)', fontSize: 10, fontWeight: 700, letterSpacing: 0.04, textTransform: 'uppercase' }}>AI</span>}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{e.d}{e.t !== '—' ? ` · ${e.t}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Access360({ p }) {
  const events = [
    { t: 'today 14:18', who: 'Customer', door: 'Main entrance · Rosebank', method: 'NFC tap' },
    { t: 'today 14:19', who: 'Customer', door: 'Zone A · Aisle gate', method: 'Bluetooth' },
    { t: 'today 14:25', who: 'Customer', door: 'Unit ' + p.unit, method: 'Bluetooth' },
    { t: 'today 08:03', who: 'Customer', door: 'Main entrance · Rosebank', method: 'NFC tap' },
    { t: 'yesterday',   who: 'Megan Roberts (shared)', door: 'Unit ' + p.unit, method: 'Bluetooth · shared key' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>
      <Card title="Door access · last 7 days" icon="door" padding={false}>
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Door</th><th>Method</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td className="muted">{e.t}</td>
                <td>{e.who}</td>
                <td>{e.door}</td>
                <td className="muted">{e.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Digital keys" icon="lock">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <KeyRow name={`${p.first} ${p.last}`} role="Owner" />
          <KeyRow name="Megan Roberts" role="Shared · expires 28 May" />
          <Btn size="sm" kind="ghost" icon="plus">Share with someone</Btn>
        </div>
      </Card>
    </div>
  );
}

function KeyRow({ name, role }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: 'var(--ink-50)', borderRadius: 7 }}>
      <Avatar name={name} size="sm" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{role}</div>
      </div>
    </div>
  );
}

function Docs360() {
  const docs = [
    { name: 'Lease agreement.pdf',     size: '184 KB', date: '12 Jan 2025' },
    { name: 'ID document.pdf',         size: '512 KB', date: '12 Jan 2025' },
    { name: 'Proof of address.pdf',    size: '92 KB',  date: '12 Jan 2025' },
  ];
  return (
    <Card title="Documents" icon="paperclip" padding={false} action={<Btn size="sm" kind="primary" icon="plus">Upload</Btn>}>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
        <tbody>
          {docs.map(d => (
            <tr key={d.name}>
              <td><Icon name="paperclip" size={13} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--ink-400)' }} />{d.name}</td>
              <td className="muted">{d.size}</td>
              <td className="muted">{d.date}</td>
              <td className="right"><Btn size="sm" kind="ghost" icon="arrow-down">Download</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// helpers
function siteName(id) { const s = FXDATA.SITES.find(x => x.id === id); return s ? `${s.city} — ${s.name}` : id; }
function siteShort(id) { return FXDATA.SITES.find(s => s.id === id)?.short || '—'; }

function recentContactFor(p) {
  const opts = ['2m ago · WhatsApp', '17m ago · email', '1h ago · WhatsApp', '4h ago · email', '1d ago · chatbot', '3d ago · WhatsApp'];
  return opts[p.id.charCodeAt(p.id.length - 1) % opts.length];
}

function sampleComms(p) {
  return [
    { channel: 'whatsapp', text: '"How do I share my digital key with my partner?"', by: 'Customer → Bot replied', t: '34m ago', resolved: true },
    { channel: 'email',    text: 'Invoice INV-202604-0998 · payment received',        by: 'System', t: '3d ago' },
    { channel: 'whatsapp', text: '"What are your operating hours over the weekend?"', by: 'Customer → Bot replied', t: '5d ago', resolved: true },
    { channel: 'chat',     text: '"Can I extend my move-out by a week?"',             by: 'Customer → Bot replied', t: '12d ago', resolved: true },
  ];
}

window.CustomersScreen = CustomersScreen;
