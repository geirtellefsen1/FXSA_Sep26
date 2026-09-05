/* ============================================================
   Arrears & collections + Auctions (iBidOnStorage)
   Tab 1: open arrears cases
   Tab 2: auction pipeline — units > threshold days overdue
   Tab 3: settings — threshold, notice periods, reserves
   ============================================================ */

function ArrearsScreen({ mode, onNav }) {
  const [tab, setTab] = React.useState('cases');
  const [auctionOpen, setAuctionOpen] = React.useState(null);

  const auctions = auctionItems(mode);
  const openAuctions = auctions.filter(a => a.stage !== 'closed').length;

  return (
    <div data-screen-label="Arrears">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Arrears &amp; collections</h1>
          <div className="page-hd__sub">Automated dunning · 90-day auction threshold · iBidOnStorage integration enabled</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="paperclip">Export aging report</Btn>
          <Btn kind="primary" icon="send">Run dunning batch</Btn>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'cases',    label: 'Open arrears',  count: FXDATA.ARREARS.length },
          { id: 'auction',  label: 'Auction pipeline', count: openAuctions },
          { id: 'settings', label: 'Settings' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'cases'    && <CasesTab mode={mode} />}
      {tab === 'auction'  && <AuctionTab auctions={auctions} onOpen={setAuctionOpen} />}
      {tab === 'settings' && <SettingsTab />}

      {auctionOpen && <AuctionDetailModal auction={auctionOpen} onClose={() => setAuctionOpen(null)} />}
    </div>
  );
}

