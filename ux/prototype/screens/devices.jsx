/* ============================================================
   Devices & sensors — drill-down control room
   Sites → UDM + Gateways → Hubs → Locks/Sensors/Lights.
   Each level surfaces live status + power-cycle/reset controls.
   ============================================================ */

function DevicesScreen({ mode }) {
  // Path-based drill-down: [siteId, gatewayId?, hubId?]
  const [path, setPath] = React.useState({ siteId: null, gatewayId: null, hubId: null });
  const [confirmAction, setConfirmAction] = React.useState(null);

  if (!path.siteId) return <DevicesSitesView mode={mode} onPick={(siteId) => setPath({ siteId, gatewayId: null, hubId: null })} />;

  const hw = FXHARDWARE.hardwareFor(path.siteId, mode);
  const site = FXDATA.SITES.find(s => s.id === path.siteId);
  const gw = path.gatewayId ? hw.zones.find(z => z.gateway.id === path.gatewayId)?.gateway : null;
  const zone = path.gatewayId ? hw.zones.find(z => z.gateway.id === path.gatewayId) : null;
  const hub = path.hubId && zone ? zone.hubs.find(h => h.id === path.hubId) : null;

  return (
    <div data-screen-label="Devices">
      <DevicesBreadcrumb path={path} site={site} gateway={gw} hub={hub} onNav={setPath} />

      {!path.gatewayId && <DevicesSiteView site={site} hw={hw} mode={mode} onOpenGateway={(gid) => setPath({ ...path, gatewayId: gid })} onConfirm={setConfirmAction} />}
      {path.gatewayId && !path.hubId && <DevicesGatewayView site={site} zone={zone} onOpenHub={(hid) => setPath({ ...path, hubId: hid })} onConfirm={setConfirmAction} />}
      {path.hubId && <DevicesHubView site={site} zone={zone} hub={hub} onConfirm={setConfirmAction} />}

      {confirmAction && <ConfirmActionModal action={confirmAction} onClose={() => setConfirmAction(null)} />}
    </div>
  );
}

// ——————————— Breadcrumb ———————————
function DevicesBreadcrumb({ path, site, gateway, hub, onNav }) {
  const crumbs = [
    { l: 'Devices', onClick: () => onNav({ siteId: null, gatewayId: null, hubId: null }) },
  ];
  if (site) crumbs.push({ l: `${site.city} — ${site.name}`, onClick: () => onNav({ siteId: site.id, gatewayId: null, hubId: null }) });
  if (gateway) crumbs.push({ l: gateway.id, onClick: () => onNav({ siteId: site.id, gatewayId: gateway.id, hubId: null }) });
  if (hub) crumbs.push({ l: hub.id });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12.5, color: 'var(--ink-500)' }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron-right" size={11} style={{ color: 'var(--ink-300)' }} />}
          {c.onClick ? (
            <button onClick={c.onClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: i === crumbs.length - 1 ? 'var(--ink-900)' : 'var(--ink-500)', fontSize: 12.5, fontWeight: 600, padding: 0 }}>{c.l}</button>
          ) : (
            <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>{c.l}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ——————————— Level 0 — sites grid ———————————
function DevicesSitesView({ mode, onPick }) {
  const sites = FXDATA.SITES;
  const allDevs = FXDATA.devicesFor(mode);

  // Group by region
  const byRegion = {};
  sites.forEach(s => {
    if (!byRegion[s.region]) byRegion[s.region] = [];
    byRegion[s.region].push(s);
  });

  // Global totals
  const total = sites.length;
  const issues = sites.filter(s => {
    return allDevs.some(d => d.site === s.id && d.status !== 'good');
  }).length;

  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Devices &amp; sensors</h1>
          <div className="page-hd__sub">Choose a location to drill into UDM · gateways · Kerong hubs · locks · sensors</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="refresh">Re-sweep all sites</Btn>
          <Btn kind="ghost" icon="paperclip">Export inventory</Btn>
        </div>
      </div>

      <div className="grid grid--4" style={{ marginBottom: 18 }}>
        <Kpi label="Locations" value={total} sub="Across 5 regions" />
        <Kpi label="Sites healthy" value={total - issues} sub={issues ? `${issues} need attention` : 'All green'} tone={issues > 0 ? 'bad' : 'good'} />
        <Kpi label="Devices polled" value="1 842" sub="Locks, hubs, gateways, UDMs, sensors" />
        <Kpi label="Avg latency" value="42 ms" sub="Last 5 min · all sites" delta={-8} />
      </div>

      {Object.keys(byRegion).map(region => (
        <div key={region} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8, paddingLeft: 2 }}>{region}</div>
          <div className="grid grid--3">
            {byRegion[region].map(s => <SiteCard key={s.id} site={s} devices={allDevs.filter(d => d.site === s.id)} onPick={() => onPick(s.id)} mode={mode} />)}
          </div>
        </div>
      ))}
    </>
  );
}

