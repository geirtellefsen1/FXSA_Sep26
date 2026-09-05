/* ============================================================
   Corporate accounts (B2B)
   One paid subscription, multiple units, multiple users.
   Admin user manages access to units. Customer service can add
   units and users; new users get WhatsApp + email login.
   ============================================================ */

function CorporateScreen({ mode, onNav }) {
  const [selectedId, setSelectedId] = React.useState(null);
  if (selectedId) return <CorporateDetail accountId={selectedId} onBack={() => setSelectedId(null)} mode={mode} />;

  const accounts = corporateAccounts();
  const totals = {
    accounts: accounts.length,
    units: accounts.reduce((a, x) => a + x.units.length, 0),
    users: accounts.reduce((a, x) => a + x.users.length, 0),
    mrr: accounts.reduce((a, x) => a + x.mrr, 0),
  };

  return (
    <div data-screen-label="Corporate">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Corporate accounts</h1>
          <div className="page-hd__sub">{totals.accounts} accounts · {totals.units} units · {totals.users} authorised users · consolidated billing</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="paperclip">Export</Btn>
          <Btn kind="primary" icon="plus">New corporate account</Btn>
        </div>
      </div>

      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Corporate MRR" prefix={FXTENANT.symbol} value={totals.mrr.toLocaleString(FXTENANT.locale)} sub={`${Math.round(totals.mrr / 218450 * 100)}% of total MRR`} delta={5.4} />
        <Kpi label="Active units" value={totals.units} sub={`Across ${totals.accounts} accounts`} />
        <Kpi label="Authorised users" value={totals.users} sub="Across all admins + members" />
        <Kpi label="Avg units / account" value={(totals.units / totals.accounts).toFixed(1)} sub="Dlamini Group is largest" />
      </div>

      <Card padding={false}>
        <div style={{ padding: '14px 18px 12px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--ink-150)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
            <input placeholder="Search by company, VAT, billing contact…" style={{ width: '100%', padding: '7px 11px 7px 32px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'white' }} />
          </div>
          <Btn size="sm" kind="ghost">All status <Icon name="chevron-down" size={11} /></Btn>
          <Btn size="sm" kind="ghost">Sort: MRR <Icon name="chevron-down" size={11} /></Btn>
        </div>

        <table className="tbl">
          <thead><tr><th>Company</th><th>Admin</th><th className="num">Units</th><th className="num">Users</th><th>Billing</th><th className="num">MRR</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(a.id)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: a.brandColor, color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>
                      {a.shortLogo}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{a.name}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{a.industry} · VAT {a.vat}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{a.admin.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{a.admin.email}</div>
                </td>
                <td className="num bold">{a.units.length}</td>
                <td className="num">{a.users.length}</td>
                <td className="muted" style={{ fontSize: 12 }}>{a.billingMode}</td>
                <td className="num bold">{FXTENANT.symbol} {a.mrr.toLocaleString(FXTENANT.locale)}</td>
                <td>
                  {a.status === 'active' && <Badge tone="good" dot>Active</Badge>}
                  {a.status === 'arrears' && <Badge tone="bad" dot>Arrears</Badge>}
                  {a.status === 'review' && <Badge tone="watch" dot>Renewal</Badge>}
                </td>
                <td className="right"><Icon name="chevron-right" size={14} style={{ color: 'var(--ink-400)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ——————————— Detail ———————————
function CorporateDetail({ accountId, onBack, mode }) {
  const a = corporateAccounts().find(x => x.id === accountId);
  const [tab, setTab] = React.useState('overview');
  const [addUnitOpen, setAddUnitOpen] = React.useState(false);
  const [addUserOpen, setAddUserOpen] = React.useState(false);

  if (!a) return null;

  return (
    <div data-screen-label="Corporate detail">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron-right" size={12} style={{ transform: 'rotate(180deg)' }} />Corporate
        </button>
        <span className="muted">/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{a.name}</span>
      </div>

      {/* Header card */}
      <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12, padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 11, background: a.brandColor, color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', flexShrink: 0 }}>{a.shortLogo}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <h2 style={{ fontSize: 24 }}>{a.name}</h2>
              {a.status === 'active' && <Badge tone="good" dot>Active</Badge>}
              {a.status === 'arrears' && <Badge tone="bad" dot>Arrears</Badge>}
              {a.status === 'review' && <Badge tone="watch" dot>Renewal due</Badge>}
              <Badge tone="info" icon="users">B2B · consolidated billing</Badge>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-500)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="user" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{a.id}</span>
              <span style={{ whiteSpace: 'nowrap' }}>VAT {a.vat}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="phone" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{a.phone}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="mail" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{a.email}</span>
              <span style={{ whiteSpace: 'nowrap' }}><Icon name="clock" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Customer since {a.since}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn kind="ghost" icon="message">Message admin</Btn>
            <Btn kind="ghost" icon="invoice">New invoice</Btn>
            <Btn kind="ghost" icon="more" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--ink-100)' }}>
          <MiniStat lbl="Monthly recurring" val={<><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{a.mrr.toLocaleString(FXTENANT.locale)}</>} sub={`${a.units.length} units · billed 1st`} />
          <MiniStat lbl="Active units" val={a.units.length} sub={`Across ${new Set(a.units.map(u => u.site)).size} sites`} />
          <MiniStat lbl="Authorised users" val={a.users.length} sub={`1 admin · ${a.users.length - 1} members`} />
          <MiniStat lbl="Discount" val={a.discount ? `${a.discount}% B2B` : '—'} sub={a.discount ? 'applied to every invoice' : 'No discount'} />
          <MiniStat lbl="Open balance" val={a.openBalance ? <span style={{ color: 'var(--bad-700)' }}>{FXTENANT.symbol} {a.openBalance.toLocaleString(FXTENANT.locale)}</span> : `${FXTENANT.symbol} 0`} sub={a.openBalance ? `${a.arrearsDays}d overdue` : 'All paid'} />
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'units',    label: 'Units', count: a.units.length },
          { id: 'users',    label: 'Users & access', count: a.users.length },
          { id: 'billing',  label: 'Billing & reconciliation' },
          { id: 'activity', label: 'Activity' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && <OverviewTab a={a} onAddUnit={() => setAddUnitOpen(true)} onAddUser={() => setAddUserOpen(true)} />}
      {tab === 'units'    && <UnitsTab a={a} onAddUnit={() => setAddUnitOpen(true)} />}
      {tab === 'users'    && <UsersTab a={a} onAddUser={() => setAddUserOpen(true)} />}
      {tab === 'billing'  && <BillingTab a={a} />}
      {tab === 'activity' && <ActivityTab a={a} />}

      {addUnitOpen && <AddUnitModal a={a} onClose={() => setAddUnitOpen(false)} />}
      {addUserOpen && <AddUserModal a={a} onClose={() => setAddUserOpen(false)} />}
    </div>
  );
}

function MiniStat({ lbl, val, sub }) {
  return (
    <div style={{ paddingRight: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{lbl}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--ink-900)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ——————————— Overview tab ———————————
function OverviewTab({ a, onAddUnit, onAddUser }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* AI summary */}
        <Card title="AI summary" icon="sparkles" tone="ai">
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-700)', margin: 0 }}>
            <b>{a.name}</b> is a {a.industry.toLowerCase()} customer on a {a.units.length}-unit consolidated subscription totalling <b>{FXTENANT.symbol} {a.mrr.toLocaleString(FXTENANT.locale)}/month</b>. They've paid <b>{a.invoiceHistoryPaid}/{a.invoiceHistoryTotal}</b> invoices on time. Admin <b>{a.admin.name}</b> has 2 standing access requests pending — {a.standingRequests}.
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Btn size="sm" kind="ai" icon="check">Approve standing requests</Btn>
            <Btn size="sm" kind="ghost" icon="sparkles">Ask AI about this account</Btn>
          </div>
        </Card>

        {/* Units snapshot */}
        <Card title="Units" count={a.units.length} icon="building" action={<Btn size="sm" kind="primary" icon="plus" onClick={onAddUnit}>Add unit</Btn>} padding={false}>
          <table className="tbl">
            <thead><tr><th>Unit</th><th>Site</th><th>Size</th><th>Users</th><th className="num">Monthly</th><th></th></tr></thead>
            <tbody>
              {a.units.slice(0, 5).map(u => (
                <tr key={u.id}>
                  <td><span className="mono" style={{ fontWeight: 600 }}>{u.id}</span>{u.label && <span className="muted" style={{ fontSize: 11.5, marginLeft: 7 }}>· {u.label}</span>}</td>
                  <td>{u.siteName}</td>
                  <td className="muted">{u.size} m²</td>
                  <td>{u.userCount} {u.userCount === 1 ? 'user' : 'users'}</td>
                  <td className="num"><span className="muted" style={{ fontWeight: 500 }}>R </span>{u.price.toLocaleString(FXTENANT.locale)}</td>
                  <td className="right"><Btn size="sm" kind="quiet" icon="chevron-right" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.units.length > 5 && <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid var(--ink-150)', fontSize: 12, color: 'var(--ink-500)' }}>+ {a.units.length - 5} more units</div>}
        </Card>

        {/* Users snapshot */}
        <Card title="Authorised users" count={a.users.length} icon="users" action={<Btn size="sm" kind="primary" icon="plus" onClick={onAddUser}>Add user</Btn>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {a.users.slice(0, 6).map(u => <UserChip key={u.id} user={u} units={a.units} />)}
          </div>
          {a.users.length > 6 && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-500)', textAlign: 'center' }}>+ {a.users.length - 6} more</div>}
        </Card>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title="Admin user" icon="shield">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
            <Avatar name={a.admin.name} size="lg" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{a.admin.name}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{a.admin.role}</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.7 }}>
            <div><Icon name="mail" size={11} style={{ verticalAlign: -1, marginRight: 5 }} />{a.admin.email}</div>
            <div><Icon name="phone" size={11} style={{ verticalAlign: -1, marginRight: 5 }} />{a.admin.phone}</div>
            <div><Icon name="check-circle" size={11} style={{ verticalAlign: -1, marginRight: 5, color: 'var(--good-600)' }} />Can add units, invite users, approve access</div>
          </div>
        </Card>

        <Card title="Customer portal" icon="globe">
          <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 10 }}>The admin can self-serve in two places — Customer Service can also do these on their behalf.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <PortalRow icon="globe" label="Web portal" sub="app.flexistore.co.za" />
            <PortalRow icon="whatsapp" label="WhatsApp business" sub="+27 21 49 00 922 · text 'admin'" />
          </div>
        </Card>

        <Card title="Quick actions" padding={false}>
          <div style={{ padding: '4px 0' }}>
            {[
              { i: 'plus',     l: 'Add unit',           onClick: onAddUnit, primary: true },
              { i: 'user',     l: 'Invite user',        onClick: onAddUser, primary: true },
              { i: 'invoice',  l: 'Generate quote' },
              { i: 'wallet',   l: 'Record EFT payment' },
              { i: 'paperclip',l: 'Upload signed lease' },
              { i: 'pin',      l: 'Add note (Cmd+N)' },
            ].map(act => (
              <button key={act.l} onClick={act.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: act.primary ? 'var(--ink-900)' : 'var(--ink-700)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Icon name={act.i} size={14} style={{ color: act.primary ? 'var(--orange-600)' : 'var(--ink-500)' }} />{act.l}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UserChip({ user, units }) {
  const accessText = user.allUnits ? `All ${units.length} units` : `${user.unitIds.length} unit${user.unitIds.length === 1 ? '' : 's'}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: 'var(--ink-50)', borderRadius: 8 }}>
      <Avatar name={user.name} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }} className="truncate">{user.name}{user.isAdmin && <span style={{ color: 'var(--orange-600)', marginLeft: 5 }}>★</span>}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{accessText} · {user.lastAccess}</div>
      </div>
    </div>
  );
}

function PortalRow({ icon, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 8, background: 'var(--ink-50)', borderRadius: 7 }}>
      <Icon name={icon} size={14} style={{ color: 'var(--ink-600)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }} className="mono">{sub}</div>
      </div>
    </div>
  );
}

// ——————————— Units tab ———————————
function UnitsTab({ a, onAddUnit }) {
  return (
    <Card title="Units on this account" count={a.units.length} icon="building" action={<Btn size="sm" kind="primary" icon="plus" onClick={onAddUnit}>Add unit</Btn>} padding={false}>
      <table className="tbl">
        <thead><tr><th>Unit</th><th>Internal label</th><th>Site</th><th>Size</th><th>Authorised users</th><th>Started</th><th className="num">Monthly</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {a.units.map(u => (
            <tr key={u.id}>
              <td><span className="mono" style={{ fontWeight: 600 }}>{u.id}</span></td>
              <td className="muted" style={{ fontSize: 12 }}>{u.label || '—'}</td>
              <td>{u.siteName}</td>
              <td>{u.size} m²</td>
              <td>
                <div style={{ display: 'flex', gap: -6 }}>
                  {u.users.slice(0, 3).map((uid, i) => {
                    const user = a.users.find(x => x.id === uid);
                    if (!user) return null;
                    return <div key={uid} style={{ marginLeft: i > 0 ? -6 : 0, border: '2px solid white', borderRadius: '50%' }}><Avatar name={user.name} size="sm" /></div>;
                  })}
                  {u.users.length > 3 && <span style={{ fontSize: 11, color: 'var(--ink-500)', marginLeft: 6, alignSelf: 'center' }}>+{u.users.length - 3}</span>}
                </div>
              </td>
              <td className="muted">{u.startedAt}</td>
              <td className="num"><span className="muted" style={{ fontWeight: 500 }}>R </span>{u.price.toLocaleString(FXTENANT.locale)}</td>
              <td><Badge tone="good" dot>Active</Badge></td>
              <td className="right">
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Btn size="sm" kind="ghost" icon="users">Allocate</Btn>
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

// ——————————— Users tab ———————————
function UsersTab({ a, onAddUser }) {
  return (
    <Card title="Users & access" count={a.users.length} icon="users" action={<Btn size="sm" kind="primary" icon="plus" onClick={onAddUser}>Invite user</Btn>} padding={false}>
      <table className="tbl">
        <thead><tr><th>User</th><th>Role</th><th>Access</th><th>Invited via</th><th>Last access</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {a.users.map(u => (
            <tr key={u.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Avatar name={u.name} size="sm" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}{u.isAdmin && <span style={{ color: 'var(--orange-600)', marginLeft: 6 }}>★ Admin</span>}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{u.email} · {u.phone}</div>
                  </div>
                </div>
              </td>
              <td>{u.isAdmin ? <Badge tone="info">Admin</Badge> : u.role === 'manager' ? <Badge tone="info">Manager</Badge> : <Badge tone="neutral">Member</Badge>}</td>
              <td>
                {u.allUnits ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--good-700)' }}>All {a.units.length} units</span> : (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {u.unitIds.slice(0, 3).map(uid => <span key={uid} className="mono" style={{ fontSize: 10.5, padding: '1px 6px', background: 'var(--ink-100)', borderRadius: 4 }}>{uid}</span>)}
                    {u.unitIds.length > 3 && <span style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>+{u.unitIds.length - 3}</span>}
                  </div>
                )}
              </td>
              <td className="muted" style={{ fontSize: 12 }}>{u.invitedVia}</td>
              <td className="muted">{u.lastAccess}</td>
              <td>
                {u.status === 'active'  && <Badge tone="good"  dot>Active</Badge>}
                {u.status === 'pending' && <Badge tone="watch" dot>Invite sent</Badge>}
                {u.status === 'revoked' && <Badge tone="bad"   dot>Revoked</Badge>}
              </td>
              <td className="right">
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Btn size="sm" kind="ghost" icon="sliders">Access</Btn>
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

// ——————————— Billing tab ———————————
function BillingTab({ a }) {
  const monthly = a.units.reduce((s, u) => s + u.price, 0);
  const discountAmt = Math.round(monthly * (a.discount || 0) / 100);
  const subtotal = monthly - discountAmt;
  const vat = Math.round(subtotal * 0.15);
  const total = subtotal + vat;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card title="Consolidated invoice · 1 May 2026" subtitle={`INV-${a.id}-202605 · Net 30 · auto-debit Paystack`} icon="invoice" action={<Btn size="sm" kind="ghost" icon="paperclip">Download PDF</Btn>}>
          <table className="tbl">
            <thead><tr><th>Unit</th><th>Site</th><th>Period</th><th>Internal cost code</th><th className="num">Line total</th></tr></thead>
            <tbody>
              {a.units.map(u => (
                <tr key={u.id}>
                  <td><span className="mono" style={{ fontWeight: 600 }}>{u.id}</span>{u.label && <span className="muted" style={{ fontSize: 11.5, marginLeft: 7 }}>· {u.label}</span>}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{u.siteName}</td>
                  <td className="muted">May 2026</td>
                  <td className="mono muted" style={{ fontSize: 11.5 }}>{u.costCode || '—'}</td>
                  <td className="num">{FXTENANT.symbol} {u.price.toLocaleString(FXTENANT.locale)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--ink-200)' }}>
                <td colSpan="4" style={{ textAlign: 'right', color: 'var(--ink-500)', fontSize: 12 }}>Subtotal</td>
                <td className="num">{FXTENANT.symbol} {monthly.toLocaleString(FXTENANT.locale)}</td>
              </tr>
              {a.discount > 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'right', color: 'var(--good-700)', fontSize: 12, fontWeight: 500 }}>B2B discount ({a.discount}%)</td>
                  <td className="num" style={{ color: 'var(--good-700)' }}>– {FXTENANT.symbol} {discountAmt.toLocaleString(FXTENANT.locale)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', color: 'var(--ink-500)', fontSize: 12 }}>VAT (15%)</td>
                <td className="num">{FXTENANT.symbol} {vat.toLocaleString(FXTENANT.locale)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--ink-200)' }}>
                <td colSpan="4" style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Total due</td>
                <td className="num" style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-900)' }}>{FXTENANT.symbol} {total.toLocaleString(FXTENANT.locale)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card title="Reconciliation · last 6 months" icon="check-circle">
          <table className="tbl">
            <thead><tr><th>Period</th><th>Invoiced</th><th>Received</th><th>Method</th><th>Reconciled</th><th>Δ</th></tr></thead>
            <tbody>
              {[
                { p: 'Apr 2026', inv: total, rec: total, m: 'Paystack auto', rec_ok: true },
                { p: 'Mar 2026', inv: total, rec: total, m: 'EFT · Dlamini Gp', rec_ok: true },
                { p: 'Feb 2026', inv: Math.round(total * 0.96), rec: Math.round(total * 0.96), m: 'Paystack auto', rec_ok: true },
                { p: 'Jan 2026', inv: Math.round(total * 0.96), rec: Math.round(total * 0.96), m: 'Paystack auto', rec_ok: true },
                { p: 'Dec 2025', inv: Math.round(total * 0.93), rec: Math.round(total * 0.93), m: 'EFT', rec_ok: true },
                { p: 'Nov 2025', inv: Math.round(total * 0.90), rec: Math.round(total * 0.90), m: 'Paystack auto', rec_ok: true },
              ].map((r, i) => (
                <tr key={i}>
                  <td>{r.p}</td>
                  <td className="num">{FXTENANT.symbol} {r.inv.toLocaleString(FXTENANT.locale)}</td>
                  <td className="num">{FXTENANT.symbol} {r.rec.toLocaleString(FXTENANT.locale)}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{r.m}</td>
                  <td>{r.rec_ok ? <Badge tone="good" dot>Matched</Badge> : <Badge tone="watch" dot>Review</Badge>}</td>
                  <td className="num"><span style={{ color: r.inv === r.rec ? 'var(--good-700)' : 'var(--bad-700)' }}>{r.inv === r.rec ? '0' : `R ${(r.rec - r.inv).toLocaleString(FXTENANT.locale)}`}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title="Billing setup" icon="wallet">
          <KVRow lbl="Billing mode" val={<><Badge tone="info">Consolidated</Badge> one invoice / month</>} />
          <KVRow lbl="Payment terms" val="Net 30" />
          <KVRow lbl="Payment method" val={<Badge tone="good" dot>Paystack recurring</Badge>} />
          <KVRow lbl="Billing day" val="1st of month" />
          <KVRow lbl="PO required" val={a.requiresPO ? 'Yes · attached' : 'No'} />
          <KVRow lbl="Cost codes per unit" val={a.costCodes ? <Badge tone="good" dot>Enabled</Badge> : '—'} />
          <KVRow lbl="Xero contact" val={<span className="mono">{a.id}-XR</span>} />
        </Card>
        <Card title="Documents" icon="paperclip" padding={false}>
          <table className="tbl">
            <tbody>
              <tr><td><Icon name="paperclip" size={12} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--ink-400)' }} />MSA · Dlamini Gp.pdf</td><td className="muted" style={{ fontSize: 11 }}>12 mo</td></tr>
              <tr><td><Icon name="paperclip" size={12} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--ink-400)' }} />PO 2026-Q2.pdf</td><td className="muted" style={{ fontSize: 11 }}>1 mo</td></tr>
              <tr><td><Icon name="paperclip" size={12} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--ink-400)' }} />VAT certificate</td><td className="muted" style={{ fontSize: 11 }}>—</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function KVRow({ lbl, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 12.5 }}>
      <span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>{lbl}</span>
      <span style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{val}</span>
    </div>
  );
}

// ——————————— Activity tab ———————————
function ActivityTab({ a }) {
  const items = [
    { t: '14:11 today', who: 'AI agent', text: `Approved standing access request · ${a.admin.name.split(' ')[0]} added Linda van der Walt to unit ${a.units[0]?.id}`, icon: 'sparkles', ai: true },
    { t: '11:30 today', who: a.admin.name, text: `Added new user · Karabo Phiri · WhatsApp invite sent`, icon: 'plus' },
    { t: '9:02 today',  who: a.admin.name, text: `Opened Customer Portal · viewed last 6 months invoices`, icon: 'globe' },
    { t: 'Yesterday',   who: 'AI agent', text: `Resolved query · "How do I share a unit with a colleague?"`, icon: 'message', ai: true },
    { t: '2 days ago',  who: 'System',  text: `Auto-debit · R ${(a.mrr * 1.15).toFixed(0)} settled via Paystack`, icon: 'wallet' },
    { t: '3 days ago',  who: 'Geir',    text: `Approved new unit ${a.units[0]?.id} · activation scheduled 1 May`, icon: 'check' },
    { t: '5 days ago',  who: a.admin.name, text: `Requested 3 more 10m² units at Bellville via WhatsApp`, icon: 'whatsapp' },
  ];
  return (
    <Card title="Account activity" icon="history" subtitle="All admin + user + AI actions, chronological">
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 13, padding: '12px 0', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none' }}>
          <div style={{ width: 80, fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 500, flexShrink: 0 }}>{it.t}</div>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: it.ai ? 'var(--ai-50)' : 'var(--ink-100)', color: it.ai ? 'var(--ai-700)' : 'var(--ink-600)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name={it.icon} size={12} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-800)' }}>{it.text}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{it.who}{it.ai && <span style={{ marginLeft: 6, color: 'var(--ai-700)', fontWeight: 700, letterSpacing: 0.04 }}>AI</span>}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ——————————— Modals ———————————
function AddUnitModal({ a, onClose }) {
  const [size, setSize] = React.useState('10');
  const [site, setSite] = React.useState(FXDATA.SITES[0]?.id);
  return (
    <Modal open onClose={onClose} title={`Add unit to ${a.name}`} subtitle="Customer service flow · can also be triggered by the admin via portal or WhatsApp" width={620}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" icon="check" onClick={onClose}>Reserve unit · send activation</Btn></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field2 label="Site" hint="AI suggests Bellville — 4 of admin's users live closest">
          <select value={site} onChange={(e) => setSite(e.target.value)} style={inputSt}>
            {FXDATA.SITES.map(s => <option key={s.id} value={s.id}>{s.city} — {s.name} · {Math.round(s.occ * 100)}% occupied</option>)}
          </select>
        </Field2>
        <Field2 label="Size">
          <div style={{ display: 'flex', gap: 6 }}>
            {['4', '8', '10', '16', '20'].map(s => (
              <button key={s} onClick={() => setSize(s)} style={{ flex: 1, padding: '10px 12px', border: size === s ? '1.5px solid var(--navy-700)' : '1px solid var(--ink-200)', background: size === s ? 'var(--navy-50)' : 'white', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{s} m²</button>
            ))}
          </div>
        </Field2>
        <Field2 label="Internal label / cost code (optional)" hint="Helps with admin reconciliation on the consolidated invoice">
          <input placeholder="e.g. Archive — Marketing 2024" style={inputSt} />
        </Field2>
        <Field2 label="Initial users with access" hint="Members invited will receive WhatsApp + email login. Skip to allocate later.">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {a.users.slice(0, 6).map(u => (
              <button key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', border: '1px solid var(--ink-200)', borderRadius: 999, background: 'white', cursor: 'pointer', fontSize: 12 }}>
                <Avatar name={u.name} size="sm" />{u.name}
              </button>
            ))}
          </div>
        </Field2>

        <div className="ai-card" style={{ padding: 12 }}>
          <div className="ai-card__icon" style={{ width: 26, height: 26 }}><Icon name="sparkles" size={13} /></div>
          <div className="ai-card__bd">
            <div className="ai-card__meta">AI · pricing &amp; availability</div>
            <div className="ai-card__title">3 × {size}m² units available · {FXTENANT.symbol} {(450 * Number(size)).toLocaleString(FXTENANT.locale)}/month each</div>
            <div className="ai-card__reason">B2B discount of {a.discount || 5}% applied automatically. Activation as soon as you reserve. Welcome WhatsApp + email goes out to selected users.</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AddUserModal({ a, onClose }) {
  const [name, setName] = React.useState('');
  const [scope, setScope] = React.useState('selected');
  return (
    <Modal open onClose={onClose} title={`Invite user to ${a.name}`} subtitle="They'll get WhatsApp + email with login details and any allocated unit keys" width={560}
      footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind="primary" icon="send" onClick={onClose}>Send invite · WhatsApp + email</Btn></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field2 label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Karabo Phiri" style={inputSt} />
        </Field2>
        <Field2 label="Mobile" hint="WhatsApp invite + 6-digit verification code sent here">
          <input placeholder="+27 …" style={inputSt} />
        </Field2>
        <Field2 label="Email" hint="Password setup link sent here">
          <input placeholder="user@company.co.za" style={inputSt} />
        </Field2>
        <Field2 label="Role">
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'member',  l: 'Member',  sub: 'Access only' },
              { id: 'manager', l: 'Manager', sub: 'Can grant access to allocated units' },
              { id: 'admin',   l: 'Admin',   sub: 'Add units · invite users · billing' },
            ].map(r => (
              <button key={r.id} style={{ flex: 1, padding: 11, border: '1px solid var(--ink-200)', background: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.l}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{r.sub}</div>
              </button>
            ))}
          </div>
        </Field2>
        <Field2 label="Unit access">
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={() => setScope('all')} style={{ flex: 1, padding: 9, border: scope === 'all' ? '1.5px solid var(--navy-700)' : '1px solid var(--ink-200)', background: scope === 'all' ? 'var(--navy-50)' : 'white', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>All {a.units.length} units</button>
            <button onClick={() => setScope('selected')} style={{ flex: 1, padding: 9, border: scope === 'selected' ? '1.5px solid var(--navy-700)' : '1px solid var(--ink-200)', background: scope === 'selected' ? 'var(--navy-50)' : 'white', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Selected units</button>
          </div>
          {scope === 'selected' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {a.units.slice(0, 8).map(u => (
                <button key={u.id} style={{ padding: '5px 11px', border: '1px solid var(--ink-200)', borderRadius: 999, background: 'white', cursor: 'pointer', fontSize: 12 }} className="mono">{u.id}</button>
              ))}
            </div>
          )}
        </Field2>

        <div style={{ padding: 12, background: 'var(--good-50)', borderRadius: 8, fontSize: 12, color: 'var(--good-700)', lineHeight: 1.5 }}>
          <Icon name="check-circle" size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          On send: WhatsApp from <b>+27 21 49 00 922</b> with one-time link, email with login + access map, and a calendar invite if {a.admin.name.split(' ')[0]} scheduled an onsite walkthrough.
        </div>
      </div>
    </Modal>
  );
}

function Field2({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)', display: 'block', marginBottom: 4 }}>{label}</label>
      {hint && <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 7 }}>{hint}</div>}
      {children}
    </div>
  );
}
const inputSt = { width: '100%', padding: '8px 11px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'white', color: 'var(--ink-800)' };

// ——————————— Data ———————————
function corporateAccounts() {
  return [
    {
      id: 'CORP-DLA',
      name: 'Dlamini Group',
      industry: 'Construction & supply',
      vat: '4280291108',
      brandColor: '#1F8A5B',
      shortLogo: 'DG',
      phone: '+27 83 661 1100',
      email: 'accounts@dlaminigp.co.za',
      since: 'Jun 2024',
      status: 'active',
      billingMode: 'Consolidated · Net 30',
      mrr: 23800,
      discount: 5,
      requiresPO: true,
      costCodes: true,
      invoiceHistoryPaid: 23, invoiceHistoryTotal: 23,
      standingRequests: '"Linda van der Walt to access unit A-22" + "Karabo Phiri to all units"',
      openBalance: 0, arrearsDays: 0,
      admin: { name: 'Sipho Dlamini', role: 'Operations Director · admin', email: 'sdlamini@dlaminigp.co.za', phone: '+27 83 661 1100' },
      users: [
        { id: 'U-1001', name: 'Sipho Dlamini',     email: 'sdlamini@dlaminigp.co.za',  phone: '+27 83 661 1100', isAdmin: true,  role: 'admin',   allUnits: true,  unitIds: [], status: 'active',  lastAccess: '14:11 today',   invitedVia: 'manual' },
        { id: 'U-1002', name: 'Linda van der Walt', email: 'linda@dlaminigp.co.za',    phone: '+27 82 990 1247', isAdmin: false, role: 'manager', allUnits: false, unitIds: ['BVL-A-22', 'BVL-A-23'], status: 'active', lastAccess: 'Yesterday',  invitedVia: 'WhatsApp + email' },
        { id: 'U-1003', name: 'Karabo Phiri',       email: 'karabo@dlaminigp.co.za',   phone: '+27 78 211 4451', isAdmin: false, role: 'member',  allUnits: true,  unitIds: [], status: 'pending', lastAccess: '—',             invitedVia: 'WhatsApp + email' },
        { id: 'U-1004', name: 'Themba Mokoena',     email: 'themba@dlaminigp.co.za',   phone: '+27 71 552 0067', isAdmin: false, role: 'member',  allUnits: false, unitIds: ['BVL-A-24'], status: 'active', lastAccess: '3d ago', invitedVia: 'WhatsApp' },
        { id: 'U-1005', name: 'Andile Khumalo',     email: 'andile@dlaminigp.co.za',   phone: '+27 84 902 7711', isAdmin: false, role: 'member',  allUnits: false, unitIds: ['RBK-D-14'], status: 'active', lastAccess: '1w ago', invitedVia: 'manual' },
        { id: 'U-1006', name: 'Pretty Nkosi',       email: 'pretty@dlaminigp.co.za',   phone: '+27 76 110 8822', isAdmin: false, role: 'manager', allUnits: false, unitIds: ['RBK-D-14', 'RBK-D-15', 'RBK-D-16'], status: 'active', lastAccess: '5h ago', invitedVia: 'portal' },
        { id: 'U-1007', name: 'Daniel Lekota',      email: 'daniel@dlaminigp.co.za',   phone: '+27 82 304 5566', isAdmin: false, role: 'member',  allUnits: false, unitIds: ['RIV-B-09'], status: 'revoked', lastAccess: '6w ago', invitedVia: 'manual' },
      ],
      units: [
        { id: 'BVL-A-22', label: 'Archive — Office', site: 'bellville', siteName: 'Bellville', size: 10, price: 1650, startedAt: '15 Jun 2024', userCount: 3, users: ['U-1001', 'U-1002', 'U-1003'], costCode: 'DG-OPS-01' },
        { id: 'BVL-A-23', label: 'Tools & PPE',      site: 'bellville', siteName: 'Bellville', size: 10, price: 1650, startedAt: '15 Jun 2024', userCount: 4, users: ['U-1001', 'U-1002', 'U-1003', 'U-1004'], costCode: 'DG-OPS-02' },
        { id: 'BVL-A-24', label: 'Site Bellville 04', site: 'bellville', siteName: 'Bellville', size: 10, price: 1650, startedAt: '4 Sep 2024',  userCount: 3, users: ['U-1001', 'U-1003', 'U-1004'], costCode: 'DG-PROJ-04' },
        { id: 'RBK-D-14', label: 'Sandton archive',  site: 'rosebank',  siteName: 'Rosebank',  size: 16, price: 3520, startedAt: '20 Nov 2024', userCount: 4, users: ['U-1001', 'U-1003', 'U-1005', 'U-1006'], costCode: 'DG-FIN-01' },
        { id: 'RBK-D-15', label: 'Sandton overflow', site: 'rosebank',  siteName: 'Rosebank',  size: 16, price: 3520, startedAt: '20 Nov 2024', userCount: 3, users: ['U-1001', 'U-1003', 'U-1006'], costCode: 'DG-FIN-02' },
        { id: 'RBK-D-16', label: 'Sandton — files',  site: 'rosebank',  siteName: 'Rosebank',  size: 12, price: 2640, startedAt: '20 Nov 2024', userCount: 3, users: ['U-1001', 'U-1003', 'U-1006'], costCode: 'DG-FIN-03' },
        { id: 'RIV-B-09', label: 'JHB — site office',site: 'rivonia',   siteName: 'Rivonia',   size: 16, price: 3120, startedAt: '2 Feb 2025',  userCount: 3, users: ['U-1001', 'U-1003', 'U-1007'], costCode: 'DG-PROJ-09' },
        { id: 'RIV-B-10', label: 'JHB — equipment',  site: 'rivonia',   siteName: 'Rivonia',   size: 20, price: 3900, startedAt: '2 Feb 2025',  userCount: 3, users: ['U-1001', 'U-1003', 'U-1004'], costCode: 'DG-PROJ-09' },
      ],
    },
    {
      id: 'CORP-OBE',
      name: 'OBE Logistics',
      industry: 'Logistics & courier',
      vat: '4980211204',
      brandColor: '#E8501A',
      shortLogo: 'OB',
      phone: '+27 11 783 4422',
      email: 'finance@obelogistics.co.za',
      since: 'Mar 2024',
      status: 'active',
      billingMode: 'Per-unit invoices',
      mrr: 14200,
      discount: 0,
      requiresPO: false,
      costCodes: false,
      invoiceHistoryPaid: 28, invoiceHistoryTotal: 28,
      standingRequests: 'none',
      openBalance: 0, arrearsDays: 0,
      admin: { name: 'Brenda Naidoo', role: 'Finance manager · admin', email: 'finance@obelogistics.co.za', phone: '+27 82 419 0006' },
      users: [
        { id: 'U-2001', name: 'Brenda Naidoo', email: 'finance@obelogistics.co.za', phone: '+27 82 419 0006', isAdmin: true, role: 'admin', allUnits: true, unitIds: [], status: 'active', lastAccess: '2h ago', invitedVia: 'manual' },
        { id: 'U-2002', name: 'Henk Smit',     email: 'henk@obelogistics.co.za',    phone: '+27 71 660 8800', isAdmin: false, role: 'manager', allUnits: true, unitIds: [], status: 'active', lastAccess: 'today', invitedVia: 'WhatsApp + email' },
        { id: 'U-2003', name: 'Mpho Khoza',    email: 'mpho@obelogistics.co.za',    phone: '+27 78 220 3344', isAdmin: false, role: 'member', allUnits: false, unitIds: ['MSH-C-06'], status: 'active', lastAccess: '4d ago', invitedVia: 'WhatsApp' },
        { id: 'U-2004', name: 'Daniel Adams',  email: 'daniel@obelogistics.co.za',  phone: '+27 84 119 0078', isAdmin: false, role: 'member', allUnits: false, unitIds: ['MSH-C-07'], status: 'active', lastAccess: '1w ago', invitedVia: 'portal' },
      ],
      units: [
        { id: 'MSH-C-05', label: 'JHB North hub', site: 'marshall', siteName: 'Marshalltown', size: 20, price: 4000, startedAt: '12 Mar 2024', userCount: 2, users: ['U-2001', 'U-2002'] },
        { id: 'MSH-C-06', label: 'Spare crates',  site: 'marshall', siteName: 'Marshalltown', size: 16, price: 3200, startedAt: '12 Mar 2024', userCount: 3, users: ['U-2001', 'U-2002', 'U-2003'] },
        { id: 'MSH-C-07', label: 'Returns',       site: 'marshall', siteName: 'Marshalltown', size: 12, price: 2400, startedAt: '4 Aug 2024',  userCount: 3, users: ['U-2001', 'U-2002', 'U-2004'] },
        { id: 'RBK-E-08', label: 'Sandton hub',   site: 'rosebank', siteName: 'Rosebank',     size: 20, price: 4600, startedAt: '15 Oct 2024', userCount: 2, users: ['U-2001', 'U-2002'] },
      ],
    },
    {
      id: 'CORP-WSG',
      name: 'Western Cape Gallery',
      industry: 'Arts & culture',
      vat: '4720011907',
      brandColor: '#7A5AE0',
      shortLogo: 'WG',
      phone: '+27 21 880 3322',
      email: 'ops@wcgallery.co.za',
      since: 'Aug 2025',
      status: 'review',
      billingMode: 'Consolidated · Net 30',
      mrr: 8400,
      discount: 5,
      requiresPO: false,
      costCodes: true,
      invoiceHistoryPaid: 9, invoiceHistoryTotal: 9,
      standingRequests: 'none',
      openBalance: 0, arrearsDays: 0,
      admin: { name: 'Mariska Botha', role: 'Curator · admin', email: 'mariska@wcgallery.co.za', phone: '+27 82 661 4488' },
      users: [
        { id: 'U-3001', name: 'Mariska Botha',    email: 'mariska@wcgallery.co.za', phone: '+27 82 661 4488', isAdmin: true, role: 'admin', allUnits: true, unitIds: [], status: 'active', lastAccess: 'today', invitedVia: 'manual' },
        { id: 'U-3002', name: 'Johan Greyling',   email: 'johan@wcgallery.co.za',   phone: '+27 84 992 1100', isAdmin: false, role: 'manager', allUnits: true, unitIds: [], status: 'active', lastAccess: 'today', invitedVia: 'WhatsApp + email' },
        { id: 'U-3003', name: 'Lisa Goldberg',    email: 'lisa@wcgallery.co.za',    phone: '+27 71 442 9988', isAdmin: false, role: 'member', allUnits: false, unitIds: ['EIK-V-01'], status: 'active', lastAccess: '6d ago', invitedVia: 'portal' },
      ],
      units: [
        { id: 'EIK-V-01', label: 'Climate vault A', site: 'eikestad', siteName: 'Eikestad Mall', size: 12, price: 4200, startedAt: '12 Aug 2025', userCount: 3, users: ['U-3001', 'U-3002', 'U-3003'], costCode: 'WG-PERM' },
        { id: 'EIK-V-02', label: 'Climate vault B', site: 'eikestad', siteName: 'Eikestad Mall', size: 12, price: 4200, startedAt: '12 Aug 2025', userCount: 2, users: ['U-3001', 'U-3002'],            costCode: 'WG-ROTATE' },
      ],
    },
    {
      id: 'CORP-FNB',
      name: 'Fynbos Wines',
      industry: 'Beverages & food',
      vat: '4901102245',
      brandColor: '#1A3C5E',
      shortLogo: 'FW',
      phone: '+27 21 880 1100',
      email: 'jp@fynboswines.co.za',
      since: 'Jan 2025',
      status: 'arrears',
      billingMode: 'Per-unit invoices',
      mrr: 6800,
      discount: 0,
      requiresPO: false,
      costCodes: false,
      invoiceHistoryPaid: 4, invoiceHistoryTotal: 5,
      standingRequests: 'admin asked re payment terms',
      openBalance: 6800, arrearsDays: 12,
      admin: { name: 'JP Strydom', role: 'Owner · admin', email: 'jp@fynboswines.co.za', phone: '+27 82 110 4477' },
      users: [
        { id: 'U-4001', name: 'JP Strydom',     email: 'jp@fynboswines.co.za',   phone: '+27 82 110 4477', isAdmin: true, role: 'admin', allUnits: true, unitIds: [], status: 'active', lastAccess: '2d ago', invitedVia: 'manual' },
        { id: 'U-4002', name: 'Marlie Strydom', email: 'marlie@fynboswines.co.za', phone: '+27 71 901 3322', isAdmin: false, role: 'manager', allUnits: true, unitIds: [], status: 'active', lastAccess: '4d ago', invitedVia: 'WhatsApp' },
      ],
      units: [
        { id: 'CLR-A-04', label: 'Reserve vintages', site: 'cellars', siteName: 'The Cellars (Paarl)', size: 20, price: 3400, startedAt: '4 Jan 2025', userCount: 2, users: ['U-4001', 'U-4002'] },
        { id: 'CLR-A-05', label: 'Bottling supplies', site: 'cellars', siteName: 'The Cellars (Paarl)', size: 20, price: 3400, startedAt: '4 Jan 2025', userCount: 2, users: ['U-4001', 'U-4002'] },
      ],
    },
  ];
}

window.CorporateScreen = CorporateScreen;