// ——————————— Cases tab (existing) ———————————
function CasesTab({ mode }) {
  const arrears = FXDATA.ARREARS;

  return (
    <>
      {/* AI summary */}
      <div className="ai-card" style={{ marginBottom: 18 }}>
        <div className="ai-card__icon"><Icon name="sparkles" size={15} /></div>
        <div className="ai-card__bd">
          <div className="ai-card__meta">AI summary</div>
          <div className="ai-card__title">3 customers can recover this week with a single WhatsApp nudge</div>
          <div className="ai-card__reason">Based on prior patterns, <b>Tinus Greyling, Cobus du Plessis</b> and <b>Asha Patel</b> have a 64%+ chance of paying within 24h of a personalised reminder. <b>Pieter Botha</b> needs a phone call — automated nudges have failed twice. <b>Anand Naidoo</b> is on a payment plan, no action needed.</div>
          <div className="ai-card__actions">
            <Btn size="sm" kind="ai" icon="send">Approve · send 3 WhatsApps</Btn>
            <Btn size="sm" kind="ghost" icon="phone">Book call · Pieter Botha</Btn>
          </div>
        </div>
      </div>

      {/* Aging strip */}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <AgeBucket label="0–30 days" tone="watch" count={5} amount={15700} />
        <AgeBucket label="31–60 days" tone="bad" count={0} amount={0} />
        <AgeBucket label="61–90 days · pre-auction" tone="bad" count={1} amount={6800} />
        <AgeBucket label="90+ days · auction" tone="bad" count={2} amount={14250} />
      </div>

      <Card title="Open arrears cases" count={arrears.length} icon="alert" padding={false}>
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Site · Unit</th><th className="num">Amount</th><th>Days overdue</th><th>Last touch</th><th>Stage</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {arrears.map(a => {
              const p = FXDATA.PEOPLE_BY_ID[a.customerId];
              return (
                <tr key={a.customerId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar name={`${p.first} ${p.last}`} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.first} {p.last}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{({ rivonia: 'Rivonia', rosebank: 'Rosebank', eikestad: 'Eikestad', bellville: 'Bellville', rembrandt: 'Paarl', riverside: 'Riverside' })[p.site]} · <span className="mono">{p.unit}</span></td>
                  <td className="num bold" style={{ color: 'var(--bad-700)' }}><span className="muted" style={{ fontWeight: 500 }}>R </span>{a.amount.toLocaleString(FXTENANT.locale)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: a.days > 60 ? 'var(--bad-700)' : a.days > 14 ? 'var(--bad-700)' : 'var(--watch-700)' }}>{a.days}d</span>
                      <span style={{ display: 'inline-block', width: 36, height: 5, background: 'var(--ink-100)', borderRadius: 3, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3, width: `${Math.min(100, a.days / 90 * 100)}%`, background: a.days > 60 ? 'var(--bad-600)' : a.days > 14 ? 'var(--bad-600)' : 'var(--watch-600)' }} />
                      </span>
                    </div>
                  </td>
                  <td className="muted">{a.attempts}× contact · last 4h ago</td>
                  <td>
                    {a.stage === 'gentle' && <Badge tone="watch">Gentle reminder</Badge>}
                    {a.stage === 'firm' && <Badge tone="bad">Firm warning</Badge>}
                    {a.stage === 'arranged' && <Badge tone="info">Payment plan</Badge>}
                  </td>
                  <td>
                    {a.status === 'active' && <Badge tone="watch" dot>Active</Badge>}
                    {a.status === 'arranged' && <Badge tone="good" dot>Arranged</Badge>}
                  </td>
                  <td className="right">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Btn size="sm" kind="ai" icon="send">AI reminder</Btn>
                      {a.days >= 60 && <Btn size="sm" kind="ghost" icon="flag">Auction</Btn>}
                      <Btn size="sm" kind="quiet" icon="user">Open</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function AgeBucket({ label, tone, count, amount }) {
  const colors = { watch: 'var(--watch-700)', bad: 'var(--bad-700)', good: 'var(--good-700)' };
  return (
    <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[tone] }} />
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', color: count > 0 ? colors[tone] : 'var(--ink-700)' }}>
        <span style={{ color: 'var(--ink-500)', fontWeight: 500, marginRight: 2, fontSize: 18 }}>{FXTENANT.symbol}</span>{amount.toLocaleString(FXTENANT.locale)}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{count} {count === 1 ? 'customer' : 'customers'}</div>
    </div>
  );
}

// ——————————— Auction tab ———————————
function AuctionTab({ auctions, onOpen }) {
  const stages = [
    { id: 'at-risk',   label: 'At risk',          sub: '60–89 days',  tone: 'watch' },
    { id: 'notice',    label: 'Legal notice',     sub: '14-day final warning', tone: 'bad' },
    { id: 'inventory', label: 'Photo inventory',  sub: 'Awaiting site visit', tone: 'info' },
    { id: 'listed',    label: 'Live on iBid',     sub: 'Auctioning now', tone: 'info' },
    { id: 'closing',   label: 'Soft close',       sub: 'Ends < 1h',     tone: 'bad' },
    { id: 'closed',    label: 'Closed',           sub: 'Sold / unsold', tone: 'neutral' },
  ];

  // KPIs
  const ytd = {
    units: 14,
    recovered: 187_400,
    avgClose: 3.2,
    successRate: 0.86,
  };

  return (
    <>
      {/* iBid status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'linear-gradient(135deg, #2C9CDB, #1E72B8)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '-0.02em' }}>iB</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>iBidOnStorage SA · connected</div>
            <Badge tone="good" dot>API live</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>Seller account: <span className="mono">flexistore-sa</span> · 9 246 registered bidders · soft-close +2min · 17.5% buyer's premium</div>
        </div>
        <Btn size="sm" kind="ghost" icon="globe">Open in iBid</Btn>
        <Btn size="sm" kind="ghost" icon="history">API logs</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Units auctioned YTD" value={ytd.units} sub="Across all sites" />
        <Kpi label="Recovered" prefix={FXTENANT.symbol} value={ytd.recovered.toLocaleString(FXTENANT.locale)} sub="Arrears + buyer's premium share" tone="good" />
        <Kpi label="Avg close time" value={`${ytd.avgClose} days`} sub="List → sold" />
        <Kpi label="Sale rate" value={`${Math.round(ytd.successRate * 100)}%`} sub={`${Math.round((1 - ytd.successRate) * ytd.units)} unsold relist`} delta={6} />
      </div>

      {/* AI summary */}
      <div className="ai-card" style={{ marginBottom: 18 }}>
        <div className="ai-card__icon"><Icon name="sparkles" size={15} /></div>
        <div className="ai-card__bd">
          <div className="ai-card__meta">AI · pipeline coach</div>
          <div className="ai-card__title">2 units crossed 90 days today · 1 already inventoried &amp; ready to list</div>
          <div className="ai-card__reason">Tinus Greyling (Rosebank · D-08) is at <b>day 90</b> — legal notice expires tomorrow. Photos uploaded, inventory description drafted, reserve price <b>R 3 200</b> suggested based on previous sales of comparable 5m² units at similar sites. Want me to push to iBid?</div>
          <div className="ai-card__actions">
            <Btn size="sm" kind="ai" icon="send">Approve · list on iBid</Btn>
            <Btn size="sm" kind="ghost">Review first</Btn>
          </div>
        </div>
      </div>

      {/* Pipeline as horizontal lanes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
        {stages.map(s => {
          const items = auctions.filter(a => a.stage === s.id);
          const colors = { watch: 'var(--watch-50)', bad: 'var(--bad-50)', info: 'var(--info-50)', neutral: 'var(--ink-50)' };
          const fg = { watch: 'var(--watch-700)', bad: 'var(--bad-700)', info: 'var(--info-700)', neutral: 'var(--ink-700)' };
          return (
            <div key={s.id} style={{ background: colors[s.tone], borderRadius: 10, padding: 10, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '2px 4px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: fg[s.tone] }}>{s.label}</div>
                <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{items.length}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginBottom: 9, padding: '0 4px' }}>{s.sub}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                {items.length === 0 ? (
                  <div style={{ padding: '20px 6px', textAlign: 'center', fontSize: 11, color: 'var(--ink-400)' }}>—</div>
                ) : items.map(a => <AuctionCard key={a.id} a={a} onOpen={() => onOpen(a)} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed history */}
      <Card title="Recently closed" icon="history" padding={false}>
        <table className="tbl">
          <thead><tr><th>Unit</th><th>Customer</th><th>Listed</th><th>Closed</th><th className="num">Reserve</th><th className="num">Sold for</th><th className="num">Recovered</th><th>Winner</th><th></th></tr></thead>
          <tbody>
            {auctions.filter(a => a.stage === 'closed').map(a => (
              <tr key={a.id}>
                <td><span className="mono" style={{ fontWeight: 600 }}>{a.unit}</span> · <span className="muted">{a.siteName}</span></td>
                <td>{a.customer}</td>
                <td className="muted">{a.listedAt}</td>
                <td className="muted">{a.closedAt}</td>
                <td className="num">{FXTENANT.symbol} {a.reserve.toLocaleString(FXTENANT.locale)}</td>
                <td className="num bold">{a.sold ? <span style={{ color: 'var(--good-700)' }}>{FXTENANT.symbol} {a.soldFor.toLocaleString(FXTENANT.locale)}</span> : <span className="muted">—</span>}</td>
                <td className="num">{a.sold ? <span>{FXTENANT.symbol} {Math.round(a.soldFor * 0.825).toLocaleString(FXTENANT.locale)}</span> : <span className="muted">unsold</span>}</td>
                <td>{a.winner ? <span style={{ fontWeight: 500 }}>{a.winner}</span> : <span className="muted">—</span>}</td>
                <td className="right"><Btn size="sm" kind="quiet">Report</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function AuctionCard({ a, onOpen }) {
  return (
    <div onClick={onOpen} style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 7, padding: 10, cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-300)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ink-150)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-900)' }}>{a.unit}</span>
        <span style={{ fontSize: 10, color: 'var(--ink-400)' }}>·</span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>{a.siteShort}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-700)', marginBottom: 6, lineHeight: 1.3 }}>{a.customer}</div>
      {a.stage === 'at-risk' && <div style={{ fontSize: 11, color: 'var(--watch-700)', fontWeight: 600 }}><Icon name="clock" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{a.daysOverdue}d overdue</div>}
      {a.stage === 'notice' && <div style={{ fontSize: 11, color: 'var(--bad-700)', fontWeight: 600 }}><Icon name="alert" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />Notice · {a.noticeExpires}</div>}
      {a.stage === 'inventory' && <div style={{ fontSize: 11, color: 'var(--info-700)', fontWeight: 600 }}><Icon name="camera" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{a.photos || 0} photos</div>}
      {a.stage === 'listed' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--info-700)', fontWeight: 600 }}><Icon name="globe" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{FXTENANT.symbol} {a.topBid.toLocaleString(FXTENANT.locale)} · {a.bidCount} bids</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>Ends {a.endsIn}</div>
        </div>
      )}
      {a.stage === 'closing' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--bad-700)', fontWeight: 700 }}><Icon name="alert" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{FXTENANT.symbol} {a.topBid.toLocaleString(FXTENANT.locale)} · soft-close</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>Ends in {a.endsIn}</div>
        </div>
      )}
    </div>
  );
}

