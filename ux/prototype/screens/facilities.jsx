/* ============================================================
   Facilities
   List view + detailed facility floor plan with unit types,
   VIP, devices, and tech tickets.
   ============================================================ */

function FacilitiesScreen({ mode }) {
  const [selected, setSelected] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  if (creating) return <NewFacilityScreen onCancel={() => setCreating(false)} onComplete={() => setCreating(false)} />;
  if (selected) return <FacilityDetail siteId={selected} onBack={() => setSelected(null)} mode={mode} />;

  return (
    <div data-screen-label="Facilities">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Facilities</h1>
          <div className="page-hd__sub">{FXDATA.SITES.length} active locations · {FXDATA.SITES.reduce((a, s) => a + s.units, 0)} total units</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="paperclip">Export</Btn>
          <Btn kind="primary" icon="plus" onClick={() => setCreating(true)}>New facility</Btn>
        </div>
      </div>

      <div className="grid grid--3" style={{ gap: 18 }}>
        {FXDATA.SITES.map(s => <FacilityCard key={s.id} site={s} mode={mode} onOpen={() => setSelected(s.id)} />)}
      </div>
    </div>
  );
}

function FacilityCard({ site, mode, onOpen }) {
  const occ = site.occ;
  const occColor = occ < 0.7 ? 'var(--bad-700)' : occ < 0.85 ? 'var(--watch-700)' : 'var(--good-700)';
  const cells = 96;
  const cellsOccupied = Math.round(cells * occ);
  const grid = Array.from({ length: cells }, (_, i) => i < cellsOccupied);
  const issues = FXDATA.devicesFor(mode).filter(d => d.site === site.id && d.status !== 'good').length;
  const tickets = FXDATA.ticketsFor(site.id, mode).filter(t => t.status !== 'resolved').length;

  return (
    <button onClick={onOpen} style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 12, padding: 18, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--navy-50)', color: 'var(--navy-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, letterSpacing: '-0.02em' }}>{site.short}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink-900)' }}>{site.city}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{site.name}</div>
        </div>
        {issues > 0 ? <Badge tone="bad" dot>{issues} issue{issues > 1 ? 's' : ''}</Badge> :
         tickets > 0 ? <Badge tone="watch" dot>{tickets} ticket{tickets > 1 ? 's' : ''}</Badge> :
         <Badge tone="good" dot>Healthy</Badge>}
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>Occupancy</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: occColor, letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{Math.round(occ * 100)}%</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{Math.round(site.units * occ)} of {site.units} units</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>MRR</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: '-0.02em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: 'var(--ink-500)', fontWeight: 500, marginRight: 2 }}>{FXTENANT.symbol}</span>{Math.round(site.units * occ * 180 / 1000)}k
          </div>
          <div style={{ fontSize: 11, color: 'var(--good-700)', fontWeight: 600 }}><Icon name="arrow-up" size={10} style={{ verticalAlign: -1 }} /> 3.4% MoM</div>
        </div>
      </div>

      <div style={{ background: 'var(--ink-50)', padding: 10, borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 1.5 }}>
          {grid.map((on, i) => (
            <span key={i} style={{ aspectRatio: '1', background: on ? (occ > 0.95 ? 'var(--orange-600)' : 'var(--good-600)') : 'var(--ink-200)', borderRadius: 1, opacity: on ? 1 : 0.5 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: 'var(--ink-500)' }}>
          <span>Open map →</span>
          <span>{site.units} units</span>
        </div>
      </div>
    </button>
  );
}

// —————————————————————— Facility detail ——————————————————————
function FacilityDetail({ siteId, onBack, mode }) {
  const s = FXDATA.SITES.find(x => x.id === siteId);
  const plan = FXDATA.planFor(siteId);
  const devs = FXDATA.devicesFor(mode).filter(d => d.site === siteId);
  const tickets = FXDATA.ticketsFor(siteId, mode);
  const [selection, setSelection] = React.useState({ kind: null, id: null });
  const [tab, setTab] = React.useState('map');
  const [newTicketOpen, setNewTicketOpen] = React.useState(false);
  const [editFacilityOpen, setEditFacilityOpen] = React.useState(false);

  // Generate unit data from plan
  const units = React.useMemo(() => makeUnits(plan, siteId, mode), [siteId, mode]);

  if (!s) return null;

  const openIssues = devs.filter(d => d.status !== 'good');
  const openTickets = tickets.filter(t => t.status !== 'resolved');

  // Map device status to plan devices by kind/site so we can color them
  const deviceStatusByKind = {};
  devs.forEach(d => {
    if (!deviceStatusByKind[d.kind]) deviceStatusByKind[d.kind] = [];
    deviceStatusByKind[d.kind].push(d);
  });

  return (
    <div data-screen-label="Facility detail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="chevron-right" size={12} style={{ transform: 'rotate(180deg)' }} />Facilities
        </button>
        <span className="muted">/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>{s.city} — {s.name}</span>
      </div>

      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{s.city}</h1>
          <div className="page-hd__sub">{s.name} · {s.units} units · landlord 18% rev-share · {Math.round(s.occ * 100)}% occupied</div>
        </div>
        <div className="page-hd__actions">
          {openIssues.length > 0 && <Badge tone="bad" dot>{openIssues.length} device issue{openIssues.length > 1 ? 's' : ''}</Badge>}
          {openTickets.length > 0 && <Badge tone="watch" dot>{openTickets.length} open ticket{openTickets.length > 1 ? 's' : ''}</Badge>}
          <Btn kind="ghost" icon="route">Directions</Btn>
          <Btn kind="ghost" icon="edit" onClick={() => setEditFacilityOpen(true)}>Edit facility</Btn>
          <Btn kind="primary" icon="plus" onClick={() => setNewTicketOpen(true)}>Log tech issue</Btn>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'map',     label: 'Floor plan' },
          { id: 'units',   label: 'Units', count: units.length },
          { id: 'tickets', label: 'Tech issues', count: openTickets.length },
          { id: 'devices', label: 'Devices', count: devs.length },
          { id: 'landlord',label: 'Landlord & contract' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'flex-start' }}>
          <Card padding={false}>
            <FloorPlan
              plan={plan}
              units={units}
              devices={devs}
              tickets={tickets}
              selection={selection}
              onSelect={setSelection}
            />
            <FloorLegend />
          </Card>
          <FloorSidebar
            selection={selection}
            units={units}
            devices={devs}
            tickets={tickets}
            site={s}
            mode={mode}
            onClear={() => setSelection({ kind: null, id: null })}
            onAction={(action) => {
              if (action === 'new-ticket') setNewTicketOpen(true);
            }}
          />
        </div>
      )}

      {tab === 'units' && <UnitsTable units={units} onPick={(u) => { setSelection({ kind: 'unit', id: u.id }); setTab('map'); }} />}
      {tab === 'tickets' && <TicketsTable tickets={tickets} onNew={() => setNewTicketOpen(true)} mode={mode} />}
      {tab === 'devices' && <DevicesTable devs={devs} onPick={(d) => { setSelection({ kind: 'device', id: d.id }); setTab('map'); }} />}
      {tab === 'landlord' && <LandlordTab site={s} />}

      {newTicketOpen && (
        <NewTicketModal
          site={s}
          units={units}
          devices={devs}
          selection={selection}
          onClose={() => setNewTicketOpen(false)}
        />
      )}

      {editFacilityOpen && <EditFacilityModal site={s} onClose={() => setEditFacilityOpen(false)} />}
    </div>
  );
}

