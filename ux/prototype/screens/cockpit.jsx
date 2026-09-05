/* ============================================================
   Ops cockpit
   Home for Geir & Adam — today at a glance, AI's queue,
   devices state, and per-site heatmap.
   ============================================================ */

function CockpitScreen({ mode, onNav }) {
  const kpi = FXDATA.cockpitFor(mode);
  const aiTasks = FXDATA.aiTasksFor(mode);
  const devices = FXDATA.devicesFor(mode);
  const sites = FXDATA.SITES;

  const issues = devices.filter(d => d.status !== 'good');

  // Greeting
  const hours = new Date().getHours();
  const greet = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

  // generate per-site occupancy sparks (deterministic-ish)
  const sparkFor = (siteId) => {
    const seed = siteId.charCodeAt(0);
    const base = sites.find(s => s.id === siteId)?.occ || 0.8;
    return Array.from({length: 14}, (_, i) => base + Math.sin((seed + i) / 2.4) * 0.04 + (mode === 'crisis' && siteId === 'rivonia' ? -0.06 + i * 0.005 : 0));
  };

  return (
    <div data-screen-label="Ops cockpit">
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{greet}, Geir</h1>
          <div className="page-hd__sub">{summaryLine(mode, kpi)}</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="refresh">Refresh</Btn>
          <Btn kind="ghost" icon="calendar">Friday · 25 May 2026</Btn>
        </div>
      </div>

      {/* Mode-driven banner */}
      {mode === 'crisis' && (
        <div className="banner banner--bad" style={{ marginBottom: 18 }}>
          <Icon name="alert" size={16} />
          <span><b>Active incident:</b> Rivonia gateway unreachable · door access affected · AI has proposed 4 actions for your review</span>
          <button onClick={() => onNav('ai')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--bad-700)', fontWeight: 600, cursor: 'pointer', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            Review now <Icon name="arrow-right" size={13} />
          </button>
        </div>
      )}
      {mode === 'busy' && (
        <div className="banner banner--ai" style={{ marginBottom: 18 }}>
          <Icon name="sparkles" size={16} />
          <span>AI handled <b>47 customer queries</b> autonomously this morning · escalated <b>3</b> to you · {aiTasks.length} actions waiting for approval</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Monthly recurring" value={kpi.mrr.toLocaleString(FXTENANT.locale)} prefix={FXTENANT.symbol} delta={kpi.mrrDelta} sub="6 facilities · 842 active subs" />
        <Kpi label="Outstanding" value={kpi.outstanding.toLocaleString(FXTENANT.locale)} prefix={FXTENANT.symbol} tone={kpi.outstanding > 10000 ? 'bad' : null} sub={`${kpi.outsCount} customer${kpi.outsCount === 1 ? '' : 's'} in arrears`} />
        <Kpi label="Collected today" value={kpi.collectedToday.toLocaleString(FXTENANT.locale)} prefix={FXTENANT.symbol} tone="good" sub={`${kpi.paymentsToday} payments · ${kpi.paymentsFailed} failed`} />
        <Kpi label="Bot deflection" value={`${Math.round(kpi.deflection * 100)}%`} sub={`${kpi.botHandled} handled · ${kpi.botEscalated} escalated`} delta={mode === 'crisis' ? -18 : +3.2} />
      </div>

      {/* Body — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* AI proposals */}
          <Card
            title="AI proposes" icon="sparkles" tone="ai"
            count={aiTasks.length}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn size="sm" kind="ai" icon="check">Approve safe-list</Btn>
                <Btn size="sm" kind="ghost" onClick={() => onNav('ai')}>Activity log</Btn>
              </div>
            }
            padding={false}
          >
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiTasks.slice(0, mode === 'crisis' ? 4 : 3).map(t => <AiCard key={t.id} task={t} />)}
              {aiTasks.length > 3 && (
                <button onClick={() => onNav('ai')} style={{ background: 'transparent', border: '1px dashed var(--ai-100)', color: 'var(--ai-700)', padding: 11, borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={13} />
                  {aiTasks.length - (mode === 'crisis' ? 4 : 3)} more proposals · open AI activity
                  <Icon name="arrow-right" size={13} />
                </button>
              )}
            </div>
          </Card>

          {/* Facility heat strip */}
          <Card title="Facilities · live" icon="building" action={<Btn size="sm" kind="quiet" onClick={() => onNav('facilities')} iconAfter="arrow-right">Open</Btn>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {sites.map(s => {
                const siteIssues = issues.filter(d => d.site === s.id);
                const sev = siteIssues.find(d => d.status === 'bad') ? 'bad' : siteIssues.find(d => d.status === 'watch') ? 'watch' : 'good';
                return (
                  <div key={s.id} style={{ padding: 14, border: '1px solid var(--ink-150)', borderRadius: 10, background: 'white', cursor: 'pointer' }} onClick={() => onNav('facilities')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <SevDot status={sev} />
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{s.city}</div>
                      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.occ * 100)}%</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 8 }}>{s.name}</div>
                    <Spark data={sparkFor(s.id)} color={sev === 'bad' ? 'var(--bad-600)' : sev === 'watch' ? 'var(--watch-600)' : 'var(--good-600)'} height={28} width={200} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Devices snapshot */}
          <Card
            title="Devices & sensors" icon="sensor"
            count={`${kpi.devicesOnline}/${kpi.devicesTotal}`}
            subtitle="Auto-ping every 60s"
            action={<Btn size="sm" kind="quiet" onClick={() => onNav('devices')} iconAfter="arrow-right">Open</Btn>}
          >
            <div className="grid grid--4" style={{ marginBottom: 14, gap: 10 }}>
              <DeviceMini icon="check-circle" label="Online" value={kpi.devicesOnline} tone="good" />
              <DeviceMini icon="alert" label="Degraded" value={kpi.devicesDegraded} tone={kpi.devicesDegraded > 0 ? 'watch' : 'neutral'} />
              <DeviceMini icon="wifi" label="Offline" value={kpi.devicesOffline} tone={kpi.devicesOffline > 0 ? 'bad' : 'neutral'} />
              <DeviceMini icon="shield" label="Anomalies" value={mode === 'crisis' ? 1 : 0} tone={mode === 'crisis' ? 'bad' : 'neutral'} />
            </div>
            {issues.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--ink-150)', borderRadius: 8, overflow: 'hidden' }}>
                {issues.slice(0, 4).map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none', background: 'white' }}>
                    <SevDot status={d.status} />
                    <Icon name={deviceIcon(d.kind)} size={15} style={{ color: 'var(--ink-500)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{siteName(d.site)} · {d.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{d.note} · last ping {d.lastPing}</div>
                    </div>
                    <Btn size="sm" kind="ghost">Investigate</Btn>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--good-700)', fontSize: 12.5, fontWeight: 500, background: 'var(--good-50)', borderRadius: 8 }}>
                <Icon name="check-circle" size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                All systems nominal across 6 facilities.
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Today's schedule */}
          <Card title="Today's schedule" icon="calendar" count={FXDATA.SCHEDULE.length}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FXDATA.SCHEDULE.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none' }}>
                  <div style={{ width: 44, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--ink-900)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{s.time}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{kindLabel(s.kind)} · {s.who}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }} className="truncate">{FXDATA.SITES.find(x => x.id === s.site)?.city || ''} · {s.unit}</div>
                    {s.note && <div style={{ fontSize: 11, color: s.note.toLowerCase().includes('pending') ? 'var(--watch-700)' : 'var(--ink-500)', marginTop: 2 }}>{s.note}</div>}
                  </div>
                  {s.note?.toLowerCase().includes('pending') && <Badge tone="watch" dot>Action</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {/* Live ops feed */}
          <Card title="Live ops feed" icon="history" subtitle="Last hour">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {liveFeed(mode).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 30, fontSize: 10.5, color: 'var(--ink-400)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingTop: 2 }}>{e.t}</div>
                  <div style={{ width: 16, display: 'grid', placeItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                    <span className={`sev sev--${e.sev || 'good'}`} style={{ width: 6, height: 6, boxShadow: 'none' }} />
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--ink-800)' }}>{e.text}</span>
                    {e.bot && <span style={{ marginLeft: 6, color: 'var(--ai-700)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>AI</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DeviceMini({ icon, label, value, tone }) {
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

function deviceIcon(kind) {
  return ({ gateway: 'wifi', switch: 'route', door: 'door', camera: 'camera', electrical: 'zap', env: 'thermo' })[kind] || 'cpu';
}
function siteName(id) {
  const s = FXDATA.SITES.find(x => x.id === id);
  return s ? `${s.city} — ${s.name}` : id;
}
function kindLabel(kind) {
  return ({ 'move-in': 'Move-in', 'move-out': 'Move-out', tour: 'Tour' })[kind] || kind;
}
function summaryLine(mode, kpi) {
  if (mode === 'crisis') return `1 active incident · ${kpi.devicesOffline} devices offline · ${kpi.botEscalated} customer escalations to triage.`;
  if (mode === 'quiet') return 'All systems nominal. AI is handling routine traffic. Nothing urgent.';
  return `${kpi.moveInsToday} move-ins, ${kpi.moveOutsToday} move-out today · AI has ${FXDATA.aiTasksFor(mode).length} proposals waiting.`;
}

function liveFeed(mode) {
  const base = [
    { t: 'now', text: 'Anand Naidoo unlocked Rivonia · C-04', sev: 'good' },
    { t: '2m',  text: 'Drafted reply to Kerry van Wyk (WhatsApp)', sev: 'info', bot: true },
    { t: '4m',  text: 'Tinus Greyling · card declined "insufficient funds"', sev: 'watch' },
    { t: '8m',  text: 'Reservation paid · Marilet Theron · R959 · Eikestad 058', sev: 'good' },
    { t: '14m', text: 'Bot resolved "share digital key" query · Anand Naidoo', sev: 'info', bot: true },
    { t: '21m', text: 'Lead captured · Brenda Smith · 6m² Rivonia', sev: 'info' },
    { t: '34m', text: 'Pricing recalc complete · no changes', sev: 'good', bot: true },
  ];
  if (mode === 'crisis') {
    return [
      { t: 'now', text: 'Eikestad core switch unresponsive — failover initiated', sev: 'bad' },
      { t: '2m',  text: 'Drafted disruption notice for 23 Rivonia customers', sev: 'watch', bot: true },
      { t: '4m',  text: 'Megan Roberts: "I can\'t get into my unit!" (WhatsApp)', sev: 'bad' },
      ...base,
    ];
  }
  if (mode === 'quiet') return base.slice(0, 4);
  return base;
}

window.CockpitScreen = CockpitScreen;