function SiteCard({ site, devices, onPick, mode }) {
  const issues = devices.filter(d => d.status !== 'good');
  const sev = issues.find(d => d.status === 'bad') ? 'bad' : issues.find(d => d.status === 'watch') ? 'watch' : 'good';
  const udm = FXHARDWARE.udmFor(site.id);

  return (
    <button onClick={onPick} style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-300)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ink-150)'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy-50)', color: 'var(--navy-900)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '-0.02em', flexShrink: 0 }}>{site.short}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>{site.city}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{site.name}</div>
        </div>
        <SevDot status={sev} />
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--ink-500)' }}>
        <span><Icon name="cpu" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{udm.model.split(' · ')[0]}</span>
        <span><Icon name="wifi" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{site.units} locks</span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-500)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="mono">{udm.ip}</span>
        <span>· uptime {udm.uptime}</span>
      </div>

      {issues.length > 0 && (
        <div style={{ background: sev === 'bad' ? 'var(--bad-50)' : 'var(--watch-50)', borderRadius: 6, padding: '6px 9px', fontSize: 11.5, color: sev === 'bad' ? 'var(--bad-700)' : 'var(--watch-700)', fontWeight: 500 }}>
          <Icon name="alert" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />
          {issues.length} device{issues.length > 1 ? 's' : ''} need{issues.length > 1 ? '' : 's'} attention
        </div>
      )}
    </button>
  );
}

// ——————————— Level 1 — site detail (UDM + gateways) ———————————
function DevicesSiteView({ site, hw, mode, onOpenGateway, onConfirm }) {
  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{site.city}</h1>
          <div className="page-hd__sub">{site.name} · {hw.totals.gateways} gateways · {hw.totals.hubs} hubs · {hw.totals.locks} locks</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="route">Open in UniFi</Btn>
          <Btn kind="ghost" icon="refresh">Re-sweep site</Btn>
        </div>
      </div>

      {/* UDM card */}
      <UdmPanel udm={hw.udm} site={site} mode={mode} onConfirm={onConfirm} />

      {/* Gateways grid */}
      <div style={{ marginTop: 18 }}>
        <SectionHeader title="Site gateways" sub={`PoE ports on the UDM · click a gateway to see its hubs`} />
        <div className="grid grid--3">
          {hw.zones.map(z => <GatewayCard key={z.gateway.id} zone={z} udm={hw.udm} onOpen={() => onOpenGateway(z.gateway.id)} onConfirm={onConfirm} />)}
        </div>
      </div>

      {/* Cabling diagram */}
      <div style={{ marginTop: 18 }}>
        <Card title="Wiring · live" icon="route" subtitle={`UDM ${hw.udm.model} → ${hw.totals.gateways} site gateways → ${hw.totals.hubs} Kerong hubs → ${hw.totals.locks} locks`}>
          <CablingDiagram hw={hw} site={site} />
        </Card>
      </div>
    </>
  );
}

