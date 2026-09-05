/* ============================================================
   Unified Inbox
   Chatbot + WhatsApp + email per customer in ONE stream.
   Left: conversation list. Centre: thread. Right: customer + AI.
   ============================================================ */

function InboxScreen({ mode }) {
  const convs = FXDATA.conversationsFor(mode);
  const [activeId, setActiveId] = React.useState(convs[0]?.id);
  const [filter, setFilter] = React.useState('all');

  // Keep selection valid when mode changes
  React.useEffect(() => {
    if (!convs.find(c => c.id === activeId)) setActiveId(convs[0]?.id);
  }, [mode]); // eslint-disable-line

  const active = convs.find(c => c.id === activeId) || convs[0];

  const filtered = convs.filter(c => {
    if (filter === 'urgent') return c.status === 'urgent' || c.status === 'awaiting-operator';
    if (filter === 'bot') return c.status?.startsWith('bot');
    if (filter === 'leads') return c.subject?.startsWith('Lead');
    return true;
  });

  return (
    <div data-screen-label="Inbox" style={{ display: 'grid', gridTemplateColumns: '360px 1fr 340px', height: 'calc(100vh - var(--topbar))', background: 'white', borderTop: '1px solid var(--ink-150)' }}>
      <InboxList convs={filtered} active={activeId} setActive={setActiveId} filter={filter} setFilter={setFilter} mode={mode} />
      {active ? <InboxThread conv={active} mode={mode} /> : <Empty title="No conversations" />}
      {active && <InboxAside conv={active} mode={mode} />}
    </div>
  );
}

