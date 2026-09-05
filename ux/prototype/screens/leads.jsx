/* ============================================================
   Leads — pipeline kanban
   AI does most of the work: qualifies, replies, books tours.
   Operator just steps in for big or stuck ones.
   ============================================================ */

function LeadsScreen({ mode }) {
  const leads = FXDATA.LEADS;
  const stages = FXDATA.LEAD_STAGES;
  const [openLead, setOpenLead] = React.useState(null);

  const byStage = stages.map(s => ({
    ...s,
    items: leads.filter(l => l.stage === s.id),
    value: leads.filter(l => l.stage === s.id).reduce((a, l) => a + l.value, 0),
  }));

  const totalPipeline = leads.filter(l => l.stage !== 'lost').reduce((a, l) => a + l.value, 0);

  return (
    <div data-screen-label="Leads">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Leads</h1>
          <div className="page-hd__sub">{leads.length} active · AI qualifying autonomously · operator picks up the stuck ones</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="paperclip">Export</Btn>
          <Btn kind="primary" icon="plus">New lead</Btn>
        </div>
      </div>

      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="New this week" value="12" sub="3 website, 6 WhatsApp, 3 walk-in" delta={50} />
        <Kpi label="Pipeline value" prefix={FXTENANT.symbol} value={totalPipeline.toLocaleString(FXTENANT.locale)} sub="If all reserved" />
        <Kpi label="Conversion rate" value="62%" sub="Lead → reserved · 30-day window" delta={4} tone="good" />
        <Kpi label="AI auto-qualified" value="9 of 12" sub="Operator only touched 3" delta={20} />
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'stretch' }}>
        {byStage.map(stage => (
          <div key={stage.id} style={{ background: 'var(--ink-50)', borderRadius: 10, padding: 10, minHeight: 480, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '4px 4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge tone={stage.color} dot>{stage.label}</Badge>
                <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{stage.items.length}</span>
              </div>
              <Icon name="more" size={13} style={{ color: 'var(--ink-400)', cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginBottom: 10, padding: '0 4px' }}>
              <span style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{FXTENANT.symbol} {stage.value.toLocaleString(FXTENANT.locale)}</span> pipeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {stage.items.map(l => <LeadCard key={l.id} lead={l} onOpen={() => setOpenLead(l)} />)}
              {stage.items.length === 0 && (
                <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 11.5, color: 'var(--ink-400)' }}>No leads here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI activity on leads */}
      <div style={{ marginTop: 18 }}>
        <Card title="What AI did with leads today" icon="sparkles" tone="ai" subtitle="Operator review · approve or unwind any of these">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <LeadAiRow t="14:32" what="Qualified Brenda Smith" detail="Submitted website form · matched to 6m² Rivonia · sent reservation link" />
            <LeadAiRow t="13:51" what="Replied to Johan Pretorius (WhatsApp)" detail={"\u201CYes — we have 16m² at Paarl · R 2 400/month. Here\u2019s the link.\u201D"} />
            <LeadAiRow t="11:08" what="Booked self-guided tour for David Chen" detail="QR + directions sent to WhatsApp · Sat 11:00" />
            <LeadAiRow t="10:34" what="Flagged Yusuf Adams as stuck" detail="4 days since last touch · no response to 3 WhatsApps · suggested phone call" />
          </div>
        </Card>
      </div>
      {openLead && <LeadDetailModal lead={openLead} onClose={() => setOpenLead(null)} />}
    </div>
  );
}

function LeadCard({ lead, onOpen }) {
  const site = FXDATA.SITES.find(s => s.id === lead.site);
  const isStuck = (lead.lastTouch || '').includes('follow-up') || (lead.age && lead.age.endsWith('d') && parseInt(lead.age) >= 4);
  return (
    <div
      onClick={onOpen}
      style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 8, padding: 10, cursor: 'pointer', position: 'relative' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-300)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ink-150)'}
    >
      {isStuck && <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--bad-600)' }} title="Stuck" />}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 1 }} className="truncate">{lead.name}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginBottom: 8 }}>{site?.city} · {lead.size}m²</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-800)' }}>
          <span style={{ color: 'var(--ink-500)', fontWeight: 500, marginRight: 1 }}>{FXTENANT.symbol}</span>{lead.value.toLocaleString(FXTENANT.locale)}
        </span>
        <span style={{ color: 'var(--ink-400)', fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>{lead.age}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.35, display: 'flex', alignItems: 'flex-start', gap: 4, paddingTop: 7, borderTop: '1px solid var(--ink-100)' }}>
        <Icon name={lead.source === 'whatsapp' ? 'whatsapp' : lead.source === 'website' ? 'globe' : lead.source === 'walk-in' ? 'user' : lead.source === 'referral' ? 'users' : 'sparkles'} size={10} style={{ marginTop: 2, color: 'var(--ink-400)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>{lead.lastTouch}</span>
      </div>
    </div>
  );
}