function UdmPanel({ udm, site, mode, onConfirm }) {
  return (
    <Card padding={false}>
      <div style={{ padding: 18, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--navy-900)', color: 'white', display: 'grid', placeItems: 'center', flexShrink: 0, position: 'relative' }}>
          <Icon name="cpu" size={26} />
          <span style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: 'var(--good-600)', border: '2px solid white' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
            <h2 style={{ fontSize: 18 }}>{udm.model}</h2>
            <Badge tone="good" dot>Online</Badge>
            <Badge tone="info">Ubiquiti UniFi</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{site.city} — head of network · firmware {udm.firmware} · uptime {udm.uptime}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" kind="ghost" icon="eye">Live view</Btn>
          <Btn size="sm" kind="ghost" icon="history">Logs</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--ink-150)' }}>
        <UdmStat lbl="IP · LAN" val={<span className="mono">{udm.ip}</span>} />
        <UdmStat lbl="MAC" val={<span className="mono">{udm.mac}</span>} />
        <UdmStat lbl="WAN" val={udm.wan} />
        <UdmStat lbl="Throughput · 5m" val={<><span className="bold">{(45 + Math.random() * 35).toFixed(1)}</span> Mbps</>} />
        <UdmStat lbl="Clients" val="14" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--ink-150)' }}>
        <UdmStat lbl="CPU" val="12%" tone="good" />
        <UdmStat lbl="Memory" val="38%" tone="good" />
        <UdmStat lbl="PoE budget" val={mode === 'crisis' && site.id === 'eikestad' ? '94 / 150W' : '68 / 150W'} tone="good" />
        <UdmStat lbl="Last config" val="3 days ago · Geir" />
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--ink-150)', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--ink-50)' }}>
        <Btn size="sm" kind="ghost" icon="refresh" onClick={() => onConfirm({ kind: 'reboot-udm', target: site.city, blast: `all ${udm.model} downstream` })}>Reboot UDM</Btn>
        <Btn size="sm" kind="ghost" icon="zap" onClick={() => onConfirm({ kind: 'cycle-all-poe', target: site.city, blast: 'all PoE ports' })}>Cycle all PoE</Btn>
        <Btn size="sm" kind="ghost" icon="route">Trace from HQ</Btn>
        <Btn size="sm" kind="ghost" icon="shield">Firmware update</Btn>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)', alignSelf: 'center' }}>
          <Icon name="sparkles" size={11} style={{ verticalAlign: -2, marginRight: 4, color: 'var(--ai-600)' }} />
          AI: <b>UDM is healthy</b> — no action recommended.
        </span>
      </div>
    </Card>
  );
}

function UdmStat({ lbl, val, tone }) {
  return (
    <div style={{ padding: '12px 14px', borderRight: '1px solid var(--ink-150)', minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{lbl}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: tone === 'good' ? 'var(--good-700)' : 'var(--ink-900)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
    </div>
  );
}

function GatewayCard({ zone, udm, onOpen, onConfirm }) {
  const gw = zone.gateway;
  return (
    <div
      onClick={onOpen}
      role="button"
      style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: 14, position: 'relative', cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink-300)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ink-150)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--ink-100)', color: 'var(--ink-600)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="wifi" size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{zone.zoneLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)' }} className="mono">{gw.id}</div>
        </div>
        <SevDot status={gw.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11.5, color: 'var(--ink-600)', padding: '8px 10px', background: 'var(--ink-50)', borderRadius: 7, marginBottom: 10 }}>
        <div><span className="muted">UDM port:</span> <b>PoE {zone.poePort}</b></div>
        <div><span className="muted">Power:</span> <b>{zone.poeWattage}</b></div>
        <div><span className="muted">IP:</span> <span className="mono">{gw.ip}</span></div>
        <div><span className="muted">Uptime:</span> {gw.uptime}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 8 }}>
        <span><Icon name="grid" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{zone.hubs.length} hubs</span>
        <span><Icon name="door" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{zone.hubs.reduce((a, h) => a + h.locks.length, 0)} locks</span>
        <span><Icon name="sensor" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{zone.hubs.reduce((a, h) => a + h.sensors.length, 0)} sensors</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" kind="ghost" icon="arrow-right" onClick={(e) => { e.stopPropagation(); onOpen(); }}>Hubs</Btn>
        <Btn size="sm" kind="quiet" icon="zap" onClick={(e) => { e.stopPropagation(); onConfirm({ kind: 'cycle-poe', target: `${zone.zoneLabel} (port ${zone.poePort})`, blast: `${zone.hubs.length} hubs · ${zone.hubs.reduce((a, h) => a + h.locks.length, 0)} locks will reboot` }); }}>Cycle PoE</Btn>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ——————————— Level 2 — gateway detail (hubs) ———————————