// —————————————————————— List ——————————————————————
function InboxList({ convs, active, setActive, filter, setFilter, mode }) {
  const tabs = [
    { id: 'all',     label: 'All',     count: convs.length },
    { id: 'urgent',  label: 'Needs me',count: convs.filter(c => c.status === 'urgent' || c.status === 'awaiting-operator').length },
    { id: 'bot',     label: 'Bot',     count: convs.filter(c => c.status?.startsWith('bot')).length },
  ];
  return (
    <div style={{ borderRight: '1px solid var(--ink-150)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18 }}>Inbox</h2>
          <Btn size="sm" kind="ghost" icon="plus">Compose</Btn>
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Icon name="search" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
          <input placeholder="Search" style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 12.5, outline: 'none', background: 'white' }} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              background: filter === t.id ? 'var(--ink-100)' : 'transparent',
              color: filter === t.id ? 'var(--ink-900)' : 'var(--ink-500)',
              fontSize: 11.5,
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              {t.label}
              <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 999, background: filter === t.id ? 'white' : 'var(--ink-150)', color: 'var(--ink-500)' }}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {convs.map(c => {
          const person = FXDATA.PEOPLE_BY_ID[c.customerId];
          const name = person ? `${person.first} ${person.last}` : 'Unknown';
          const isActive = c.id === active;
          const isUrgent = c.status === 'urgent';
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: isActive ? 'var(--orange-50)' : 'transparent',
                padding: '12px 16px',
                borderBottom: '1px solid var(--ink-100)',
                cursor: 'pointer',
                borderLeft: isActive ? '3px solid var(--orange-600)' : '3px solid transparent',
                position: 'relative',
              }}
            >
              {isUrgent && <div style={{ position: 'absolute', top: 14, left: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--bad-600)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                <Avatar name={name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }} className="truncate">{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)' }} className="truncate">{c.subject}</div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-400)', flexShrink: 0 }}>{c.lastAt}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.4, marginLeft: 33 }} className="truncate">{c.last}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 7, marginLeft: 33, alignItems: 'center' }}>
                <ChannelChip channel={c.channel} size={10} />
                {c.status === 'urgent' && <Badge tone="bad" dot>Urgent</Badge>}
                {c.status === 'awaiting-operator' && <Badge tone="watch" dot>Needs me</Badge>}
                {c.status === 'bot-handling' && <Badge tone="ai" icon="bot">Bot handling · {c.botHandled} msgs</Badge>}
                {c.status === 'bot-resolved' && <Badge tone="good" icon="check">Bot resolved</Badge>}
                {c.unread > 0 && <span style={{ marginLeft: 'auto', background: 'var(--orange-600)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, minWidth: 16, textAlign: 'center' }}>{c.unread}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// —————————————————————— Thread ——————————————————————
function InboxThread({ conv, mode }) {
  const person = FXDATA.PEOPLE_BY_ID[conv.customerId];
  const name = person ? `${person.first} ${person.last}` : 'Unknown';
  const msgs = threadFor(conv, person);

  const [draft, setDraft] = React.useState('');
  React.useEffect(() => { setDraft(suggestedReply(conv)); }, [conv.id, mode]); // eslint-disable-line

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {/* Thread header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ flexShrink: 0 }}><ChannelChip channel={conv.channel} /></div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person?.phone || conv.customerId}
            {person?.site && <> · {FXDATA.SITES.find(s => s.id === person.site)?.city} {person.unit}</>}
          </div>
        </div>
        <Btn size="sm" kind="ghost" icon="user">360</Btn>
        <Btn size="sm" kind="ghost" icon="more" />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', background: 'var(--ink-50)' }}>
        {msgs.map((m, i) => (
          <Message key={i} msg={m} customer={person} channel={conv.channel} />
        ))}
        {conv.status === 'urgent' && mode === 'crisis' && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0', fontSize: 11.5, color: 'var(--bad-700)', fontWeight: 600 }}>
            <span style={{ background: 'var(--bad-50)', border: '1px solid var(--bad-100)', padding: '4px 10px', borderRadius: 999 }}>
              <Icon name="alert" size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
              Bot escalated — site outage detected
            </span>
          </div>
        )}
      </div>

      {/* Composer with AI draft */}
      <Composer draft={draft} setDraft={setDraft} channel={conv.channel} customer={person} mode={mode} conv={conv} />
    </div>
  );
}

function Message({ msg, customer, channel }) {
  const isMe = msg.from === 'me' || msg.from === 'bot';
  const isBot = msg.from === 'bot';
  const align = isMe ? 'flex-end' : 'flex-start';
  const bg = isBot ? 'var(--ai-50)' : isMe ? 'var(--navy-900)' : 'white';
  const color = isBot ? 'var(--ai-700)' : isMe ? 'white' : 'var(--ink-800)';
  const border = isBot ? '1px solid var(--ai-100)' : isMe ? 'none' : '1px solid var(--ink-150)';

  return (
    <div style={{ display: 'flex', justifyContent: align, marginBottom: 10 }}>
      <div style={{ maxWidth: '70%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {!isMe && <Avatar name={`${customer?.first} ${customer?.last}`} size="sm" />}
          {isBot && <Avatar bot size="sm" />}
          <span style={{ fontSize: 10.5, color: 'var(--ink-500)', fontWeight: 600 }}>
            {isBot ? 'AI assistant' : isMe ? 'You · Geir' : `${customer?.first || ''}`} · {msg.time}
          </span>
        </div>
        <div style={{ background: bg, color, padding: '10px 13px', borderRadius: 14, border, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', boxShadow: isMe && !isBot ? 'var(--shadow-sm)' : 'none' }}>
          {msg.text}
          {msg.attachments && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              {msg.attachments.map((a, i) => (
                <span key={i} style={{ background: isMe ? 'rgba(255,255,255,0.1)' : 'var(--ink-100)', padding: '4px 8px', borderRadius: 6, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="paperclip" size={10} />{a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({ draft, setDraft, channel, customer, mode, conv }) {
  return (
    <div style={{ borderTop: '1px solid var(--ink-150)', padding: 16, background: 'white' }}>
      {/* AI draft chip */}
      {draft && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 11px', background: 'var(--ai-50)', border: '1px solid var(--ai-100)', borderRadius: 8 }}>
          <Icon name="sparkles" size={13} style={{ color: 'var(--ai-700)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--ai-700)', fontWeight: 600 }}>AI drafted this reply · 94% confidence · matched 12 similar resolved cases</span>
          <button onClick={() => setDraft('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--ai-700)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Discard</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Reply on ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'Email' : 'Chat'}…`}
          rows="3"
          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--ink-200)', borderRadius: 9, fontSize: 13, lineHeight: 1.45, outline: 'none', resize: 'none', fontFamily: 'var(--font-body)' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn size="sm" kind="ghost" icon="paperclip">Attach</Btn>
        <Btn size="sm" kind="ghost" icon="sparkles">Suggest</Btn>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)' }}>
          via <b style={{ color: 'var(--ink-800)' }}>{channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'support@flexistore.co.za' : 'Chatbot'}</b>
        </span>
        <Btn size="sm" kind="ghost">Save</Btn>
        <Btn size="sm" kind="primary" icon="send">Send</Btn>
      </div>
    </div>
  );
}

// —————————————————————— Aside ——————————————————————
function InboxAside({ conv, mode }) {
  const person = FXDATA.PEOPLE_BY_ID[conv.customerId];
  if (!person) return null;
  const isLead = person.type === 'lead';

  return (
    <aside style={{ borderLeft: '1px solid var(--ink-150)', overflowY: 'auto', padding: 18, background: 'var(--ink-50)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Customer card */}
      <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar name={`${person.first} ${person.last}`} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', fontFamily: 'var(--font-display)' }}>{person.first} {person.last}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{person.id} · {person.type === 'business' ? person.company : person.type === 'lead' ? 'Lead' : 'Individual'}</div>
          </div>
        </div>
        {!isLead && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <Mini lbl="Unit" val={person.unit} />
            <Mini lbl="Site" val={siteShort(person.site)} />
            <Mini lbl="Plan" val={`${person.plan} m²`} />
            <Mini lbl="Monthly" val={<><span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>R </span>{FXDATA.priceFor(person)}</>} />
          </div>
        )}
        {isLead && (
          <div style={{ padding: 10, background: 'var(--watch-50)', borderRadius: 7, fontSize: 11.5, color: 'var(--watch-700)', fontWeight: 500, marginBottom: 10 }}>
            <Icon name="lead" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />
            Lead · not yet converted
          </div>
        )}
        <div style={{ display: 'flex', gap: 5 }}>
          <Btn size="sm" kind="ghost" icon="user">Open 360</Btn>
          {!isLead && <Btn size="sm" kind="ghost" icon="invoice">Invoices</Btn>}
        </div>
      </div>

      {/* AI suggestions */}
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ai-700)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="sparkles" size={11} />AI suggests
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {asideAi(conv, person, mode).map((s, i) => (
            <button key={i} style={{
              background: 'white',
              border: '1px solid var(--ai-100)',
              borderRadius: 9,
              padding: '10px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
            }}>
              <Icon name={s.icon} size={13} style={{ color: 'var(--ai-700)', marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2, lineHeight: 1.4 }}>{s.sub}</div>
              </div>
              <Icon name="arrow-right" size={11} style={{ color: 'var(--ai-700)', marginTop: 3 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Quick context */}
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8 }}>Recent activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5 }}>
          {recentActivity(person, mode).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: 'var(--ink-400)', fontSize: 10.5, fontVariantNumeric: 'tabular-nums', width: 38, flexShrink: 0 }}>{a.t}</span>
              <span style={{ color: 'var(--ink-700)', lineHeight: 1.45 }}>{a.text}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Mini({ lbl, val }) {
  return (
    <div style={{ padding: 9, background: 'var(--ink-50)', borderRadius: 7, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{lbl}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', marginTop: 2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
    </div>
  );
}

// —————————————————————— Helpers ——————————————————————
function siteShort(id) { return FXDATA.SITES.find(s => s.id === id)?.short || '—'; }
function siteName(id) { const s = FXDATA.SITES.find(x => x.id === id); return s ? `${s.city} — ${s.name}` : id; }

function threadFor(conv, person) {
  const C = (text, time, atts) => ({ from: 'customer', text, time, attachments: atts });
  const B = (text, time) => ({ from: 'bot', text, time });
  const M = (text, time) => ({ from: 'me', text, time });

  if (conv.id === 'cv-1') return [
    C('Hi, my card was declined this morning. Can I try a different one?', '4m ago'),
    B('Hi Tinus, I can see Standard Bank Mastercard ending 4421 declined for "insufficient funds" at 03:11 today. I can\'t collect on a new card without verifying it with you — let me pass this to the team.', '4m ago'),
    B('A note for the operator: customer has 1 unpaid invoice (R 2 750). Account on payment retry day 2 of 5.', '4m ago'),
  ];
  if (conv.id === 'cv-2') return [
    C('Hi! I\'m looking for storage near Sandton, around 5m². Do you have availability?', '12m ago'),
    B('Hi Thandi! Yes — we have 5m² units at Rivonia (Edenburg Terraces) available from R 975/month. Here\'s the booking link: flexistore.app/rivonia-5m', '11m ago'),
    B('I\'ve also reserved this unit for 30 minutes so it doesn\'t get taken while you decide 👍', '11m ago'),
    C('Can I view it first?', '9m ago'),
    B('Of course — Edenburg Terraces is open self-tour 24/7 with QR access. Want me to send a QR + directions?', '8m ago'),
    C('Yes please', '4m ago'),
  ];
  if (conv.id === 'cv-3') return [
    C('I think I was charged twice — could you check?\n\nMy bank shows R 5 220 went off on 24 May AND 25 May. I only have one unit at Eikestad.', '32m ago', ['bank-statement.pdf']),
    B('Hi Kerry, looking into this — opening up Xero records.', '32m ago'),
    B('I found 2 successful Paystack settlements: one on the 24th for R 5 220 (your usual invoice) and one on the 25th for R 5 220 that does NOT match an invoice. This looks like a duplicate. Flagging for the operator to confirm refund.', '30m ago'),
  ];
  if (conv.id === 'cv-x1') return [
    C('I\'m at the gate right now and the app won\'t open the door. Please help, I\'m double-parked.', '2m ago'),
    B('Sorry Megan — I can see Rosebank is online but I want a human eyes on this. Escalating immediately.', '2m ago'),
  ];
  return [
    C(conv.last, conv.lastAt),
  ];
}

function suggestedReply(conv) {
  if (conv.id === 'cv-1') return `Hi Tinus, thanks for the heads-up. To switch cards safely, please update your payment method in the app (Settings → Payment). Your invoice will retry automatically. If you\'d prefer to pay by EFT this once, our details are at flexistore.app/eft. Sorry for the trouble.`;
  if (conv.id === 'cv-3') return `Hi Kerry, you\'re right — I\'ve confirmed a duplicate charge of R 5 220 from 25 May. I\'ve initiated a refund via Paystack; it\'ll reflect in 3–5 working days. Apologies for the trouble.`;
  if (conv.id === 'cv-7') return `Hi Sipho, thanks — happy to add 3 more 10m² units at Bellville. I\'ll send a draft amendment to the Dlamini Group agreement today. Same monthly rate (R 1 650/unit) and 5% B2B discount applies. Sound good?`;
  if (conv.id === 'cv-x1') return `Hi Megan, I\'m so sorry — Rosebank shows online on our side but I\'m investigating. As a temporary unlock, please use the QR sticker on Door A (top right). I\'ll call you in 2 minutes.`;
  return '';
}

function asideAi(conv, person, mode) {
  const out = [];
  if (conv.id === 'cv-1') {
    out.push({ icon: 'wallet', title: 'Send Paystack card-update link', sub: 'Customer can switch cards in 30s without leaving WhatsApp' });
    out.push({ icon: 'route', title: 'Offer 1-time EFT details', sub: 'Avoids second decline + grace period extension' });
    out.push({ icon: 'pin',   title: 'Pause dunning for 48h', sub: 'Customer engaged — give them time to resolve' });
  } else if (conv.id === 'cv-3') {
    out.push({ icon: 'refresh', title: 'Refund R 5 220 via Paystack', sub: 'Duplicate confirmed · auto-allocate as credit if customer prefers' });
    out.push({ icon: 'invoice', title: 'Add credit note to Xero', sub: 'Keeps accounting reconciled' });
  } else if (conv.id === 'cv-x1') {
    out.push({ icon: 'unlock', title: 'Remote-unlock door for Megan', sub: 'I have her unit ID + verified phone — safe to override' });
    out.push({ icon: 'phone',  title: 'Auto-call Megan now', sub: 'Skip the chat back-and-forth' });
    out.push({ icon: 'flag',   title: 'Apply 1-month credit for trouble', sub: 'Standard SLA gesture for access outages' });
  } else if (person.type === 'lead') {
    out.push({ icon: 'invoice', title: 'Send reservation + Paystack', sub: 'Lock the unit for 30 min, then convert on payment' });
    out.push({ icon: 'calendar', title: 'Book a self-guided tour', sub: 'QR code via WhatsApp · no operator needed' });
  } else {
    out.push({ icon: 'check-circle', title: 'Mark resolved', sub: 'Bot is handling — operator action not required' });
    out.push({ icon: 'tag', title: 'Tag this customer', sub: 'For grouping with similar comms' });
  }
  return out;
}

function recentActivity(person, mode) {
  if (!person) return [];
  const base = [
    { t: '4m',  text: `Card declined · R ${person.plan * 200}` },
    { t: '1h',  text: 'Door unlocked · Zone A' },
    { t: '12h', text: 'Invoice INV-202604-1102 issued' },
    { t: '3d',  text: 'KYC re-verified · SumSub APPROVED' },
    { t: '12d', text: 'Subscription started' },
  ];
  if (person.type === 'lead') return [
    { t: '4m',  text: 'Lead form submitted via website' },
    { t: '4m',  text: 'AI replied automatically' },
    { t: '3m',  text: 'Reserved 5m² · Rivonia · 30min hold' },
  ];
  return base;
}

window.InboxScreen = InboxScreen;