// —————————————————————— Floor plan ——————————————————————
function FloorPlan({ plan, units, devices, tickets, selection, onSelect }) {
  const { width, height } = plan;

  // Map plan device ids to actual device statuses (by kind, take first matching)
  const planDevByKind = {};
  devices.forEach(d => {
    if (!planDevByKind[d.kind]) planDevByKind[d.kind] = [];
    planDevByKind[d.kind].push(d);
  });

  // Tickets per unit / device for badge overlay
  const unitTicketCount = {};
  const devTicketCount = {};
  tickets.filter(t => t.status !== 'resolved').forEach(t => {
    if (t.unit && t.unit !== '—') unitTicketCount[t.unit] = (unitTicketCount[t.unit] || 0) + 1;
    if (t.deviceId) devTicketCount[t.deviceId] = (devTicketCount[t.deviceId] || 0) + 1;
  });

  return (
    <div style={{ background: '#FAFAF7', padding: 18, overflow: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 600 }}>
        {/* Building outline */}
        <rect x="20" y="20" width={width - 40} height={height - 40} rx="14" fill="white" stroke="var(--ink-200)" strokeWidth="1.5" />

        {/* Aisles */}
        {plan.aisles.map((a, i) => (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="var(--ink-100)" strokeWidth="14" strokeLinecap="round" />
        ))}

        {/* Entrance marker */}
        <g>
          <rect x={plan.entrance.x - 12} y={plan.entrance.y - 22} width="24" height="44" rx="3" fill="var(--navy-900)" />
          <text x={plan.entrance.x - 22} y={plan.entrance.y - 28} fontSize="10" fontWeight="600" fill="var(--navy-700)" fontFamily="var(--font-display)">ENTRANCE</text>
          <path d={`M ${plan.entrance.x + 16} ${plan.entrance.y} l 16 -6 v 4 h 14 v 4 h -14 v 4 z`} fill="var(--navy-900)" />
        </g>

        {/* Zones */}
        {plan.zones.map(zone => (
          <g key={zone.id}>
            {/* Zone label */}
            <text x={zone.x} y={zone.y - 8} fontSize="10.5" fontWeight="600" fill="var(--ink-500)" letterSpacing="0.06em" textTransform="uppercase" fontFamily="var(--font-body)">
              {zone.name.toUpperCase()}
            </text>
            {/* Units in zone */}
            {Array.from({ length: zone.rows * zone.cols }, (_, i) => {
              const r = Math.floor(i / zone.cols);
              const c = i % zone.cols;
              const ux = zone.x + c * (zone.unitW + zone.gap);
              const uy = zone.y + r * (zone.unitH + zone.gap);
              const unitId = `${zone.id}-${String(i + 1).padStart(2, '0')}`;
              const unit = units.find(u => u.id === unitId);
              if (!unit) return null;
              const isSel = selection.kind === 'unit' && selection.id === unitId;
              const fill = unitFill(unit);
              const stroke = unitStroke(unit, isSel);
              const ticketN = unitTicketCount[unitId] || 0;
              return (
                <g key={unitId} onClick={(e) => { e.stopPropagation(); onSelect({ kind: 'unit', id: unitId }); }} style={{ cursor: 'pointer' }}>
                  <rect x={ux} y={uy} width={zone.unitW} height={zone.unitH} rx="3" fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1} />
                  {/* VIP gold rim */}
                  {unit.tier === 'vip' && <rect x={ux + 2} y={uy + 2} width={zone.unitW - 4} height={zone.unitH - 4} rx="2" fill="none" stroke="#C8941F" strokeWidth="1" strokeDasharray="2 2" />}
                  {/* Unit label */}
                  <text x={ux + zone.unitW / 2} y={uy + zone.unitH / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={unit.status === 'available' ? 'var(--ink-500)' : unit.tier === 'vip' ? '#7A5A14' : 'var(--ink-900)'} fontFamily="var(--font-mono)">
                    {unitId}
                  </text>
                  {/* Size hint */}
                  <text x={ux + zone.unitW / 2} y={uy + zone.unitH - 7} textAnchor="middle" fontSize="8" fill={unit.status === 'available' ? 'var(--ink-400)' : 'var(--ink-700)'}>
                    {unit.size}m²
                  </text>
                  {/* Issue indicator */}
                  {(unit.issue || ticketN > 0) && (
                    <circle cx={ux + zone.unitW - 6} cy={uy + 6} r="4" fill="var(--bad-600)" stroke="white" strokeWidth="1.5" />
                  )}
                  {/* Maintenance hatching pattern */}
                  {unit.status === 'maintenance' && (
                    <line x1={ux} y1={uy + zone.unitH} x2={ux + zone.unitW} y2={uy} stroke="var(--watch-600)" strokeWidth="1" strokeOpacity="0.4" />
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Devices */}
        {plan.devices.map(pd => {
          // Find a real device of this kind to inherit status from
          const real = (planDevByKind[pd.kind] || [])[0] || { status: 'good', lastPing: '2m ago', id: pd.id };
          const isSel = selection.kind === 'device' && selection.id === pd.id;
          const c = devicePinColor(real.status);
          const ticketN = devTicketCount[real.id] || 0;
          return (
            <g key={pd.id} onClick={(e) => { e.stopPropagation(); onSelect({ kind: 'device', id: pd.id, realId: real.id }); }} style={{ cursor: 'pointer' }}>
              {/* Halo */}
              <circle cx={pd.x} cy={pd.y} r={isSel ? 22 : 18} fill={c.bg} opacity="0.45" />
              <circle cx={pd.x} cy={pd.y} r="13" fill="white" stroke={c.fg} strokeWidth="1.8" />
              <DeviceIconSvg kind={pd.kind} cx={pd.x} cy={pd.y} color={c.fg} />
              {/* Status pulse */}
              {real.status === 'bad' && <circle cx={pd.x} cy={pd.y} r="18">
                <animate attributeName="r" from="13" to="28" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.55" to="0" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="stroke" attributeType="XML" values="var(--bad-600)" dur="1.4s" repeatCount="indefinite" />
                </circle>}
              {real.status === 'bad' && <circle cx={pd.x} cy={pd.y} r="13" fill="none" stroke="var(--bad-600)" strokeWidth="1.6" opacity="0.6" />}
              {/* Label */}
              <text x={pd.x} y={pd.y + 28} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--ink-700)" fontFamily="var(--font-body)">
                {pd.label}
              </text>
              {ticketN > 0 && <circle cx={pd.x + 10} cy={pd.y - 10} r="6" fill="var(--bad-600)" stroke="white" strokeWidth="1.5" />}
              {ticketN > 0 && <text x={pd.x + 10} y={pd.y - 8} textAnchor="middle" fontSize="8" fontWeight="700" fill="white">{ticketN}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DeviceIconSvg({ kind, cx, cy, color }) {
  // Tiny inline icon glyphs inside the device pin (centered 12px)
  const s = 6.5; // half-size
  const c = color;
  if (kind === 'gateway')   return (<g stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <path d="M2 12a16 16 0 0 1 20 0" /><path d="M5 15.5a11 11 0 0 1 14 0" /><path d="M8.5 19a6 6 0 0 1 7 0" /><circle cx="12" cy="22" r="0.7" fill={c} />
  </g>);
  if (kind === 'switch')    return (<g stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3 3 0 0 0 0-6h-6a3 3 0 0 1 0-6h7" />
  </g>);
  if (kind === 'door')      return (<g stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17" /><path d="M3 21h18" /><circle cx="15" cy="13" r="0.7" fill={c} />
  </g>);
  if (kind === 'camera')    return (<g stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="12.5" r="3.5" />
  </g>);
  if (kind === 'electrical')return (<g stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
  </g>);
  if (kind === 'env')       return (<g stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${cx - s}, ${cy - s + 0.5}) scale(0.54)`}>
    <path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0Z" />
  </g>);
  return null;
}

function FloorLegend() {
  return (
    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--ink-150)', display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 11, color: 'var(--ink-600)', background: 'white' }}>
      <LegItem swatch="var(--good-600)" label="Occupied" />
      <LegItem swatch="var(--ink-100)" border="var(--ink-200)" label="Available" />
      <LegItem swatch="var(--info-100)" border="var(--info-600)" label="Reserved" />
      <LegItem swatch="var(--watch-100)" border="var(--watch-600)" label="Maintenance" />
      <LegItem swatch="var(--bad-600)" round label="Open issue" />
      <LegItem swatch="white" border="#C8941F" gold label="VIP" />
      <span style={{ marginLeft: 'auto', color: 'var(--ink-500)' }}>Live · auto-refresh every 60s</span>
    </div>
  );
}

function LegItem({ swatch, border, label, round, gold }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: round ? '50%' : 2, background: swatch, border: `1px ${gold ? 'dashed' : 'solid'} ${border || 'transparent'}` }} />
      {label}
    </span>
  );
}

// —————————————————————— Sidebar (selection panel) ——————————————————————
function FloorSidebar({ selection, units, devices, tickets, site, mode, onClear, onAction }) {
  if (selection.kind === 'unit') {
    const u = units.find(x => x.id === selection.id);
    if (!u) return null;
    return <UnitPanel unit={u} site={site} tickets={tickets.filter(t => t.unit === u.id)} onClear={onClear} onNewTicket={() => onAction('new-ticket')} />;
  }
  if (selection.kind === 'device') {
    const d = devices.find(x => x.kind === planKindOf(selection.id)) || devices.find(x => x.id === selection.realId);
    if (!d) return null;
    return <DevicePanel device={d} tickets={tickets.filter(t => t.deviceId === d.id)} site={site} onClear={onClear} onNewTicket={() => onAction('new-ticket')} />;
  }
  return <SiteOverviewPanel site={site} units={units} devices={devices} tickets={tickets} mode={mode} onNewTicket={() => onAction('new-ticket')} />;
}

function planKindOf(planId) {
  const map = { 'gw-01': 'gateway', 'sw-01': 'switch', 'dr-A': 'door', 'dr-B': 'door', 'dr-C': 'door', 'dr-V': 'door', 'cam-1': 'camera', 'cam-2': 'camera', 'pwr-1': 'electrical', 'env-1': 'env' };
  return map[planId] || 'gateway';
}

function SiteOverviewPanel({ site, units, devices, tickets, mode, onNewTicket }) {
  const occ = units.filter(u => u.status === 'occupied').length;
  const avail = units.filter(u => u.status === 'available').length;
  const reserved = units.filter(u => u.status === 'reserved').length;
  const maint = units.filter(u => u.status === 'maintenance').length;
  const vipCount = units.filter(u => u.tier === 'vip').length;
  const openIssues = devices.filter(d => d.status !== 'good');
  const openTickets = tickets.filter(t => t.status !== 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padding={false}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>Site overview</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, marginTop: 2 }}>{site.city}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>Click any unit or device on the floor plan</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <SiteStat lbl="Occupied" big={occ} tone="good" />
            <SiteStat lbl="Available" big={avail} tone="neutral" />
            <SiteStat lbl="Reserved" big={reserved} tone="info" />
            <SiteStat lbl="Maintenance" big={maint} tone="watch" />
          </div>
          <div style={{ padding: 10, background: 'var(--ink-50)', borderRadius: 7, fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.5 }}>
            <Icon name="shield" size={11} style={{ verticalAlign: -1, marginRight: 5, color: 'var(--orange-600)' }} />
            <b style={{ color: 'var(--ink-900)' }}>{vipCount} VIP units</b> · climate-controlled · 24/7 dedicated alarm
          </div>
        </div>
      </Card>

      {openIssues.length > 0 && (
        <Card title="Live issues" icon="alert" padding={false}>
          {openIssues.map((d, i) => (
            <div key={d.id} style={{ padding: '11px 14px', borderTop: i > 0 ? '1px solid var(--ink-100)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <SevDot status={d.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.4 }}>{d.note || `Last ping ${d.lastPing}`}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="Open tickets" icon="alert" count={openTickets.length} action={<Btn size="sm" kind="primary" icon="plus" onClick={onNewTicket}>New</Btn>}>
        {openTickets.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--good-700)', padding: '12px 4px', textAlign: 'center' }}>
            <Icon name="check-circle" size={12} style={{ verticalAlign: -2, marginRight: 5 }} />Nothing open
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTickets.slice(0, 4).map(t => <TicketChip key={t.id} ticket={t} compact />)}
          </div>
        )}
      </Card>
    </div>
  );
}

function SiteStat({ lbl, big, tone }) {
  const colors = { good: 'var(--good-700)', watch: 'var(--watch-700)', bad: 'var(--bad-700)', info: 'var(--info-700)', neutral: 'var(--ink-700)' };
  return (
    <div style={{ padding: '8px 10px', background: 'var(--ink-50)', borderRadius: 7 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{lbl}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: colors[tone], lineHeight: 1.1, marginTop: 2 }}>{big}</div>
    </div>
  );
}

function UnitPanel({ unit, site, tickets, onClear, onNewTicket }) {
  const occupant = unit.customerId ? FXDATA.PEOPLE_BY_ID[unit.customerId] : null;
  const isVip = unit.tier === 'vip';
  const [editing, setEditing] = React.useState(false);
  const [overrides, setOverrides] = React.useState({});
  const live = { ...unit, ...overrides };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padding={false}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>Unit</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }} className="mono">{live.id}</div>
              {(live.tier === 'vip' || isVip) && <Badge tone="watch" icon="shield">VIP</Badge>}
              {live.tier === 'climate' && <Badge tone="info" icon="thermo">Climate</Badge>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>{live.size}m² · {live.zoneLabel}</div>
          </div>
          <Btn size="sm" kind="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Btn>
          <button onClick={onClear} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-400)' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KV lbl="Status" val={<StatusBadge status={live.status} />} />
          <KV lbl="Listed price" val={<><span className="muted" style={{ fontWeight: 500 }}>R </span>{live.price.toLocaleString(FXTENANT.locale)}/month</>} />
          {(live.tier === 'vip' || isVip || live.vipPrice) && (
            <KV lbl="VIP price" val={<><span className="muted" style={{ fontWeight: 500 }}>R </span>{(live.vipPrice || Math.round(live.price * 1.5)).toLocaleString(FXTENANT.locale)}/month</>} />
          )}
          <KV lbl="Hub · port" val={<span className="mono">{live.hub || `${site.short}-HUB-01`} · P{String(live.port || 1).padStart(2, '0')}</span>} />
          <KV lbl="Meters from door" val={`${live.metersFromEntrance || 12} m`} />
          {occupant && (<>
            <KV lbl="Tenant" val={
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar name={`${occupant.first} ${occupant.last}`} size="sm" />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{occupant.first} {occupant.last}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{occupant.id}</div>
                </div>
              </div>
            } />
            <KV lbl="Contact" val={<><Icon name="phone" size={10} style={{ verticalAlign: -1, marginRight: 4, color: 'var(--ink-400)' }} />{occupant.phone}</>} />
            <KV lbl="Last access" val="08:03 today · Zone A door" />
          </>)}
          {!occupant && live.status === 'available' && (
            <div style={{ padding: 9, background: 'var(--good-50)', color: 'var(--good-700)', borderRadius: 7, fontSize: 12, fontWeight: 500, textAlign: 'center' }}>
              Ready to let · suggest to walk-in customer
            </div>
          )}
          {live.issue && (
            <div style={{ padding: 9, background: 'var(--bad-50)', borderRadius: 7, fontSize: 12, color: 'var(--bad-700)' }}>
              <Icon name="alert" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />
              <b>Issue:</b> {live.issue}
            </div>
          )}
        </div>
      </Card>

      <Card title="Quick actions" padding={false}>
        <div style={{ padding: '4px 0' }}>
          <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Icon name="edit" size={14} style={{ color: 'var(--orange-600)' }} />Edit unit · tech · price · VIP
          </button>
          {(occupant ? [
            { i: 'user',      l: 'Open customer 360' },
            { i: 'message',   l: 'Message customer' },
            { i: 'unlock',    l: 'Remote-unlock unit' },
            { i: 'pin',       l: 'Add note (Cmd+N)' },
            { i: 'alert',     l: 'Log tech issue', primary: true, onClick: onNewTicket },
          ] : [
            { i: 'plus',      l: 'Reserve for walk-in' },
            { i: 'sliders',   l: 'Adjust price' },
            { i: 'pin',       l: 'Add note (Cmd+N)' },
            { i: 'alert',     l: 'Mark for maintenance' },
          ]).map(a => (
            <button key={a.l} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a.primary ? 'var(--orange-700)' : 'var(--ink-700)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name={a.i} size={14} style={{ color: a.primary ? 'var(--orange-600)' : 'var(--ink-500)' }} />{a.l}
            </button>
          ))}
        </div>
      </Card>

      {tickets.length > 0 && (
        <Card title="Tickets on this unit" count={tickets.length} padding={false}>
          {tickets.map(t => <TicketChip key={t.id} ticket={t} compact />)}
        </Card>
      )}

      {editing && <EditUnitModal unit={live} onClose={() => setEditing(false)} onSave={(patch) => setOverrides({ ...overrides, ...patch })} />}
    </div>
  );
}

function DevicePanel({ device, tickets, site, onClear, onNewTicket }) {
  const sev = device.status;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card padding={false}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: devicePinColor(sev).bg, color: devicePinColor(sev).fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name={deviceIconName(device.kind)} size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{device.kind}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 600 }}>{device.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }} className="mono">{device.id}</div>
          </div>
          <button onClick={onClear} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-400)' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <KV lbl="Status" val={<><SevDot status={sev} /> <span style={{ marginLeft: 5, fontWeight: 600, color: sev === 'bad' ? 'var(--bad-700)' : sev === 'watch' ? 'var(--watch-700)' : 'var(--good-700)', textTransform: 'capitalize' }}>{sev === 'good' ? 'Online' : sev === 'watch' ? 'Degraded' : 'Offline'}</span></>} />
          <KV lbl="Last ping" val={device.lastPing} />
          {device.latencyMs && <KV lbl="Latency" val={`${device.latencyMs} ms`} />}
          <KV lbl="Uptime (30d)" val={`${device.uptime?.toFixed(1)}%`} />
          <KV lbl="IP address" val={<span className="mono">{device.ip}</span>} />
          {device.note && (
            <div style={{ padding: 9, background: sev === 'bad' ? 'var(--bad-50)' : 'var(--watch-50)', borderRadius: 7, fontSize: 12, color: sev === 'bad' ? 'var(--bad-700)' : 'var(--watch-700)' }}>
              <Icon name="alert" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />{device.note}
            </div>
          )}
        </div>
      </Card>

      <Card title="Quick actions" padding={false}>
        <div style={{ padding: '4px 0' }}>
          {[
            { i: 'refresh', l: 'Re-sweep this device' },
            { i: 'zap',     l: 'Power-cycle via relay', primary: sev !== 'good' },
            { i: 'history', l: 'View ping history' },
            { i: 'pin',     l: 'Add note (Cmd+N)' },
            { i: 'alert',   l: 'Log tech issue', onClick: onNewTicket },
            { i: 'route',   l: 'Trace route from HQ' },
          ].map(a => (
            <button key={a.l} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: a.primary ? 'var(--ai-700)' : 'var(--ink-700)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ink-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name={a.i} size={14} style={{ color: a.primary ? 'var(--ai-600)' : 'var(--ink-500)' }} />
              {a.l}
              {a.primary && <Badge tone="ai" style={{ marginLeft: 'auto' }}>AI ready</Badge>}
            </button>
          ))}
        </div>
      </Card>

      {tickets.length > 0 && (
        <Card title="Tickets on this device" count={tickets.length} padding={false}>
          {tickets.map(t => <TicketChip key={t.id} ticket={t} compact />)}
        </Card>
      )}
    </div>
  );
}

function KV({ lbl, val }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, fontSize: 12.5 }}>
      <div style={{ color: 'var(--ink-500)', fontWeight: 500 }}>{lbl}</div>
      <div style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{val}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'occupied') return <Badge tone="good" dot>Occupied</Badge>;
  if (status === 'reserved') return <Badge tone="info" dot>Reserved</Badge>;
  if (status === 'maintenance') return <Badge tone="watch" dot>Maintenance</Badge>;
  if (status === 'available') return <Badge tone="neutral" dot>Available</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

// —————————————————————— Tables ——————————————————————
function UnitsTable({ units, onPick }) {
  const [editing, setEditing] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [unitOverrides, setUnitOverrides] = React.useState({});

  const liveUnits = units.map(u => ({ ...u, ...(unitOverrides[u.id] || {}) }));

  const saveEdit = (patch) => {
    setUnitOverrides({ ...unitOverrides, [editing.id]: { ...(unitOverrides[editing.id] || {}), ...patch } });
  };

  return (
    <>
      <Card padding={false}>
        <table className="tbl">
          <thead><tr><th>Unit</th><th>Zone</th><th>Type</th><th>Size</th><th>Status</th><th>Tenant</th><th className="num">Price</th><th></th></tr></thead>
          <tbody>
            {liveUnits.map(u => {
              const occupant = u.customerId ? FXDATA.PEOPLE_BY_ID[u.customerId] : null;
              return (
                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={(e) => { if (!e.target.closest('[data-edit]')) onPick(u); }}>
                  <td className="mono" style={{ fontWeight: 600 }}>{u.id}{u.tier === 'vip' && <span style={{ marginLeft: 6, color: '#C8941F', fontFamily: 'var(--font-display)' }}>★</span>}</td>
                  <td className="muted">{u.zoneLabel}</td>
                  <td>{u.tier === 'vip' ? <Badge tone="watch">VIP</Badge> : u.tier === 'climate' ? <Badge tone="info">Climate</Badge> : <span className="muted" style={{ textTransform: 'capitalize' }}>{u.type}</span>}</td>
                  <td>{u.size} m²</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>{occupant ? `${occupant.first} ${occupant.last}` : <span className="muted">—</span>}</td>
                  <td className="num"><span className="muted" style={{ fontWeight: 500 }}>R </span>{u.price.toLocaleString(FXTENANT.locale)}</td>
                  <td className="right">
                    <div data-edit style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <Btn size="sm" kind="ghost" icon="edit" onClick={(e) => { e.stopPropagation(); setEditing(u); }}>Edit</Btn>
                      <Icon name="chevron-right" size={13} style={{ color: 'var(--ink-400)', alignSelf: 'center' }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {editing && <EditUnitModal unit={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </>
  );
}

// —————————————————————— Edit unit modal ——————————————————————
function EditUnitModal({ unit, onClose, onSave }) {
  const [u, setU] = React.useState({
    number:         unit.id.split('-').pop(),
    name:           unit.name || `${unit.zoneLabel} ${unit.id}`,
    sizeValue:      unit.size,
    sizeUnit:       'm²',
    tier:           unit.tier || 'normal',
    normalPrice:    unit.normalPrice || unit.price,
    vipPrice:       unit.vipPrice || Math.round(unit.price * 1.5),
    lockModel:      unit.lockModel || 'KR-100 solenoid',
    sensor:         unit.sensor || 'Door + motion',
    light:          unit.light || 'LED · aisle shared',
    hub:            unit.hub || 'RBK-HUB-01',
    port:           unit.port || 1,
    gateway:        unit.gateway || 'RBK-GW-01',
    poePort:        unit.poePort || 1,
    metersFromEntrance: unit.metersFromEntrance || 12,
  });
  const set = (k, v) => setU(s => ({ ...s, [k]: v }));
  const isVip = u.tier === 'vip';
  const isClimate = u.tier === 'climate';

  return (
    <Modal
      open onClose={onClose}
      title={`Edit ${unit.id}`}
      subtitle={`Tech, pricing, and physical wiring · changes save immediately`}
      width={720}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={() => {
            onSave({
              tier: u.tier,
              size: Number(u.sizeValue) || unit.size,
              price: isVip ? Number(u.vipPrice) : Number(u.normalPrice),
              normalPrice: Number(u.normalPrice),
              vipPrice: Number(u.vipPrice),
              lockModel: u.lockModel, sensor: u.sensor, light: u.light,
              hub: u.hub, port: Number(u.port), gateway: u.gateway, poePort: Number(u.poePort),
              metersFromEntrance: Number(u.metersFromEntrance),
              name: u.name,
            });
            onClose();
          }}>Save unit</Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <UFld label="Unit number"><UInp value={u.number} onChange={v => set('number', v)} /></UFld>
          <UFld label="Display name" hint="Internal label, shown to admin & customer"><UInp value={u.name} onChange={v => set('name', v)} /></UFld>
          <UFld label="Size">
            <div style={{ display: 'flex', gap: 5 }}>
              <UInp value={u.sizeValue} onChange={v => set('sizeValue', v)} />
              <select value={u.sizeUnit} onChange={(e) => set('sizeUnit', e.target.value)} style={{ width: 60, padding: '7px 8px', border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white', fontSize: 13 }}>
                <option>m²</option>
                <option>m³</option>
              </select>
            </div>
          </UFld>
        </div>

        {/* Tier + pricing */}
        <div style={{ background: 'var(--ink-50)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8 }}>Tier & pricing</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { id: 'normal',  l: 'Normal',  c: 'var(--ink-700)' },
              { id: 'climate', l: 'Climate', c: 'var(--info-700)' },
              { id: 'vip',     l: '★ VIP',   c: '#7A5A14' },
            ].map(opt => (
              <button key={opt.id} onClick={() => set('tier', opt.id)} style={{
                flex: 1, padding: '8px 10px',
                border: u.tier === opt.id ? `1.5px solid ${opt.c}` : '1px solid var(--ink-200)',
                background: u.tier === opt.id ? (opt.id === 'vip' ? '#FCF6E5' : opt.id === 'climate' ? 'var(--info-50)' : 'white') : 'white',
                color: u.tier === opt.id ? opt.c : 'var(--ink-700)',
                borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>{opt.l}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="Normal price · R / month" hint="What a normal-tier booking pays">
              <UInp value={u.normalPrice} onChange={v => set('normalPrice', v)} />
            </UFld>
            <UFld label="VIP price · R / month" hint="What a VIP booking pays">
              <UInp value={u.vipPrice} onChange={v => set('vipPrice', v)} />
            </UFld>
          </div>
          <div style={{ marginTop: 10, padding: 10, background: 'white', borderRadius: 7, border: '1px solid var(--ai-100)', fontSize: 11.5, color: 'var(--ai-700)', lineHeight: 1.5 }}>
            <Icon name="sparkles" size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
            {isVip ? (
              <>
                Marked <b>VIP</b> · charged at <b>{FXTENANT.symbol} {Number(u.vipPrice).toLocaleString(FXTENANT.locale)}/mo</b> only when the customer explicitly books VIP.
                If our system auto-allocates this VIP unit to a normal-tier booking (because their tier is sold out), they pay the normal price of <b>{FXTENANT.symbol} {Number(u.normalPrice).toLocaleString(FXTENANT.locale)}/mo</b> silently — they never know they got VIP.
              </>
            ) : (
              <>Normal-tier unit · always charged at <b>{FXTENANT.symbol} {Number(u.normalPrice).toLocaleString(FXTENANT.locale)}/mo</b>. The VIP price <span className="mono">({Number(u.vipPrice).toLocaleString(FXTENANT.locale)})</span> only kicks in if you reclassify this unit as VIP.</>
            )}
          </div>
        </div>

        {/* Hardware */}
        <div style={{ background: 'var(--ink-50)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8 }}>Hardware</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <UFld label="Lock"><USel value={u.lockModel} onChange={v => set('lockModel', v)} options={['KR-100 solenoid', 'KR-200 heavy-duty', 'KR-300 climate-rated', 'Manual override']} /></UFld>
            <UFld label="Sensor"><USel value={u.sensor} onChange={v => set('sensor', v)} options={['Door only', 'Door + motion', 'Door + motion + temp', 'None']} /></UFld>
            <UFld label="Light"><USel value={u.light} onChange={v => set('light', v)} options={['LED · aisle shared', 'LED · per-unit motion', 'LED · always on', 'None']} /></UFld>
          </div>
        </div>

        {/* Wiring */}
        <div style={{ background: 'var(--ink-50)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8 }}>Physical wiring</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 1.4fr 0.6fr', gap: 10 }}>
            <UFld label="Hub"><UInp value={u.hub} onChange={v => set('hub', v)} /></UFld>
            <UFld label="Port (1–16)"><UInp value={u.port} onChange={v => set('port', v)} /></UFld>
            <UFld label="Gateway"><UInp value={u.gateway} onChange={v => set('gateway', v)} /></UFld>
            <UFld label="PoE port"><UInp value={u.poePort} onChange={v => set('poePort', v)} /></UFld>
          </div>
        </div>

        {/* Distance */}
        <UFld label="Meters from entrance door" hint="Used by the customer app for walking directions">
          <UInp value={u.metersFromEntrance} onChange={v => set('metersFromEntrance', v)} />
        </UFld>
      </div>
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
  return <input value={value || ''} onChange={(e) => onChange?.(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--ink-200)', borderRadius: 6, fontSize: 13, outline: 'none', background: 'white', fontFamily: 'var(--font-body)' }} />;
}
function USel({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={(e) => onChange?.(e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--ink-200)', borderRadius: 6, background: 'white', fontSize: 13, color: 'var(--ink-800)' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// —————————————————————— Edit facility modal ——————————————————————
function EditFacilityModal({ site, onClose }) {
  const [tab, setTab] = React.useState('basics');
  const [f, setF] = React.useState({
    name: site.name, city: site.city, region: site.region || 'Johannesburg', short: site.short,
    address: '188 Rivonia Road, Edenburg', gps: '-26.0561, 28.0291', hours: '24/7 self-access',
    landlord: 'Edenburg Property Co.', landlordContact: 'Marius Roux · +27 82 661 3344',
    leaseStart: '2024-01-12', leaseTerm: '5 years', rent: '48000', revShare: '18', escalation: '8', notice: '6',
    gross: '1200', lettable: '960',
    vipMode: 'silent-upgrade', defaultNormalMargin: '1.0', defaultVipMargin: '1.5',
    promo: 'First month 50% off · 12-month sign', b2b: '5% standard', student: '15% with .ac.za email',
    smoke: 'Per-zone smoke + heat · SANS',
    cctv: '6 × UniFi G5 Bullet · 30-day retention',
    udm: 'UDM Pro · 8-PoE', wan: 'Vumatel fibre 200Mbps + Vodacom LTE',
    ups: '10 kVA · 6h', genset: '25 kVA diesel · auto ATS',
  });
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <Modal
      open onClose={onClose}
      title={`Edit ${site.city} — ${site.name}`}
      subtitle="Admin · fundamentals · safe to change while live"
      width={780}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={onClose}>Save changes</Btn>
        </>
      }
    >
      <Tabs
        tabs={[
          { id: 'basics',    label: 'Basics' },
          { id: 'lease',     label: 'Lease & landlord' },
          { id: 'pricing',   label: 'Pricing & VIP rules' },
          { id: 'security',  label: 'Security' },
          { id: 'network',   label: 'Network & power' },
          { id: 'danger',    label: 'Danger zone' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'basics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 10 }}>
            <UFld label="Facility name"><UInp value={f.name} onChange={v => s('name', v)} /></UFld>
            <UFld label="Short code · 3 letters"><UInp value={f.short} onChange={v => s('short', v.toUpperCase().slice(0, 3))} /></UFld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="City"><UInp value={f.city} onChange={v => s('city', v)} /></UFld>
            <UFld label="Region"><USel value={f.region} onChange={v => s('region', v)} options={['Cape Town', 'Johannesburg', 'Paarl', 'Stellenbosch', 'Mbombela']} /></UFld>
          </div>
          <UFld label="Street address"><UInp value={f.address} onChange={v => s('address', v)} /></UFld>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="GPS / what3words"><UInp value={f.gps} onChange={v => s('gps', v)} /></UFld>
            <UFld label="Operating hours"><USel value={f.hours} onChange={v => s('hours', v)} options={['24/7 self-access', 'Mon–Sun 06:00–22:00', 'Mon–Fri 08:00–18:00 · Sat 09:00–13:00']} /></UFld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="Gross area (m²)"><UInp value={f.gross} onChange={v => s('gross', v)} /></UFld>
            <UFld label="Lettable area (m²)"><UInp value={f.lettable} onChange={v => s('lettable', v)} /></UFld>
          </div>
        </div>
      )}

      {tab === 'lease' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="Landlord"><UInp value={f.landlord} onChange={v => s('landlord', v)} /></UFld>
            <UFld label="Landlord contact"><UInp value={f.landlordContact} onChange={v => s('landlordContact', v)} /></UFld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="Lease start"><UInp value={f.leaseStart} onChange={v => s('leaseStart', v)} /></UFld>
            <UFld label="Lease term"><USel value={f.leaseTerm} onChange={v => s('leaseTerm', v)} options={['3 years', '5 years', '7 years', '10 years']} /></UFld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <UFld label="Base rent (R/mo)"><UInp value={f.rent} onChange={v => s('rent', v)} /></UFld>
            <UFld label="Rev-share %"><UInp value={f.revShare} onChange={v => s('revShare', v)} /></UFld>
            <UFld label="Escalation %"><UInp value={f.escalation} onChange={v => s('escalation', v)} /></UFld>
            <UFld label="Notice (months)"><UInp value={f.notice} onChange={v => s('notice', v)} /></UFld>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--ai-50)', border: '1px solid var(--ai-100)', borderRadius: 8, padding: 12, fontSize: 12.5, color: 'var(--ai-700)', lineHeight: 1.55 }}>
            <Icon name="sparkles" size={12} style={{ verticalAlign: -2, marginRight: 5 }} />
            <b>VIP pricing rule:</b> when a customer explicitly books a VIP unit, they pay the VIP price. When the system silently auto-allocates a VIP unit to a normal-tier booking (because their tier is sold out), they pay the normal price and don't know they got VIP.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="VIP allocation mode" hint="What the booking flow does">
              <USel value={f.vipMode} onChange={v => s('vipMode', v)} options={['silent-upgrade', 'explicit-only (no upgrade)', 'always charge VIP']} />
            </UFld>
            <UFld label="Default VIP margin × normal" hint="Used when adding new units">
              <UInp value={f.defaultVipMargin} onChange={v => s('defaultVipMargin', v)} />
            </UFld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <UFld label="Move-in promo"><USel value={f.promo} onChange={v => s('promo', v)} options={['First month 50% off · 12-month sign', 'First month free · no commit', 'No promo']} /></UFld>
            <UFld label="B2B discount"><USel value={f.b2b} onChange={v => s('b2b', v)} options={['5% standard', '10% on 5+ units', 'None']} /></UFld>
            <UFld label="Student discount"><USel value={f.student} onChange={v => s('student', v)} options={['15% with .ac.za email', '10% with valid ID', 'None']} /></UFld>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <UFld label="CCTV"><UInp value={f.cctv} onChange={v => s('cctv', v)} /></UFld>
          <UFld label="Smoke / fire"><UInp value={f.smoke} onChange={v => s('smoke', v)} /></UFld>
          <UFld label="Operating hours"><USel value={f.hours} onChange={v => s('hours', v)} options={['24/7 self-access', 'Mon–Sun 06:00–22:00']} /></UFld>
          <UFld label="Auto-revoke on arrears"><USel value="Day 30" onChange={() => {}} options={['Day 14', 'Day 30', 'Day 60']} /></UFld>
        </div>
      )}

      {tab === 'network' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <UFld label="UDM model"><UInp value={f.udm} onChange={v => s('udm', v)} /></UFld>
            <UFld label="WAN provider"><UInp value={f.wan} onChange={v => s('wan', v)} /></UFld>
            <UFld label="UPS"><UInp value={f.ups} onChange={v => s('ups', v)} /></UFld>
            <UFld label="Generator"><UInp value={f.genset} onChange={v => s('genset', v)} /></UFld>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>For port-level rewiring use <b>Devices → site → gateway → hub</b>.</div>
        </div>
      )}

      {tab === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 12, background: 'var(--watch-50)', border: '1px solid var(--watch-100)', borderRadius: 8, fontSize: 12.5, color: 'var(--watch-700)' }}>
            <Icon name="alert" size={12} style={{ verticalAlign: -2, marginRight: 5 }} />These actions affect every customer at this site. Requires admin role + Adam's sign-off.
          </div>
          <Btn kind="ghost" icon="x">Suspend all access (emergency)</Btn>
          <Btn kind="ghost" icon="route">Move all subscriptions to another site</Btn>
          <Btn kind="ghost" icon="shield" style={{ color: 'var(--bad-700)' }}>Decommission facility</Btn>
        </div>
      )}
    </Modal>
  );
}

function TicketsTable({ tickets, onNew, mode }) {
  return (
    <Card title="Tech issues" count={tickets.length} action={<Btn size="sm" kind="primary" icon="plus" onClick={onNew}>Log issue</Btn>} padding={false}>
      <table className="tbl">
        <thead><tr><th>ID</th><th>Issue</th><th>Customer</th><th>Linked to</th><th>Priority</th><th>Channel</th><th>Age</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id}>
              <td className="mono" style={{ fontWeight: 600 }}>{t.id}</td>
              <td>
                <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t.subject}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{t.notes}</div>
              </td>
              <td>{t.customer}</td>
              <td>{t.unit !== '—' ? <span className="mono">{t.unit}</span> : t.deviceId ? <span className="mono muted">{t.deviceId}</span> : <span className="muted">site-wide</span>}</td>
              <td>
                {t.priority === 'critical' && <Badge tone="bad" dot>Critical</Badge>}
                {t.priority === 'high' && <Badge tone="bad" dot>High</Badge>}
                {t.priority === 'medium' && <Badge tone="watch" dot>Medium</Badge>}
                {t.priority === 'low' && <Badge tone="neutral" dot>Low</Badge>}
              </td>
              <td><ChannelChip channel={t.channel === 'auto' ? 'chat' : t.channel === 'internal' ? 'chat' : t.channel === 'phone' ? 'phone' : t.channel} /></td>
              <td className="muted">{t.age}</td>
              <td>
                {t.status === 'open' && <Badge tone="watch" dot>Open</Badge>}
                {t.status === 'investigating' && <Badge tone="info" dot>Investigating</Badge>}
                {t.status === 'resolved' && <Badge tone="good" dot>Resolved</Badge>}
              </td>
              <td className="right">
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {t.status !== 'resolved' && <Btn size="sm" kind="ghost">Work on</Btn>}
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

function DevicesTable({ devs, onPick }) {
  return (
    <Card padding={false}>
      <table className="tbl">
        <thead><tr><th></th><th>Device</th><th>Kind</th><th>Last ping</th><th>Uptime</th><th>IP</th><th></th></tr></thead>
        <tbody>
          {devs.map(d => (
            <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => onPick(d)}>
              <td style={{ width: 14, paddingRight: 0 }}><SevDot status={d.status} /></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--ink-100)', color: 'var(--ink-600)', display: 'grid', placeItems: 'center' }}><Icon name={deviceIconName(d.kind)} size={13} /></span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{d.id}</div>
                  </div>
                </div>
              </td>
              <td className="muted" style={{ textTransform: 'capitalize' }}>{d.kind}</td>
              <td className="muted">{d.lastPing}</td>
              <td className="num">{d.uptime?.toFixed(1)}%</td>
              <td className="mono muted" style={{ fontSize: 11 }}>{d.ip}</td>
              <td className="right"><Btn size="sm" kind="quiet">Details</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function LandlordTab({ site }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
      <Card title="Lease & payouts">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <KV lbl="Landlord" val={<b>Edenburg Property Co.</b>} />
          <KV lbl="Contact" val="Marius Roux · +27 82 661 3344" />
          <KV lbl="Lease term" val="3 years · expires Dec 2027" />
          <KV lbl="Base rent" val={<><span className="muted" style={{ fontWeight: 500 }}>R </span>48 000 / month</>} />
          <KV lbl="Rev-share" val="18% of gross" />
          <KV lbl="Last payout" val="R 24 850 · 30 Apr" />
        </div>
      </Card>
      <Card title="Payouts" padding={false}>
        <table className="tbl">
          <thead><tr><th>Month</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>April 2026</td><td className="num bold">R 24 850</td><td><Badge tone="good" dot>Paid</Badge></td></tr>
            <tr><td>March 2026</td><td className="num bold">R 23 110</td><td><Badge tone="good" dot>Paid</Badge></td></tr>
            <tr><td>February 2026</td><td className="num bold">R 22 480</td><td><Badge tone="good" dot>Paid</Badge></td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// —————————————————————— Ticket helpers + new ticket modal ——————————————————————
function TicketChip({ ticket, compact }) {
  const priorityTone = ticket.priority === 'critical' || ticket.priority === 'high' ? 'bad' : ticket.priority === 'medium' ? 'watch' : 'neutral';
  return (
    <div style={{ padding: '11px 14px', display: 'flex', gap: 9, alignItems: 'flex-start', borderTop: '1px solid var(--ink-100)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityTone === 'bad' ? 'var(--bad-600)' : priorityTone === 'watch' ? 'var(--watch-600)' : 'var(--ink-400)', marginTop: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{ticket.subject}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{ticket.customer} · {ticket.id} · {ticket.age}</div>
      </div>
    </div>
  );
}

function NewTicketModal({ site, units, devices, selection, onClose }) {
  const [subject, setSubject] = React.useState('');
  const [priority, setPriority] = React.useState('medium');
  const [linkType, setLinkType] = React.useState(selection.kind || 'site');
  const [linkId, setLinkId] = React.useState(selection.id || '');
  const [notes, setNotes] = React.useState('');

  return (
    <Modal
      open
      onClose={onClose}
      title="Log a tech issue"
      subtitle={`On ${site.city} — ${site.name}`}
      width={620}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" icon="check" onClick={onClose}>Create ticket</Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field2 label="Subject" hint="What's the customer reporting?">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Door won't open with app, lights flickering…" style={inputSt} />
        </Field2>

        <Field2 label="Priority">
          <div style={{ display: 'flex', gap: 6 }}>
            {['low', 'medium', 'high', 'critical'].map(p => (
              <button key={p} onClick={() => setPriority(p)} style={{
                padding: '7px 13px',
                border: '1px solid var(--ink-200)',
                borderRadius: 7,
                background: priority === p ? (p === 'critical' || p === 'high' ? 'var(--bad-50)' : p === 'medium' ? 'var(--watch-50)' : 'var(--ink-100)') : 'white',
                color: priority === p ? (p === 'critical' || p === 'high' ? 'var(--bad-700)' : p === 'medium' ? 'var(--watch-700)' : 'var(--ink-800)') : 'var(--ink-600)',
                borderColor: priority === p ? (p === 'critical' || p === 'high' ? 'var(--bad-100)' : p === 'medium' ? 'var(--watch-100)' : 'var(--ink-300)') : 'var(--ink-200)',
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </Field2>

        <Field2 label="Link to" hint="So the AI agent can route this and learn over time">
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[
              { id: 'unit',   l: 'A unit',   i: 'building' },
              { id: 'device', l: 'A device', i: 'sensor' },
              { id: 'site',   l: 'Whole site', i: 'globe' },
            ].map(o => (
              <button key={o.id} onClick={() => setLinkType(o.id)} style={{
                flex: 1,
                padding: '11px 12px',
                border: linkType === o.id ? '1.5px solid var(--navy-700)' : '1px solid var(--ink-200)',
                background: linkType === o.id ? 'var(--navy-50)' : 'white',
                color: 'var(--ink-800)',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Icon name={o.i} size={14} style={{ color: linkType === o.id ? 'var(--navy-700)' : 'var(--ink-500)' }} />{o.l}
              </button>
            ))}
          </div>
          {linkType === 'unit' && (
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)} style={inputSt}>
              <option value="">Choose a unit…</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.id} · {u.zoneLabel}{u.tier === 'vip' ? ' · VIP' : ''}</option>)}
            </select>
          )}
          {linkType === 'device' && (
            <select value={linkId} onChange={(e) => setLinkId(e.target.value)} style={inputSt}>
              <option value="">Choose a device…</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name} · {d.id}</option>)}
            </select>
          )}
        </Field2>

        <Field2 label="Notes" hint="What you observed, when, what the customer said. AI uses this for future suggestions.">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" placeholder="Customer at gate · 14:12 · door buzzed but didn't open · phone Bluetooth confirmed on" style={{ ...inputSt, resize: 'vertical', fontFamily: 'var(--font-body)' }} />
        </Field2>

        {subject && (
          <div className="ai-card" style={{ background: 'var(--ai-50)' }}>
            <div className="ai-card__icon"><Icon name="sparkles" size={14} /></div>
            <div className="ai-card__bd">
              <div className="ai-card__meta">AI · auto-suggestion</div>
              <div className="ai-card__title">I can probably remote-fix this</div>
              <div className="ai-card__reason">Based on 12 similar tickets at Rosebank, power-cycling the Zone A door controller resolved this 92% of the time. Want me to try that first?</div>
              <div className="ai-card__actions">
                <Btn size="sm" kind="ai" icon="zap">Yes · power-cycle now</Btn>
                <Btn size="sm" kind="ghost">No, just log</Btn>
              </div>
            </div>
          </div>
        )}
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

// —————————————————————— Helpers ——————————————————————
function unitFill(u) {
  if (u.tier === 'vip' && u.status === 'occupied') return '#F8E9C8';
  if (u.tier === 'vip') return '#FCF6E5';
  if (u.status === 'occupied') return 'var(--good-100)';
  if (u.status === 'reserved') return 'var(--info-100)';
  if (u.status === 'maintenance') return 'var(--watch-100)';
  return 'var(--ink-100)';
}
function unitStroke(u, isSel) {
  if (isSel) return 'var(--navy-900)';
  if (u.issue) return 'var(--bad-600)';
  if (u.status === 'occupied') return 'var(--good-600)';
  if (u.status === 'reserved') return 'var(--info-600)';
  if (u.status === 'maintenance') return 'var(--watch-600)';
  return 'var(--ink-200)';
}
function devicePinColor(sev) {
  if (sev === 'bad')   return { fg: 'var(--bad-700)',   bg: 'var(--bad-100)' };
  if (sev === 'watch') return { fg: 'var(--watch-700)', bg: 'var(--watch-100)' };
  return { fg: 'var(--good-700)', bg: 'var(--good-100)' };
}
function deviceIconName(kind) {
  return ({ gateway: 'wifi', switch: 'route', door: 'door', camera: 'camera', electrical: 'zap', env: 'thermo' })[kind] || 'cpu';
}

// Build a units array for the facility from the plan + facility occupancy.
function makeUnits(plan, siteId, mode) {
  const site = FXDATA.SITES.find(x => x.id === siteId);
  const targetOcc = site?.occ || 0.85;
  const out = [];
  const customers = FXDATA.PEOPLE.filter(p => p.site === siteId);
  let custIdx = 0;
  let totalIdx = 0;
  let occupiedSoFar = 0;

  plan.zones.forEach(zone => {
    const total = zone.rows * zone.cols;
    for (let i = 0; i < total; i++) {
      const unitId = `${zone.id}-${String(i + 1).padStart(2, '0')}`;
      totalIdx++;
      const targetOccupied = totalIdx * targetOcc;
      let status = occupiedSoFar < targetOccupied ? 'occupied' : 'available';
      // Sprinkle in reserved + maintenance
      const hash = (siteId.charCodeAt(0) + i * 7 + zone.id.charCodeAt(0)) % 100;
      if (status === 'available' && hash < 18) status = 'reserved';
      else if (hash > 92) status = 'maintenance';
      if (status === 'occupied') occupiedSoFar++;
      // Crisis: one unit has an issue
      const issue = (mode === 'crisis' && siteId === 'rivonia' && unitId === 'A-01') ? 'Door won\'t open · customer waiting' : null;
      const customer = status === 'occupied' && custIdx < customers.length ? customers[custIdx++] : null;
      const sizeMap = { small: 4, medium: 8, large: 14, vip: 20 };
      const tier = zone.type === 'vip' ? (hash < 50 ? 'vip' : 'climate') : null;
      out.push({
        id: unitId,
        zoneLabel: zone.name,
        type: zone.type,
        tier,
        size: sizeMap[zone.type] || 5,
        status,
        customerId: customer?.id,
        price: priceForUnit(zone.type, siteId, tier),
        issue,
      });
    }
  });
  return out;
}

function priceForUnit(type, siteId, tier) {
  const base = { small: 580, medium: 1050, large: 1900, vip: 3200 }[type] || 900;
  const siteMult = { rosebank: 1.12, rivonia: 1.05, eikestad: 1.0, bellville: 0.95, rembrandt: 0.85, riverside: 0.75 }[siteId] || 1;
  const tierMult = tier === 'vip' ? 1.5 : tier === 'climate' ? 1.25 : 1;
  return Math.round(base * siteMult * tierMult / 50) * 50;
}

window.FacilitiesScreen = FacilitiesScreen;
