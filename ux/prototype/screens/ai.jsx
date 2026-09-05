/* ============================================================
   AI activity log
   Two columns: pending proposals (need approval) + everything
   the bot did autonomously today. Filterable.
   ============================================================ */

function AiScreen({ mode }) {
  const tasks = FXDATA.aiTasksFor(mode);
  const activity = FXDATA.aiActivityFor(mode);
  const [filter, setFilter] = React.useState('all');

  const kindFilters = [
    { id: 'all',     label: 'All' },
    { id: 'comms',   label: 'Communications' },
    { id: 'money',   label: 'Money' },
    { id: 'access',  label: 'Door / access' },
    { id: 'ops',     label: 'Ops / pricing' },
  ];

  const filteredActivity = activity.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'comms') return ['auto-reply', 'comms', 'reports'].includes(a.kind);
    if (filter === 'money') return ['payment', 'reminder'].includes(a.kind);
    if (filter === 'access') return ['doors', 'incident'].includes(a.kind);
    if (filter === 'ops') return ['pricing', 'kyc', 'lead'].includes(a.kind);
    return true;
  });

  // KPI numbers
  const kpis = {
    actions: activity.length + (mode === 'crisis' ? 12 : 38),
    deflection: mode === 'crisis' ? 73 : mode === 'quiet' ? 100 : 94,
    saved: mode === 'crisis' ? 142 : mode === 'quiet' ? 38 : 287,
    proposals: tasks.length,
  };

  return (
    <div data-screen-label="AI activity">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">AI activity</h1>
          <div className="page-hd__sub">Everything the AI agent has done today, plus actions waiting for your approval.</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="settings">Permissions</Btn>
          <Btn kind="ai" icon="sparkles">Configure agent</Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid--3" style={{ marginBottom: 18 }}>
        <Kpi label="Autonomous actions" value={kpis.actions} sub="Today · across all sites" delta={mode === 'crisis' ? -8 : 12} />
        <Kpi label="Deflection rate" value={`${kpis.deflection}%`} sub="Bot resolved vs. escalated" tone={kpis.deflection < 80 ? 'bad' : 'good'} />
        <Kpi label="Pending approval" value={kpis.proposals} sub={kpis.proposals > 0 ? 'Tap a card to approve · adjust · dismiss' : 'All caught up'} tone={kpis.proposals > 2 ? 'bad' : null} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 18 }}>
        {/* Proposals */}
        <Card title="Pending approval" icon="sparkles" tone="ai" count={tasks.length} action={tasks.length > 0 ? <Btn size="sm" kind="ai">Approve safe-list</Btn> : null}>
          {tasks.length === 0 ? (
            <Empty icon="check-circle" title="All clear" sub="AI has no proposals pending. It will surface new ones here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(t => <AiCard key={t.id} task={t} />)}
            </div>
          )}
        </Card>

        {/* Activity feed */}
        <Card
          title="Today's activity"
          icon="history"
          action={
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--ink-200)', fontSize: 12, background: 'white', color: 'var(--ink-700)', fontWeight: 500 }}
            >
              {kindFilters.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          }
          padding={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredActivity.map((a, i) => (
              <ActivityRow key={i} act={a} first={i === 0} />
            ))}
          </div>
        </Card>
      </div>

      {/* Agent rules / autonomy settings preview */}
      <div style={{ marginTop: 18 }}>
        <Card title="Agent autonomy" icon="shield" subtitle="What the AI is allowed to do without asking you" padding={false}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Mode</th>
                <th>Confidence threshold</th>
                <th>Last 7d</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AutoRow cap="Reply to routine WhatsApp / chat queries" mode="autonomous" thr={0.85} count="412 replies · 98% positive" />
              <AutoRow cap="Send 1st payment reminder (gentle)" mode="autonomous" thr={0.90} count="38 sent · 24 recovered" />
              <AutoRow cap="Send 2nd / 3rd reminder + retry card" mode="approve" thr={0.92} count="11 approved · 1 dismissed" />
              <AutoRow cap="Re-issue KYC link" mode="autonomous" thr={0.95} count="6 · 4 verified" />
              <AutoRow cap="Adjust listed price ± 10%" mode="approve" thr={0.85} count="3 approved · 1 adjusted" />
              <AutoRow cap="Remote-unlock customer's unit" mode="approve" thr={0.99} count="0 · all reach human first" />
              <AutoRow cap="Issue refund / credit ≤ R 1 000" mode="autonomous" thr={0.95} count="2 · both confirmed by Xero" />
              <AutoRow cap="Issue refund / credit > R 1 000" mode="approve" thr={1.0} count="1 approved · 0 dismissed" />
              <AutoRow cap="Cancel subscription" mode="approve" thr={1.0} count="0 — flagged for manual review" />
              <AutoRow cap="Dispatch technician to site" mode="approve" thr={0.80} count={mode === 'crisis' ? "1 pending approval" : "0"} highlight={mode === 'crisis'} />
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function ActivityRow({ act, first }) {
  const kindMap = {
    'auto-reply': { icon: 'message', color: 'var(--info-700)', bg: 'var(--info-50)' },
    'reminder':   { icon: 'mail',    color: 'var(--watch-700)', bg: 'var(--watch-50)' },
    'lead':       { icon: 'lead',    color: 'var(--good-700)', bg: 'var(--good-50)' },
    'pricing':    { icon: 'trending-up', color: 'var(--ai-700)', bg: 'var(--ai-50)' },
    'kyc':        { icon: 'shield',  color: 'var(--info-700)', bg: 'var(--info-50)' },
    'payment':    { icon: 'wallet',  color: 'var(--watch-700)', bg: 'var(--watch-50)' },
    'doors':      { icon: 'unlock',  color: 'var(--good-700)', bg: 'var(--good-50)' },
    'reports':    { icon: 'chart',   color: 'var(--ink-600)',  bg: 'var(--ink-100)' },
    'incident':   { icon: 'alert',   color: 'var(--bad-700)',  bg: 'var(--bad-50)' },
    'comms':      { icon: 'send',    color: 'var(--watch-700)', bg: 'var(--watch-50)' },
  };
  const k = kindMap[act.kind] || kindMap['auto-reply'];
  const sev = act.severity;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', borderTop: first ? 'none' : '1px solid var(--ink-100)', position: 'relative' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: sev === 'bad' ? 'var(--bad-50)' : sev === 'watch' ? 'var(--watch-50)' : k.bg, color: sev === 'bad' ? 'var(--bad-700)' : sev === 'watch' ? 'var(--watch-700)' : k.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={sev ? 'alert' : k.icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.3 }}>{act.desc}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{act.detail}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-400)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{act.time}</span>
        {act.conf != null && <span style={{ fontSize: 10, color: 'var(--ai-700)', fontWeight: 600, background: 'var(--ai-50)', padding: '1px 6px', borderRadius: 4 }}>{Math.round(act.conf * 100)}%</span>}
      </div>
    </div>
  );
}

function AutoRow({ cap, mode, thr, count, highlight }) {
  const isAuto = mode === 'autonomous';
  return (
    <tr style={highlight ? { background: 'var(--watch-50)' } : null}>
      <td style={{ fontWeight: 500 }}>{cap}</td>
      <td>
        <Badge tone={isAuto ? 'good' : 'watch'} dot>{isAuto ? 'Autonomous' : 'Asks operator'}</Badge>
      </td>
      <td className="num muted" style={{ fontVariantNumeric: 'tabular-nums' }}>≥ {thr}</td>
      <td className="muted" style={{ fontSize: 12 }}>{count}</td>
      <td className="right"><Btn size="sm" kind="quiet" icon="sliders">Adjust</Btn></td>
    </tr>
  );
}

window.AiScreen = AiScreen;