function DevicesGatewayView({ site, zone, onOpenHub, onConfirm }) {
  const gw = zone.gateway;

  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{zone.zoneLabel}</h1>
          <div className="page-hd__sub"><span className="mono">{gw.id}</span> · {site.city} · UDM PoE port {zone.poePort}</div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="history">Ping history</Btn>
          <Btn kind="ghost" icon="refresh" onClick={() => onConfirm({ kind: 'reboot-gateway', target: gw.id, blast: `${zone.hubs.length} hubs · ${zone.hubs.reduce((a, h) => a + h.locks.length, 0)} locks` })}>Reboot gateway</Btn>
          <Btn kind="accent" icon="zap" onClick={() => onConfirm({ kind: 'cycle-poe', target: `${zone.zoneLabel} (port ${zone.poePort})`, blast: `${zone.hubs.length} hubs · ${zone.hubs.reduce((a, h) => a + h.locks.length, 0)} locks will reboot`, segment: true })}>Cycle PoE port {zone.poePort}</Btn>
        </div>
      </div>

      {/* Gateway data */}
      <Card padding={false} style={{ marginBottom: 18 }}>
        <div style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: gw.status === 'bad' ? 'var(--bad-50)' : gw.status === 'watch' ? 'var(--watch-50)' : 'var(--good-50)', color: gw.status === 'bad' ? 'var(--bad-700)' : gw.status === 'watch' ? 'var(--watch-700)' : 'var(--good-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name="wifi" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15 }}>{gw.model}</h3>
              <Badge tone={gw.status === 'bad' ? 'bad' : gw.status === 'watch' ? 'watch' : 'good'} dot>{gw.status === 'bad' ? 'Offline' : gw.status === 'watch' ? 'Degraded' : 'Online'}</Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>firmware {gw.firmware} · last ping {gw.lastPing}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--ink-150)' }}>
          <UdmStat lbl="IP" val={<span className="mono">{gw.ip}</span>} />
          <UdmStat lbl="MAC" val={<span className="mono">{gw.macSuffix}</span>} />
          <UdmStat lbl="Upstream port" val={`UDM · PoE ${zone.poePort}`} />
          <UdmStat lbl="Power draw" val={zone.poeWattage} />
          <UdmStat lbl="RS-485 bus" val={`${zone.hubs.length} devices`} />
        </div>
      </Card>

      <SectionHeader title="Hubs on this gateway" sub={`Daisy-chained over RS-485 · click a hub to drill into locks, sensors and lights`} />

      <Card padding={false}>
        <table className="tbl">
          <thead><tr><th></th><th>Hub</th><th>Model</th><th>RS-485 address</th><th>Locks</th><th>Sensors</th><th>Lights</th><th>Power draw</th><th>Last ping</th><th></th></tr></thead>
          <tbody>
            {zone.hubs.map(h => (
              <tr key={h.id} onClick={() => onOpenHub(h.id)} style={{ cursor: 'pointer' }}>
                <td style={{ width: 14, paddingRight: 0 }}><SevDot status={h.status} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--ink-100)', display: 'grid', placeItems: 'center', color: 'var(--ink-600)' }}><Icon name="cpu" size={12} /></span>
                    <div>
                      <div style={{ fontWeight: 600 }} className="mono">{h.id}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{h.isMaster ? 'Master · daisy head' : `Slave · position ${h.daisyChainPos}`}</div>
                    </div>
                  </div>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>{h.model}</td>
                <td className="mono">0x{h.rs485Address.toString(16).padStart(2, '0').toUpperCase()}</td>
                <td className="num bold">{h.locks.length}</td>
                <td className="num">{h.sensors.length}</td>
                <td className="num">{h.lights.length}</td>
                <td className="muted" style={{ fontSize: 12 }}>{h.powerDraw}</td>
                <td className="muted">{h.lastPing}</td>
                <td className="right"><Icon name="chevron-right" size={13} style={{ color: 'var(--ink-400)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ——————————— Level 3 — hub detail (locks, sensors, lights) ———————————
function DevicesHubView({ site, zone, hub, onConfirm }) {
  const [tab, setTab] = React.useState('locks');

  return (
    <>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{hub.id}</h1>
          <div className="page-hd__sub">{hub.model} · {zone.zoneLabel} · {site.city} · RS-485 addr <span className="mono">0x{hub.rs485Address.toString(16).padStart(2, '0').toUpperCase()}</span></div>
        </div>
        <div className="page-hd__actions">
          <Btn kind="ghost" icon="history">Logs</Btn>
          <Btn kind="ghost" icon="refresh" onClick={() => onConfirm({ kind: 'reboot-hub', target: hub.id, blast: `${hub.locks.length} locks on this hub will reset` })}>Reboot hub</Btn>
          <Btn kind="ghost" icon="shield">Firmware</Btn>
        </div>
      </div>

      {/* Hub overview */}
      <Card padding={false} style={{ marginBottom: 18 }}>
        <div style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: hub.status === 'bad' ? 'var(--bad-50)' : hub.status === 'watch' ? 'var(--watch-50)' : 'var(--good-50)', color: hub.status === 'bad' ? 'var(--bad-700)' : hub.status === 'watch' ? 'var(--watch-700)' : 'var(--good-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name="cpu" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 15 }}>Kerong 16-channel control unit</h3>
              <Badge tone={hub.status === 'bad' ? 'bad' : hub.status === 'watch' ? 'watch' : 'good'} dot>{hub.status === 'bad' ? 'Offline' : hub.status === 'watch' ? 'Degraded' : 'Online'}</Badge>
              {hub.isMaster && <Badge tone="info">Master</Badge>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>firmware {hub.firmware} · last ping {hub.lastPing}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid var(--ink-150)' }}>
          <UdmStat lbl="Locks" val={`${hub.locks.length} / 16 ports used`} />
          <UdmStat lbl="Sensors" val={`${hub.sensors.length} · AUX bus`} />
          <UdmStat lbl="Lights" val={`${hub.lights.length} · 24V rail`} />
          <UdmStat lbl="Upstream" val={<span><span className="mono">{zone.gateway.id}</span></span>} />
          <UdmStat lbl="Power" val={hub.powerDraw} />
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'locks',   label: 'Locks', count: hub.locks.length },
          { id: 'sensors', label: 'Sensors', count: hub.sensors.length },
          { id: 'lights',  label: 'Lights', count: hub.lights.length },
          { id: 'wiring',  label: 'Wiring' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'locks'   && <LocksGrid hub={hub} onConfirm={onConfirm} />}
      {tab === 'sensors' && <SensorsList hub={hub} />}
      {tab === 'lights'  && <LightsList hub={hub} onConfirm={onConfirm} />}
      {tab === 'wiring'  && <HubWiring hub={hub} zone={zone} />}
    </>
  );
}

function LocksGrid({ hub, onConfirm }) {
  return (
    <Card title="Lock ports" count={hub.locks.length} subtitle="Each port wires to one storage unit door · click for details">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {hub.locks.map(l => <LockTile key={l.id} lock={l} hub={hub} onConfirm={onConfirm} />)}
      </div>
    </Card>
  );
}

function LockTile({ lock, hub, onConfirm }) {
  const [open, setOpen] = React.useState(false);
  const color = lock.status === 'bad' ? 'var(--bad-600)' : lock.status === 'watch' ? 'var(--watch-600)' : 'var(--good-600)';
  return (
    <div style={{ border: '1px solid var(--ink-150)', borderRadius: 8, padding: 12, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase', color: 'var(--ink-500)' }}>Port {String(lock.port).padStart(2, '0')}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }} className="mono">{lock.unit}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{lock.lastEvent}</div>
      <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
        <Btn size="sm" kind="ghost" icon="unlock" title="Remote unlock" />
        <Btn size="sm" kind="quiet" icon="zap" title="Cycle port" onClick={() => onConfirm({ kind: 'cycle-lock', target: `${hub.id} · Port ${String(lock.port).padStart(2, '0')}`, blast: `Unit ${lock.unit} door will re-init (~30s)` })} />
        <Btn size="sm" kind="quiet" icon="history" title="History" />
      </div>
    </div>
  );
}

function SensorsList({ hub }) {
  if (hub.sensors.length === 0) {
    return <Card><Empty icon="sensor" title="No sensors on this hub" sub="Sensors wire to the AUX bus on the master hub of each zone." /></Card>;
  }
  return (
    <Card title="Sensors · AUX bus" count={hub.sensors.length} padding={false}>
      <table className="tbl">
        <thead><tr><th></th><th>Sensor</th><th>Kind</th><th>AUX port</th><th>Reading</th><th></th></tr></thead>
        <tbody>
          {hub.sensors.map(s => (
            <tr key={s.id}>
              <td style={{ width: 14, paddingRight: 0 }}><SevDot status={s.status} /></td>
              <td><div style={{ fontWeight: 500 }}>{s.label}</div><div className="muted mono" style={{ fontSize: 11 }}>{s.id}</div></td>
              <td className="muted" style={{ textTransform: 'capitalize' }}>{s.kind}</td>
              <td className="mono">{s.port}</td>
              <td><span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: s.status === 'good' ? 'var(--ink-900)' : s.status === 'watch' ? 'var(--watch-700)' : 'var(--bad-700)' }}>{s.value}</span></td>
              <td className="right"><Btn size="sm" kind="quiet" icon="history">History</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function LightsList({ hub, onConfirm }) {
  if (hub.lights.length === 0) {
    return <Card><Empty icon="zap" title="No lights wired to this hub" sub="Lighting circuits are on the master hub's 24V output rail." /></Card>;
  }
  return (
    <Card title="Lighting circuits" count={hub.lights.length} padding={false}>
      <table className="tbl">
        <thead><tr><th></th><th>Circuit</th><th>Port</th><th>State</th><th>Wattage</th><th></th></tr></thead>
        <tbody>
          {hub.lights.map(l => (
            <tr key={l.id}>
              <td style={{ width: 14, paddingRight: 0 }}><SevDot status={l.status} /></td>
              <td><div style={{ fontWeight: 500 }}>{l.label}</div><div className="muted mono" style={{ fontSize: 11 }}>{l.id}</div></td>
              <td className="mono">{l.port}</td>
              <td className="muted">{l.state}</td>
              <td className="num">{l.wattage}</td>
              <td className="right">
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Btn size="sm" kind="ghost">Toggle</Btn>
                  <Btn size="sm" kind="quiet" icon="zap" onClick={() => onConfirm({ kind: 'cycle-light', target: l.id, blast: `${l.label} will reboot` })} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function HubWiring({ hub, zone }) {
  return (
    <Card title="Hub wiring" icon="route">
      <div style={{ background: 'var(--ink-50)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginBottom: 14 }}>How this hub is wired into the network</div>
        <WireRow lhs="UDM · PoE port" lhsVal={`Port ${zone.poePort}`} arrow="ethernet" rhs="Site Gateway" rhsVal={zone.gateway.id} />
        <WireRow lhs="Site Gateway · RS-485 OUT" lhsVal="A+/B-" arrow="rs485" rhs="This hub · IN" rhsVal={`addr 0x${hub.rs485Address.toString(16).padStart(2, '0').toUpperCase()}`} />
        <WireRow lhs="This hub · 16 lock ports" lhsVal="P01–P16" arrow="cable" rhs="Lock solenoids" rhsVal={`${hub.locks.length} doors`} />
        <WireRow lhs="This hub · AUX bus" lhsVal="AUX-1..4" arrow="cable" rhs="Sensors" rhsVal={`${hub.sensors.length} devices`} />
        <WireRow lhs="This hub · LIGHT rail" lhsVal="24V DC" arrow="cable" rhs="LED circuits" rhsVal={`${hub.lights.length} circuits`} />
      </div>
    </Card>
  );
}

function WireRow({ lhs, lhsVal, arrow, rhs, rhsVal }) {
  const arrowLabel = { ethernet: 'Cat6 PoE+', rs485: 'RS-485 twisted pair · 12V DC', cable: '2-wire' }[arrow];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--ink-150)' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{lhs}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }} className="mono">{lhsVal}</div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 9.5, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: 0.06, fontWeight: 600, marginBottom: 2 }}>{arrowLabel}</div>
        <div style={{ position: 'relative', height: 2, background: 'var(--ink-300)', borderRadius: 1 }}>
          <span style={{ position: 'absolute', right: -1, top: -4, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '7px solid var(--ink-300)' }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{rhs}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }} className="mono">{rhsVal}</div>
      </div>
    </div>
  );
}

// ——————————— Cabling diagram (overview level) ———————————
function CablingDiagram({ hw, site }) {
  const width = 1000;
  const udmX = 80, udmY = 50;
  const gwY = 220;
  const hubY = 360;

  const gwGap = (width - 160) / Math.max(1, hw.zones.length);
  const hubGap = 50; // visual padding inside each gateway group

  return (
    <svg viewBox={`0 0 ${width} 460`} style={{ width: '100%', height: 'auto', maxHeight: 460 }}>
      {/* UDM */}
      <rect x={udmX - 60} y={udmY - 22} width="120" height="44" rx="8" fill="var(--navy-900)" />
      <text x={udmX} y={udmY + 1} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="var(--font-display)">UDM Pro</text>
      <text x={udmX} y={udmY + 13} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9.5" fontFamily="var(--font-mono)">{hw.udm.ip}</text>

      {hw.zones.map((z, gi) => {
        const gwX = 100 + gwGap * gi + gwGap / 2;
        const c = z.gateway.status === 'bad' ? 'var(--bad-600)' : z.gateway.status === 'watch' ? 'var(--watch-600)' : 'var(--good-600)';
        return (
          <g key={z.gateway.id}>
            {/* line UDM -> GW */}
            <path d={`M ${udmX} ${udmY + 22} C ${udmX} ${gwY - 60} ${gwX} ${gwY - 60} ${gwX} ${gwY - 22}`} fill="none" stroke="var(--ink-300)" strokeWidth="1.4" />
            <text x={(udmX + gwX) / 2} y={gwY - 70} textAnchor="middle" fontSize="9" fill="var(--ink-500)" fontWeight="600">PoE {z.poePort}</text>

            {/* gateway pill */}
            <rect x={gwX - 70} y={gwY - 22} width="140" height="44" rx="7" fill="white" stroke={c} strokeWidth="1.5" />
            <text x={gwX} y={gwY - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink-900)" fontFamily="var(--font-mono)">{z.gateway.id}</text>
            <text x={gwX} y={gwY + 11} textAnchor="middle" fontSize="9.5" fill="var(--ink-500)" fontFamily="var(--font-mono)">{z.gateway.ip}</text>

            {/* hubs */}
            {z.hubs.map((h, hi) => {
              const hubX = gwX - 50 + (hi - (z.hubs.length - 1) / 2) * 50;
              const hc = h.status === 'bad' ? 'var(--bad-600)' : h.status === 'watch' ? 'var(--watch-600)' : 'var(--good-600)';
              return (
                <g key={h.id}>
                  <path d={`M ${gwX} ${gwY + 22} L ${hubX} ${hubY - 18}`} fill="none" stroke="var(--ink-300)" strokeWidth="1.2" strokeDasharray={h.isMaster ? '' : '3 2'} />
                  <rect x={hubX - 22} y={hubY - 18} width="44" height="36" rx="5" fill="white" stroke={hc} strokeWidth="1.4" />
                  <text x={hubX} y={hubY - 2} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink-900)" fontFamily="var(--font-mono)">{h.id.slice(-5)}</text>
                  <text x={hubX} y={hubY + 10} textAnchor="middle" fontSize="8" fill="var(--ink-500)">{h.locks.length} locks</text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 430)">
        <text x={0} y={0} fontSize="10" fill="var(--ink-500)" fontWeight="600">RS-485 daisy chain (master → slave)</text>
        <line x1={210} y1={-4} x2={240} y2={-4} stroke="var(--ink-300)" strokeWidth="1.2" strokeDasharray="3 2" />
      </g>
    </svg>
  );
}

// ——————————— Confirm modal for power actions ———————————
function ConfirmActionModal({ action, onClose }) {
  if (!action) return null;
  const labels = {
    'cycle-poe':       { title: 'Power-cycle PoE port',  verb: 'Cycle',  blastTone: 'bad' },
    'cycle-all-poe':   { title: 'Cycle all PoE ports',   verb: 'Cycle',  blastTone: 'bad' },
    'cycle-lock':      { title: 'Cycle lock port',       verb: 'Cycle',  blastTone: 'watch' },
    'cycle-light':     { title: 'Cycle light circuit',   verb: 'Cycle',  blastTone: 'watch' },
    'reboot-udm':      { title: 'Reboot UDM',            verb: 'Reboot', blastTone: 'bad' },
    'reboot-gateway':  { title: 'Reboot site gateway',   verb: 'Reboot', blastTone: 'bad' },
    'reboot-hub':      { title: 'Reboot Kerong hub',     verb: 'Reboot', blastTone: 'watch' },
  };
  const cfg = labels[action.kind] || labels['cycle-poe'];

  return (
    <Modal
      open
      onClose={onClose}
      title={cfg.title}
      subtitle={action.target}
      width={520}
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="accent" icon="zap" onClick={onClose}>{cfg.verb} now</Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: 12, background: cfg.blastTone === 'bad' ? 'var(--bad-50)' : 'var(--watch-50)', color: cfg.blastTone === 'bad' ? 'var(--bad-700)' : 'var(--watch-700)', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
          <Icon name="alert" size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          <b>Blast radius:</b> {action.blast}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-700)' }}>
          {action.kind === 'cycle-poe' && <>Sending PoE off for 5s then back on. Hubs downstream will re-establish their RS-485 chain (~30s). Customers on this segment will not be able to unlock until ack.</>}
          {action.kind === 'cycle-all-poe' && <>All PoE ports will be cycled simultaneously. <b>Whole site will be offline for ~45 seconds.</b> Use only when site is unresponsive.</>}
          {action.kind === 'cycle-lock' && <>Power-cycling a single solenoid. Useful when a lock is stuck. No effect on other units.</>}
          {action.kind === 'cycle-light' && <>Will toggle 24V rail for this circuit only.</>}
          {action.kind === 'reboot-udm' && <>SSH-issuing <span className="mono">reboot</span> to the UDM Pro. Whole site goes offline for ~90s. Door access will fail closed during that window.</>}
          {action.kind === 'reboot-gateway' && <>Issuing soft-reboot via the management agent. Should be back in 25s. Locks queued offline meanwhile.</>}
          {action.kind === 'reboot-hub' && <>Re-initialising the Kerong control unit. RS-485 chain will reset; downstream slave hubs may briefly mirror.</>}
        </div>
        <div className="ai-card" style={{ padding: 12 }}>
          <div className="ai-card__icon" style={{ width: 26, height: 26 }}><Icon name="sparkles" size={13} /></div>
          <div className="ai-card__bd">
            <div className="ai-card__meta">AI · pre-flight</div>
            <div className="ai-card__title">3 customers might be at the gate</div>
            <div className="ai-card__reason">In the next 10 min, our schedule has <b>2 move-ins</b> and <b>1 walk-in</b> at this site. Want me to send a heads-up "we'll be back in 30s" via WhatsApp?</div>
            <div className="ai-card__actions">
              <Btn size="sm" kind="ai" icon="send">Yes · send heads-up</Btn>
              <Btn size="sm" kind="ghost">No, just cycle</Btn>
            </div>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-700)' }}>
          <input type="checkbox" /> Log this action with reason
        </label>
      </div>
    </Modal>
  );
}

window.DevicesScreen = DevicesScreen;
