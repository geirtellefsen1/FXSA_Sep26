/* ============================================================
   Reports — tuned for Geir & Adam
   Money, occupancy, move-ins, bot deflection, anomalies, pricing.
   ============================================================ */

function ReportsScreen({ mode }) {
  return (
    <div data-screen-label="Reports">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Reports</h1>
          <div className="page-hd__sub">Numbers you and Adam check most · auto-delivered to email at 06:30 each day</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="calendar">May 2026</Btn>
          <Btn kind="ghost" icon="paperclip">Export PDF</Btn>
          <Btn kind="primary" icon="send">Email digest now</Btn>
        </div>
      </div>

      {/* Headline */}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="MRR" prefix={FXTENANT.symbol} value="218 450" sub="842 active subs" delta={4.2} />
        <Kpi label="Outstanding" prefix={FXTENANT.symbol} value="22 420" sub="9 customers" delta={-12} tone="good" />
        <Kpi label="Avg occupancy" value="84%" sub="6 sites" delta={1.8} />
        <Kpi label="Bot deflection" value="94%" sub="Lower load on you & Adam" delta={3.2} />
      </div>

      {/* Big charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card title="MRR · 12 months" icon="trending-up">
          <BarChart data={mrrSeries()} colors={['var(--navy-700)']} unit="R" />
        </Card>
        <Card title="Churn / new" icon="route">
          <div style={{ display: 'flex', gap: 12 }}>
            <BarChart small data={mrrSeries(6).map(x => Math.round(x.value / 5000))} colors={['var(--good-600)']} label="New" />
            <BarChart small data={[3, 4, 2, 5, 3, 2].map(x => x)} colors={['var(--bad-500, #ef4444)']} label="Churn" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 14, lineHeight: 1.6 }}>
            <div><b style={{ color: 'var(--good-700)' }}>+24 new</b> subscriptions this month</div>
            <div><b style={{ color: 'var(--bad-700)' }}>-3 churned</b> · 1 auction, 2 voluntary</div>
            <div>Net <b style={{ color: 'var(--ink-900)' }}>+21</b> · 2.5% growth</div>
          </div>
        </Card>
      </div>

      {/* Occupancy per site */}
      <Card title="Occupancy · per site · last 60 days" icon="building" padding={false}>
        <table className="tbl">
          <thead><tr><th>Site</th><th>Current</th><th>30-day trend</th><th className="num">Move-ins</th><th className="num">Move-outs</th><th className="num">Net</th><th className="num">MRR</th></tr></thead>
          <tbody>
            {FXDATA.SITES.map(s => {
              const movesIn = Math.floor(Math.random() * 8 + 3);
              const movesOut = Math.floor(Math.random() * 4 + 1);
              const net = movesIn - movesOut;
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--navy-50)', color: 'var(--navy-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10 }}>{s.short}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.city}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{s.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', color: s.occ < 0.7 ? 'var(--bad-700)' : s.occ < 0.85 ? 'var(--watch-700)' : 'var(--good-700)' }}>{Math.round(s.occ * 100)}%</span>
                      <span style={{ display: 'inline-block', width: 60, height: 5, background: 'var(--ink-100)', borderRadius: 3, position: 'relative' }}><span style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3, width: `${s.occ * 100}%`, background: s.occ < 0.7 ? 'var(--bad-600)' : s.occ < 0.85 ? 'var(--watch-600)' : 'var(--good-600)' }} /></span>
                    </div>
                  </td>
                  <td><Spark data={Array.from({ length: 30 }, (_, i) => s.occ + Math.sin(i / 3) * 0.04 + (i / 100))} color={s.occ < 0.7 ? 'var(--bad-600)' : 'var(--good-600)'} width={120} height={26} /></td>
                  <td className="num bold">{movesIn}</td>
                  <td className="num">{movesOut}</td>
                  <td className="num"><span style={{ color: net > 0 ? 'var(--good-700)' : 'var(--bad-700)', fontWeight: 600 }}>{net > 0 ? '+' : ''}{net}</span></td>
                  <td className="num"><span className="muted" style={{ fontWeight: 500 }}>R </span>{Math.round(s.units * s.occ * 180).toLocaleString(FXTENANT.locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Customer service + Anomalies row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <Card title="Customer service · this month" icon="bot">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <CsKpi big="412" lbl="Bot-handled queries" delta={+18} />
            <CsKpi big="14" lbl="Escalated to operator" delta={-22} good />
            <CsKpi big="96%" lbl="Resolution rate" delta={+1.4} />
            <CsKpi big="2.3m" lbl="Avg first-reply time" delta={-31} good />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', padding: 10, background: 'var(--ai-50)', borderRadius: 8, color: 'var(--ai-700)', fontWeight: 500 }}>
            <Icon name="sparkles" size={12} style={{ verticalAlign: -2, marginRight: 6 }} />
            By query type · Top: "How do I share my key?" (87), "What size do I need?" (62), "Operating hours?" (47), "How do I pay?" (38)
          </div>
        </Card>

        <Card title="Anomalies · this month" icon="shield">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnomalyRow lbl="Failed payments" big={47} pct="92% auto-recovered" tone="watch" />
            <AnomalyRow lbl="Door access failures" big={mode === 'crisis' ? 23 : 4} pct={mode === 'crisis' ? "Outage at Rivonia" : "All resolved < 1h"} tone={mode === 'crisis' ? 'bad' : 'good'} />
            <AnomalyRow lbl="KYC stuck > 24h" big={2} pct="AI chased · both resolved" tone="good" />
            <AnomalyRow lbl="Brute-force attempts" big={1} pct="Auto-locked + SMS" tone="watch" />
            <AnomalyRow lbl="Suspicious access" big={1} pct="Acknowledged" tone="watch" />
          </div>
        </Card>
      </div>

      {/* Saved reports */}
      <div style={{ marginTop: 18 }}>
        <Card title="Saved reports" icon="paperclip" subtitle="Geir's daily inbox" padding={false}>
          <table className="tbl">
            <thead><tr><th>Report</th><th>Schedule</th><th>Sent to</th><th>Last sent</th><th></th></tr></thead>
            <tbody>
              <ReportRow name="Morning ops digest" sched="Daily · 06:30" to="geir@flexistore.co.za, adam@flexistore.co.za" last="Today 06:30 ✓" />
              <ReportRow name="Weekly arrears review" sched="Mon · 09:00" to="geir + adam" last="Mon 09:00 ✓" />
              <ReportRow name="Monthly P&amp;L by site" sched="1st · 07:00" to="geir + bookkeeping" last="1 May 07:00 ✓" />
              <ReportRow name="Landlord payout statements" sched="Monthly · 5th" to="6 property owners" last="5 May 09:00 ✓" />
              <ReportRow name="AI agent performance" sched="Weekly · Fri" to="geir" last="Yesterday 17:00 ✓" />
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function BarChart({ data, colors, unit, label, small }) {
  // data: [{m: 'Jan', value: 100}, ...]
  const max = Math.max(...data.map(d => typeof d === 'number' ? d : d.value));
  const h = small ? 100 : 180;
  return (
    <div>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.06, marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: small ? 4 : 7, height: h, paddingTop: small ? 0 : 24, paddingBottom: small ? 0 : 22 }}>
        {data.map((d, i) => {
          const v = typeof d === 'number' ? d : d.value;
          const pct = v / max;
          const isLast = i === data.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
              {!small && isLast && (
                <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>
                  {unit}{Math.round(v / 1000)}k
                </span>
              )}
              <div style={{ width: '100%', background: isLast ? 'var(--navy-900)' : colors[0], borderRadius: '4px 4px 0 0', height: `${Math.max(4, pct * 100)}%`, minHeight: 4 }} />
              {!small && typeof d !== 'number' && (
                <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 6, position: 'absolute', bottom: 0 }}>{d.m}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mrrSeries(n = 12) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const vals = [142, 151, 162, 167, 172, 184, 188, 196, 203, 208, 213, 218];
  return months.slice(-n).map((m, i) => ({ m, value: vals.slice(-n)[i] * 1000 }));
}

function CsKpi({ big, lbl, delta, good }) {
  const isPositiveGood = delta > 0 ? !good : good;
  return (
    <div>
      <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>{big}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{lbl}</div>
      <div style={{ fontSize: 11, color: isPositiveGood ? 'var(--good-700)' : 'var(--ink-500)', fontWeight: 600, marginTop: 3 }}>
        <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={10} style={{ verticalAlign: -1 }} />
        {Math.abs(delta)}% vs last month
      </div>
    </div>
  );
}

function AnomalyRow({ lbl, big, pct, tone }) {
  const colors = { good: 'var(--good-700)', watch: 'var(--watch-700)', bad: 'var(--bad-700)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[tone] }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-800)', fontWeight: 500 }}>{lbl}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{pct}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: colors[tone] }}>{big}</div>
    </div>
  );
}

function ReportRow({ name, sched, to, last }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}><Icon name="paperclip" size={13} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--ink-400)' }} />{name}</td>
      <td className="muted">{sched}</td>
      <td className="muted">{to}</td>
      <td className="muted">{last}</td>
      <td className="right"><Btn size="sm" kind="quiet" icon="send">Send now</Btn></td>
    </tr>
  );
}

window.ReportsScreen = ReportsScreen;