// ——————————— Auction detail modal ———————————
function AuctionDetailModal({ auction, onClose }) {
  const [tab, setTab] = React.useState('overview');
  return (
    <Modal open onClose={onClose} title={`Auction · ${auction.unit}`} subtitle={`${auction.siteName} · ${auction.customer} · ${auction.daysOverdue}d overdue · R ${auction.amount.toLocaleString(FXTENANT.locale)} owed`} width={920}>
      <Tabs
        tabs={[
          { id: 'overview',  label: 'Overview' },
          { id: 'inventory', label: 'Inventory & photos' },
          { id: 'listing',   label: 'iBid listing' },
          { id: 'bids',      label: 'Bids', count: auction.bidCount || 0 },
          { id: 'handover',  label: 'Key handover' },
          { id: 'legal',     label: 'Legal trail' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'overview'  && <AuctionOverview a={auction} />}
      {tab === 'inventory' && <AuctionInventory a={auction} />}
      {tab === 'listing'   && <AuctionListing a={auction} />}
      {tab === 'bids'      && <AuctionBids a={auction} />}
      {tab === 'handover'  && <AuctionHandover a={auction} />}
      {tab === 'legal'     && <AuctionLegal a={auction} />}
    </Modal>
  );
}

function AuctionOverview({ a }) {
  // Timeline of stages
  const stages = [
    { id: 'arrears',   label: 'Arrears started',     date: a.arrearsStart,  done: true },
    { id: 'reminders', label: 'Dunning reminders',   date: 'Days 7, 14, 30', done: true },
    { id: 'firm',      label: 'Firm warning · access revoked', date: 'Day 60', done: a.daysOverdue >= 60 },
    { id: 'legal',     label: 'Legal notice · 14-day final',   date: a.noticeAt || '—', done: ['notice','inventory','listed','closing','closed'].includes(a.stage) },
    { id: 'inv',       label: 'Site visit · inventory photos', date: a.inventoryAt || 'pending', done: ['inventory','listed','closing','closed'].includes(a.stage) },
    { id: 'list',      label: 'Listed on iBidOnStorage',       date: a.listedAt || 'pending', done: ['listed','closing','closed'].includes(a.stage) },
    { id: 'close',     label: 'Auction closed',                date: a.closedAt || 'pending', done: a.stage === 'closed' },
    { id: 'hand',      label: 'Key transferred to winner',     date: a.handoverAt || 'pending', done: !!a.handoverAt },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      <Card title="Lifecycle" icon="history">
        <div style={{ paddingLeft: 4 }}>
          {stages.map((st, i) => (
            <div key={st.id} style={{ display: 'flex', gap: 12, paddingBottom: i < stages.length - 1 ? 14 : 0, position: 'relative' }}>
              {i < stages.length - 1 && <div style={{ position: 'absolute', top: 22, left: 9, bottom: 0, width: 2, background: stages[i + 1].done ? 'var(--good-200, #B7DBC6)' : 'var(--ink-150)' }} />}
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: st.done ? 'var(--good-600)' : 'var(--ink-150)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1 }}>
                {st.done && <Icon name="check" size={11} />}
              </div>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: st.done ? 'var(--ink-900)' : 'var(--ink-500)' }}>{st.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{st.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title="Actions" padding={false}>
          <div style={{ padding: '4px 0' }}>
            {auctionActions(a).map(act => (
              <button key={act.l} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: act.danger ? 'var(--bad-700)' : act.primary ? 'var(--ai-700)' : 'var(--ink-700)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Icon name={act.i} size={14} style={{ color: act.danger ? 'var(--bad-600)' : act.primary ? 'var(--ai-600)' : 'var(--ink-500)' }} />{act.l}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Pause / cancel">
          <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 10 }}>If the customer pays before close, iBid auto-pauses (per their soft-stop rule). You can also force a stop here.</div>
          <Btn size="sm" kind="ghost" icon="x">Cancel auction · customer paid</Btn>
        </Card>
      </div>
    </div>
  );
}

function AuctionInventory({ a }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title="Photos" icon="camera" subtitle="Uploaded by staff during site visit · stored in DO Spaces · sent to iBid">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Array.from({ length: a.photos || 6 }, (_, i) => (
              <div key={i} style={{ aspectRatio: '4/3', background: `linear-gradient(135deg, hsl(${30 + i * 35}, 12%, ${78 - i * 3}%), hsl(${30 + i * 35}, 10%, ${68 - i * 2}%))`, borderRadius: 7, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(0,0,0,0.4)' }}>
                  <Icon name="camera" size={20} />
                </div>
                <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 9, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>IMG_{String(i + 1).padStart(3, '0')}.JPG</div>
              </div>
            ))}
            <div style={{ aspectRatio: '4/3', border: '2px dashed var(--ink-200)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 5, color: 'var(--ink-500)', cursor: 'pointer' }}>
              <Icon name="plus" size={18} />
              <span style={{ fontSize: 11 }}>Upload photo</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Btn size="sm" kind="primary" icon="camera">Upload from phone (QR)</Btn>
            <Btn size="sm" kind="ghost" icon="paperclip">Drag & drop</Btn>
            <Btn size="sm" kind="ghost">Use site CCTV snapshot</Btn>
          </div>
        </Card>

        <Card title="AI-generated inventory description" icon="sparkles" tone="ai">
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-700)', background: 'var(--ai-50)', padding: 14, borderRadius: 8, border: '1px solid var(--ai-100)' }}>
            <p style={{ margin: 0 }}>
              5m² unit at {a.siteName}. Contents visible from photos: <b>1× single mattress (queen size, used)</b>, <b>3× sealed cardboard moving boxes (medium)</b>, <b>1× upright vacuum cleaner</b>, <b>2× plastic storage bins (clear, lid intact)</b>, <b>misc household items</b> (lamp, mirror, kitchen chair). No visible damp or pest evidence. Unit accessible from front. Estimated unit contents value: <b>R 4 500 – R 6 500</b>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Btn size="sm" kind="ai" icon="check">Use this description</Btn>
            <Btn size="sm" kind="ghost" icon="edit">Edit before publishing</Btn>
            <Btn size="sm" kind="ghost" icon="refresh">Regenerate</Btn>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title="Reserve & pricing">
          <KV2 lbl="AI-suggested reserve" val={<><span className="bold">{FXTENANT.symbol} {a.reserve.toLocaleString(FXTENANT.locale)}</span> · based on 8 prior comparable sales</>} />
          <KV2 lbl="Cleaning deposit" val="R 500 (mandatory · iBid policy)" />
          <KV2 lbl="Buyer's premium" val="17.5% incl VAT" />
          <KV2 lbl="Starting bid" val={`R ${Math.round(a.reserve * 0.4).toLocaleString(FXTENANT.locale)}`} />
          <KV2 lbl="Duration" val="7 days · soft close +2min" />
        </Card>
        <Card title="Comparable sales" icon="trending-up">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <Comp unit="C-04" site="Rosebank" sold={4200} closed="3 mo ago" />
            <Comp unit="A-15" site="Rivonia"  sold={3800} closed="5 mo ago" />
            <Comp unit="B-22" site="Eikestad" sold={5100} closed="2 mo ago" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Comp({ unit, site, sold, closed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: '1px solid var(--ink-100)' }}>
      <span className="mono" style={{ fontWeight: 600, fontSize: 11.5 }}>{unit}</span>
      <span style={{ color: 'var(--ink-500)', fontSize: 11.5, flex: 1 }}>{site}</span>
      <span style={{ fontWeight: 600, fontSize: 12 }}>{FXTENANT.symbol} {sold.toLocaleString(FXTENANT.locale)}</span>
      <span style={{ color: 'var(--ink-400)', fontSize: 10.5 }}>{closed}</span>
    </div>
  );
}

function AuctionListing({ a }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <Card title="Listing payload" icon="paperclip" subtitle="What we send to iBid via POST /api/v1/auctions">
        <pre style={{ background: 'var(--ink-900)', color: '#E8E5DD', padding: 14, borderRadius: 7, fontSize: 11.5, lineHeight: 1.55, overflow: 'auto', fontFamily: 'var(--font-mono)', margin: 0 }}>{`POST /api/v1/auctions
Authorization: Bearer ibid_•••

{
  "seller_id": "flexistore-sa",
  "facility": "${a.siteName}",
  "unit_ref": "${a.unit}",
  "size_sqm": 5,
  "reserve_zar": ${a.reserve},
  "starting_bid_zar": ${Math.round(a.reserve * 0.4)},
  "buyer_premium_pct": 17.5,
  "cleaning_deposit_zar": 500,
  "open_at": "${new Date().toISOString().slice(0, 10)}T18:00:00+02:00",
  "close_at": "${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}T18:00:00+02:00",
  "soft_close_minutes": 2,
  "photos": [
    "https://flexistore-spaces.../${a.unit}/IMG_001.JPG",
    ...
  ],
  "description": "5m² unit ...",
  "auto_stop_on_payment": true
}`}</pre>
      </Card>
      <Card title="iBid listing preview" icon="globe">
        <div style={{ border: '1px solid var(--ink-150)', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
          <div style={{ height: 140, background: `linear-gradient(135deg, hsl(30, 12%, 78%), hsl(50, 10%, 68%))`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 8px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10.5, borderRadius: 4, fontWeight: 600 }}>+{(a.photos || 6) - 1} photos</div>
            <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', background: '#2C9CDB', color: 'white', fontSize: 10.5, borderRadius: 4, fontWeight: 700 }}>LIVE</div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600, letterSpacing: 0.04 }}>FLEXISTORE · {a.siteName.toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)', marginTop: 2 }}>5m² Storage Unit Auction</div>
            <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.5 }}>1× mattress, 3× sealed boxes, vacuum, plastic bins, misc household.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-100)' }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-500)', fontWeight: 600 }}>CURRENT BID</div>
                <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{FXTENANT.symbol} {(a.topBid || Math.round(a.reserve * 0.5)).toLocaleString(FXTENANT.locale)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-500)', fontWeight: 600 }}>ENDS</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.endsIn || '6d 14h'}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Btn size="sm" kind="primary" icon="send">Publish to iBid</Btn>
          <Btn size="sm" kind="ghost" icon="globe">Open on iBid</Btn>
        </div>
      </Card>
    </div>
  );
}

function AuctionBids({ a }) {
  const bids = a.bids || [
    { who: 'bidder_3421', when: '14:32', amount: a.topBid || 2800, ip: 'JHB · proxy' },
    { who: 'bidder_2901', when: '14:28', amount: (a.topBid || 2800) - 100, ip: 'CPT' },
    { who: 'bidder_3421', when: '14:11', amount: (a.topBid || 2800) - 200, ip: 'JHB · proxy' },
    { who: 'bidder_5567', when: '11:04', amount: (a.topBid || 2800) - 400, ip: 'DBN' },
    { who: 'bidder_2901', when: 'yest', amount: (a.topBid || 2800) - 700, ip: 'CPT' },
  ];
  return (
    <Card padding={false}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>TOP BID</div>
          <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--good-700)' }}>{FXTENANT.symbol} {(a.topBid || 2800).toLocaleString(FXTENANT.locale)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>BIDS</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{bids.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>UNIQUE BIDDERS</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{new Set(bids.map(b => b.who)).size}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge tone="info" icon="refresh">Live · auto-refresh 10s</Badge>
        </div>
      </div>
      <table className="tbl">
        <thead><tr><th>Time</th><th>Bidder</th><th>Region</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {bids.map((b, i) => (
            <tr key={i} style={i === 0 ? { background: 'var(--good-50)' } : null}>
              <td className="muted mono" style={{ fontSize: 11.5 }}>{b.when}</td>
              <td className="mono" style={{ fontWeight: 500 }}>{b.who}</td>
              <td className="muted">{b.ip}</td>
              <td className="num bold" style={i === 0 ? { color: 'var(--good-700)' } : null}>{FXTENANT.symbol} {b.amount.toLocaleString(FXTENANT.locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AuctionHandover({ a }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <Card title="Winner" icon="user">
        <KV2 lbl="Name" val={a.winner || 'David Mokoena'} />
        <KV2 lbl="iBid handle" val={<span className="mono">bidder_3421</span>} />
        <KV2 lbl="Phone" val="+27 82 444 1122" />
        <KV2 lbl="Email" val="davidm@example.com" />
        <KV2 lbl="Winning bid" val={<><span className="bold">{FXTENANT.symbol} {(a.soldFor || a.topBid || 2800).toLocaleString(FXTENANT.locale)}</span> + 17.5% premium</>} />
        <KV2 lbl="Payment" val={<Badge tone="good" dot>Paid · iBid escrow</Badge>} />
      </Card>
      <Card title="Key handover" icon="lock">
        <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, marginBottom: 12 }}>Once iBid confirms payment, we issue a single-use 7-day digital key to the winner's phone. Their NFC tag opens unit, gate, and CCTV blackout zones for collection only.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <HoverRow icon="check-circle" label="Original tenant key revoked" status="done" />
          <HoverRow icon="send" label="WhatsApp + SMS sent to winner" status="done" />
          <HoverRow icon="unlock" label="7-day single-use key issued" status="done" />
          <HoverRow icon="clock" label="Pickup window: 25–31 May" status="pending" />
          <HoverRow icon="check" label="Cleaning deposit refunded after walkthrough" status="pending" />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <Btn size="sm" kind="primary" icon="unlock">Re-send digital key</Btn>
          <Btn size="sm" kind="ghost" icon="phone">Call winner</Btn>
        </div>
      </Card>
    </div>
  );
}

function HoverRow({ icon, label, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', background: status === 'done' ? 'var(--good-50)' : 'var(--ink-50)', borderRadius: 7 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: status === 'done' ? 'var(--good-600)' : 'var(--ink-200)', color: status === 'done' ? 'white' : 'var(--ink-500)', display: 'grid', placeItems: 'center' }}>
        <Icon name={status === 'done' ? 'check' : icon} size={11} />
      </span>
      <span style={{ flex: 1, fontSize: 12.5, color: status === 'done' ? 'var(--good-700)' : 'var(--ink-700)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function AuctionLegal({ a }) {
  return (
    <Card padding={false}>
      <div style={{ padding: 18, fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.7 }}>
        Every step is logged for compliance. iBid's seller report (downloadable below) doubles as evidence that the market set the price — protection if the original tenant disputes the sale.
      </div>
      <table className="tbl">
        <thead><tr><th>When</th><th>Action</th><th>By</th><th>Channel</th><th>Document</th></tr></thead>
        <tbody>
          <tr><td className="muted">Day 7</td><td>1st gentle reminder</td><td>AI agent</td><td><ChannelChip channel="whatsapp" /></td><td className="muted">log only</td></tr>
          <tr><td className="muted">Day 14</td><td>2nd reminder + retry card</td><td>AI agent</td><td><ChannelChip channel="whatsapp" /></td><td className="muted">log only</td></tr>
          <tr><td className="muted">Day 30</td><td>Firm warning · door access revoked</td><td>AI · approved by Geir</td><td><ChannelChip channel="email" /></td><td><a href="#" style={{ color: 'var(--info-700)' }}>PDF</a></td></tr>
          <tr><td className="muted">Day 60</td><td>Pre-auction notice · 30-day cooldown started</td><td>AI · approved by Geir</td><td><ChannelChip channel="email" /></td><td><a href="#" style={{ color: 'var(--info-700)' }}>PDF</a></td></tr>
          <tr><td className="muted">Day 76</td><td>14-day final legal notice (registered post)</td><td>Geir</td><td><ChannelChip channel="email" /></td><td><a href="#" style={{ color: 'var(--info-700)' }}>PDF</a></td></tr>
          <tr><td className="muted">Day 90</td><td>Listed on iBid</td><td>AI · approved by Geir</td><td><span className="muted">API</span></td><td><a href="#" style={{ color: 'var(--info-700)' }}>iBid summary</a></td></tr>
        </tbody>
      </table>
    </Card>
  );
}

function KV2({ lbl, val }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, fontSize: 12.5, padding: '7px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ color: 'var(--ink-500)', fontWeight: 500 }}>{lbl}</div>
      <div style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{val}</div>
    </div>
  );
}

function auctionActions(a) {
  if (a.stage === 'at-risk') return [
    { i: 'phone', l: 'Schedule manager phone call' },
    { i: 'send',  l: 'Final dunning offer · 30% off arrears', primary: true },
    { i: 'flag',  l: 'Force into legal notice (skip cooldown)', danger: true },
  ];
  if (a.stage === 'notice') return [
    { i: 'camera', l: 'Schedule site visit · take inventory photos', primary: true },
    { i: 'send',   l: 'Re-send 14-day legal notice' },
    { i: 'x',      l: 'Cancel · customer arranged payment', danger: true },
  ];
  if (a.stage === 'inventory') return [
    { i: 'sparkles', l: 'Generate AI description', primary: true },
    { i: 'send',     l: 'Push to iBidOnStorage' },
    { i: 'camera',   l: 'Upload more photos' },
  ];
  if (a.stage === 'listed' || a.stage === 'closing') return [
    { i: 'globe',   l: 'Open on iBid' },
    { i: 'eye',     l: 'Watch bid feed live' },
    { i: 'x',       l: 'Force-stop · customer paid', danger: true },
  ];
  return [
    { i: 'paperclip', l: 'Download iBid summary report' },
    { i: 'unlock',    l: 'Re-send winner key' },
    { i: 'wallet',    l: 'Confirm payout from iBid' },
  ];
}

// ——————————— Settings tab ———————————
function SettingsTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <Card title="Auction thresholds" icon="sliders">
        <SettingRow lbl="Days before legal notice" val="60 days" hint="Door access revoked at day 30 · 30-day cooldown then notice" />
        <SettingRow lbl="Days before auction listing" val="90 days" hint="iBid listing auto-created if customer hasn't paid by then" />
        <SettingRow lbl="Final notice cooldown" val="14 days" hint="Mandatory · regulated by Consumer Protection Act" />
        <SettingRow lbl="Min photos before listing" val="6" />
        <SettingRow lbl="Default auction duration" val="7 days" hint="Soft close +2min on last-minute bids" />
      </Card>

      <Card title="Pricing rules" icon="trending-up">
        <SettingRow lbl="Reserve price formula" val="max(arrears + R 500, AI suggested)" hint="AI uses 8 most recent comparable sales" />
        <SettingRow lbl="Starting bid" val="40% of reserve" />
        <SettingRow lbl="Cleaning deposit" val="R 500 (iBid mandatory)" />
        <SettingRow lbl="Buyer's premium" val="17.5% incl VAT (iBid set)" />
        <SettingRow lbl="If unsold · relist after" val="3 days · drop reserve 15%" />
      </Card>

      <Card title="AI agent autonomy" icon="sparkles" tone="ai">
        <SettingRow lbl="Reminders day 7 / 14 / 30" val={<Badge tone="good" dot>Autonomous</Badge>} hint="AI sends without asking" />
        <SettingRow lbl="Firm warning day 30" val={<Badge tone="watch" dot>Asks operator</Badge>} />
        <SettingRow lbl="Pre-auction notice day 60" val={<Badge tone="watch" dot>Asks operator</Badge>} />
        <SettingRow lbl="Generate inventory description" val={<Badge tone="good" dot>Autonomous</Badge>} hint="From uploaded photos" />
        <SettingRow lbl="Push listing to iBid" val={<Badge tone="watch" dot>Asks operator</Badge>} />
        <SettingRow lbl="Issue winner key" val={<Badge tone="good" dot>Autonomous</Badge>} hint="Triggered on iBid payment confirmation" />
      </Card>

      <Card title="iBidOnStorage integration" icon="globe">
        <SettingRow lbl="Seller account" val={<span className="mono">flexistore-sa</span>} />
        <SettingRow lbl="API key" val={<span className="mono">ibid_••••••••3f9a</span>} hint="Rotated 11 days ago" />
        <SettingRow lbl="Webhook URL" val={<span className="mono" style={{ fontSize: 11 }}>api.flexistore.co.za/webhooks/ibid</span>} />
        <SettingRow lbl="Photo storage" val="DO Spaces · pre-signed URL" />
        <SettingRow lbl="Soft-stop on payment" val={<Badge tone="good" dot>Enabled</Badge>} hint="Auto-cancel if customer pays before close" />
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <Btn size="sm" kind="ghost" icon="refresh">Test connection</Btn>
          <Btn size="sm" kind="ghost" icon="paperclip">View last sync log</Btn>
        </div>
      </Card>
    </div>
  );
}

function SettingRow({ lbl, val, hint }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid var(--ink-100)', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{lbl}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {val}
        <Icon name="edit" size={11} style={{ color: 'var(--ink-400)', cursor: 'pointer' }} />
      </div>
    </div>
  );
}

// ——————————— Data ———————————
function auctionItems(mode) {
  return [
    // At risk (60-89 days)
    { id: 'AU-091', stage: 'at-risk',   unit: 'B-15',  siteShort: 'RMB', siteName: 'Paarl — Rembrandt Mall', customer: 'Pieter Botha', daysOverdue: 78, amount: 4200, reserve: 3200, arrearsStart: '8 Mar 2026' },
    { id: 'AU-092', stage: 'at-risk',   unit: 'E-22',  siteShort: 'EPS', siteName: 'Epsom Downs',           customer: 'Sarah Mthembu', daysOverdue: 66, amount: 5400, reserve: 4100, arrearsStart: '20 Mar 2026' },

    // Notice
    { id: 'AU-088', stage: 'notice',    unit: 'D-08',  siteShort: 'RBK', siteName: 'Rosebank Mall',         customer: 'Tinus Greyling', daysOverdue: 90, amount: 6800, reserve: 3200, arrearsStart: '24 Feb 2026', noticeExpires: 'expires tomorrow', noticeAt: '11 May 2026' },

    // Inventory
    { id: 'AU-085', stage: 'inventory', unit: 'A-04',  siteShort: 'RIV', siteName: 'Rivonia — Edenburg',    customer: 'Jacques Pretorius', daysOverdue: 104, amount: 8200, reserve: 4500, arrearsStart: '11 Feb 2026', noticeAt: '13 Apr 2026', inventoryAt: 'Visit booked 26 May', photos: 4 },

    // Listed
    { id: 'AU-080', stage: 'listed',    unit: 'C-19',  siteShort: 'BVL', siteName: 'Bellville',             customer: 'Naomi Adams',     daysOverdue: 117, amount: 9450, reserve: 4800, arrearsStart: '29 Jan 2026', noticeAt: '31 Mar 2026', inventoryAt: '18 May 2026', listedAt: '20 May 2026', photos: 8, topBid: 3600, bidCount: 7, endsIn: '5d 12h' },

    // Closing soon
    { id: 'AU-076', stage: 'closing',   unit: 'F-11',  siteShort: 'MSH', siteName: 'Marshalltown',          customer: 'Bongani Zulu',    daysOverdue: 124, amount: 11200, reserve: 5500, arrearsStart: '22 Jan 2026', noticeAt: '24 Mar 2026', inventoryAt: '11 May 2026', listedAt: '14 May 2026', photos: 11, topBid: 6400, bidCount: 14, endsIn: '47 min' },

    // Closed history
    { id: 'AU-072', stage: 'closed',    unit: 'A-08',  siteShort: 'EIK', siteName: 'Eikestad Mall',         customer: 'Refilwe Mthimkhulu', daysOverdue: 132, amount: 8900, reserve: 4200, listedAt: '28 Apr', closedAt: '5 May', sold: true,  soldFor: 5800, winner: 'David Mokoena', handoverAt: '8 May' },
    { id: 'AU-068', stage: 'closed',    unit: 'C-12',  siteShort: 'RBK', siteName: 'Rosebank Mall',         customer: 'Pieter Roux',     daysOverdue: 145, amount: 12100, reserve: 6000, listedAt: '15 Apr', closedAt: '22 Apr', sold: true, soldFor: 7800, winner: 'Tumi Nkosi', handoverAt: '25 Apr' },
    { id: 'AU-065', stage: 'closed',    unit: 'B-03',  siteShort: 'RVS', siteName: 'Riverside Junction',    customer: 'Hannelie Smit',   daysOverdue: 120, amount: 4400, reserve: 2200, listedAt: '8 Apr',  closedAt: '15 Apr', sold: false },
  ];
}

window.ArrearsScreen = ArrearsScreen;