function LeadAiRow({ t, what, detail }) {
  return (
    <div style={{ display: 'flex', gap: 13, padding: '11px 0', borderTop: '1px solid var(--ink-100)', alignItems: 'flex-start' }}>
      <span style={{ width: 38, fontSize: 11, color: 'var(--ink-400)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingTop: 1 }}>{t}</span>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--ai-50)', color: 'var(--ai-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name="sparkles" size={11} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-900)', fontWeight: 600 }}>{what}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 }}>{detail}</div>
      </div>
      <Btn size="sm" kind="quiet">View</Btn>
    </div>
  );
}

window.LeadsScreen = LeadsScreen;

// —————————————————————— Lead detail modal ——————————————————————
function LeadDetailModal({ lead, onClose }) {
  const site = FXDATA.SITES.find(s => s.id === lead.site);
  const [stage, setStage] = React.useState(lead.stage);
  const [draft, setDraft] = React.useState(`Hi ${lead.name.split(' ')[0]}, thanks for reaching out — happy to help with the ${lead.size}m² unit at ${site?.city || 'our site'}. Want me to send the reservation link?`);
  const [channel, setChannel] = React.useState('whatsapp');
  const [tab, setTab] = React.useState('detail');

  const STAGES = FXDATA.LEAD_STAGES.filter(s => s.id !== 'lost');

  const thread = [
    { from: 'lead', t: '12m ago', ch: 'whatsapp', text: `Hi! I'm looking for ${lead.size}m² near ${site?.city}.` },
    { from: 'bot',  t: '11m ago', ch: 'whatsapp', text: `Hi ${lead.name.split(' ')[0]} — we have a ${lead.size}m² unit at ${site?.name} from R ${lead.value.toLocaleString(FXTENANT.locale)}/mo. Reservation link coming up.` },
    { from: 'lead', t: '4m ago',  ch: 'whatsapp', text: 'Can I view first?' },
  ];

  return (
    <Modal
      open onClose={onClose}
      title={lead.name}
      subtitle={`Lead ${lead.id} · ${site?.city} · ${lead.size}m² · R ${lead.value.toLocaleString(FXTENANT.locale)} potential`}
      width={920}
      footer={
        <>
          <Btn kind="ghost" icon="x" onClick={() => { setStage('lost'); onClose(); }} style={{ color: 'var(--bad-700)' }}>Mark as lost</Btn>
          <span style={{ marginLeft: 'auto' }} />
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={onClose}>Save</Btn>
        </>
      }
    >
      <Tabs
        tabs={[
          { id: 'detail',   label: 'Detail' },
          { id: 'comms',    label: 'Conversation', count: thread.length },
          { id: 'activity', label: 'Activity' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'detail' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title="Contact & need">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <UFld label="Full name"><UInp value={lead.name} /></UFld>
                <UFld label="Source"><UInp value={lead.source} /></UFld>
                <UFld label="Mobile"><UInp value="+27 …" /></UFld>
                <UFld label="Email"><UInp value="—" /></UFld>
                <UFld label="Preferred site"><UInp value={site?.city + ' — ' + site?.name} /></UFld>
                <UFld label="Size needed"><UInp value={`${lead.size} m²`} /></UFld>
                <UFld label="Move-in date"><UInp value="ASAP" /></UFld>
                <UFld label="Move-out (est)"><UInp value="6+ months" /></UFld>
              </div>
            </Card>

            <Card title="Stage" icon="route">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STAGES.map(s => (
                  <button key={s.id} onClick={() => setStage(s.id)} style={{
                    padding: '7px 12px',
                    border: stage === s.id ? `1.5px solid var(--orange-600)` : '1px solid var(--ink-200)',
                    background: stage === s.id ? 'var(--orange-50)' : 'white',
                    color: stage === s.id ? 'var(--orange-700)' : 'var(--ink-700)',
                    borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  }}>{s.label}</button>
                ))}
                <button onClick={() => setStage('lost')} style={{ padding: '7px 12px', border: stage === 'lost' ? '1.5px solid var(--bad-600)' : '1px solid var(--ink-200)', background: stage === 'lost' ? 'var(--bad-50)' : 'white', color: stage === 'lost' ? 'var(--bad-700)' : 'var(--ink-500)', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Lost</button>
              </div>
              {stage === 'lost' && (
                <div style={{ marginTop: 12 }}>
                  <UFld label="Why lost? (helps AI learn)" hint="Free-text or pick a tag">
                    <USel value="Chose competitor" onChange={() => {}} options={['Chose competitor', 'Price too high', 'Wrong location', 'Wrong size', 'No longer needs storage', 'Ghosted · gave up']} />
                  </UFld>
                </div>
              )}
            </Card>

            <Card title="Reply on WhatsApp / email" icon="message">
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[{ id: 'whatsapp', l: 'WhatsApp' }, { id: 'email', l: 'Email' }, { id: 'phone', l: 'Phone (manual)' }].map(o => (
                  <button key={o.id} onClick={() => setChannel(o.id)} style={{ padding: '5px 11px', border: channel === o.id ? '1.5px solid var(--navy-700)' : '1px solid var(--ink-200)', background: channel === o.id ? 'var(--navy-50)' : 'white', color: 'var(--ink-800)', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{o.l}</button>
                ))}
              </div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows="4" style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, lineHeight: 1.45, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                <Btn size="sm" kind="ghost" icon="sparkles">Suggest reply</Btn>
                <Btn size="sm" kind="ghost" icon="invoice">Send reservation link</Btn>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)' }}>{draft.length}/1024 chars</span>
                <Btn size="sm" kind="primary" icon="send">Send</Btn>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title="AI suggests" icon="sparkles" tone="ai">
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 10 }}>Lead matches 6 similar conversions. Most likely to close with a same-day self-tour QR. Promo: <b>1st month 50% off</b>.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Btn size="sm" kind="ai" icon="invoice">Send reservation + Paystack</Btn>
                <Btn size="sm" kind="ghost" icon="calendar">Book self-tour</Btn>
                <Btn size="sm" kind="ghost" icon="phone">Schedule operator call</Btn>
              </div>
            </Card>

            <Card title="Conversion stats" icon="trending-up">
              <KV lbl="Score" val={<Badge tone="good" dot>High · 78</Badge>} />
              <KV lbl="Days in pipeline" val={lead.age} />
              <KV lbl="Last touch" val={lead.lastTouch} />
              <KV lbl="Channel" val={lead.source} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'comms' && (
        <Card padding={false}>
          <div style={{ padding: 18, maxHeight: 400, overflowY: 'auto', background: 'var(--ink-50)' }}>
            {thread.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'lead' ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginBottom: 3, fontWeight: 600, textAlign: m.from === 'lead' ? 'left' : 'right' }}>
                    {m.from === 'lead' ? lead.name : m.from === 'bot' ? 'AI assistant' : 'You · Geir'} · {m.t}
                  </div>
                  <div style={{ background: m.from === 'lead' ? 'white' : m.from === 'bot' ? 'var(--ai-50)' : 'var(--navy-700)', color: m.from === 'me' ? 'white' : 'var(--ink-800)', border: m.from === 'lead' ? '1px solid var(--ink-150)' : 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.45 }}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'activity' && (
        <Card>
          <Empty icon="history" title="Activity log" sub="Lead created · AI replied · operator opened" />
        </Card>
      )}
    </Modal>
  );
}

function UFld({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-700)', display: 'block', marginBottom: 3 }}>{label}</label>
      {hint && <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginBottom: 4 }}>{hint}</div>}
      {children}
    </div>
  );
}
function UInp({ value, onChange }) {
  return <input value={value || ''} onChange={(e) => onChange?.(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--ink-200)', borderRadius: 6, fontSize: 13, outline: 'none', background: 'white' }} />;
}
function USel({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={(e) => onChange?.(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white', fontSize: 13 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function KV({ lbl, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 12.5 }}>
      <span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>{lbl}</span>
      <span style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{val}</span>
    </div>
  );
}
