/* ============================================================
   Hardware topology
   The realistic stack at every Flexistore site:

     UDM (Ubiquiti Dream Machine Pro)
       └─ PoE port (Zone) ─→ Site Gateway
                              └─ Kerong hub (master)
                                  └─ Kerong hub (slave, daisy)
                                      └─ Kerong hub (slave, daisy)
                                          └─ Locks · Sensors · Lights

   Each PoE "zone" can be power-cycled by the operator. That restarts
   the entire downstream chain in one go.
   ============================================================ */

// ——————————— UDM + zones per site ———————————
// One UDM-Pro per site (8 PoE ports). We use 4 of them on most sites.
function udmFor(siteId) {
  const map = {
    bellville:  { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '38d',  wan: 'Frogfoot fibre + LTE backup',   ip: '10.220.0.1',  mac: 'F4:E2:C7:B2:11:01' },
    megapark:   { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '64d',  wan: 'Webafrica fibre',               ip: '10.221.0.1',  mac: 'F4:E2:C7:B2:11:02' },
    rivonia:    { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '47d',  wan: 'Vumatel fibre + Vodacom LTE',   ip: '10.149.0.1',  mac: 'F4:E2:C7:B2:11:03' },
    randburg:   { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '23d',  wan: 'Openserve fibre',               ip: '10.150.0.1',  mac: 'F4:E2:C7:B2:11:04' },
    rosebank:   { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '94d',  wan: 'Openserve fibre + LTE backup',  ip: '10.92.0.1',   mac: 'F4:E2:C7:B2:11:05' },
    epsom:      { model: 'UDM SE · 8-PoE',      firmware: '3.2.6',  uptime: '7d',   wan: 'Mweb fibre · primary',          ip: '10.103.0.1',  mac: 'F4:E2:C7:B2:11:06' },
    marshall:   { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '112d', wan: 'Vumatel fibre + Telkom LTE',    ip: '10.104.0.1',  mac: 'F4:E2:C7:B2:11:07' },
    rembrandt:  { model: 'UDM Pro · 8-PoE',     firmware: '3.2.6',  uptime: '184d', wan: 'Mweb fibre',                    ip: '10.101.0.1',  mac: 'F4:E2:C7:B2:11:08' },
    cellars:    { model: 'UDM Base · 4-PoE',    firmware: '3.2.10', uptime: '52d',  wan: 'Vodacom LTE primary',           ip: '10.102.0.1',  mac: 'F4:E2:C7:B2:11:09' },
    eikestad:   { model: 'UDM Pro · 8-PoE',     firmware: '3.2.8',  uptime: '12d',  wan: 'Vumatel fibre',                 ip: '10.68.0.1',   mac: 'F4:E2:C7:B2:11:0A' },
    riverside:  { model: 'UDM Pro · 8-PoE',     firmware: '3.2.10', uptime: '8d',   wan: 'Vodacom LTE primary',           ip: '10.45.0.1',   mac: 'F4:E2:C7:B2:11:0B' },
  };
  return map[siteId] || map.rosebank;
}

// ——————————— Site hardware tree ———————————
// We generate hubs + locks based on the unit count, with realistic Kerong specs
// (16 locks per hub board, daisy-chain up to 4 boards per gateway).

function hardwareFor(siteId, mode) {
  const site = (window.FXDATA?.SITES || []).find(s => s.id === siteId);
  if (!site) return null;

  // Hub naming: ${site.short}-HUB-01 ... master, then daisied slaves
  // Each hub: 16 locks
  const unitsPerHub = 16;
  const totalHubs = Math.ceil(site.units / unitsPerHub);
  // Split into gateways: max 3 hubs per gateway
  const hubsPerGateway = 3;
  const gatewayCount = Math.ceil(totalHubs / hubsPerGateway);

  // PoE zones (each gateway sits on one PoE port)
  const zones = [];
  for (let g = 0; g < gatewayCount; g++) {
    const zoneId = `Z${g + 1}`;
    const zoneLetter = ['A', 'B', 'C', 'D'][g] || 'X';
    const poePort = g + 1; // PoE ports 1..N
    const gwId = `${site.short}-GW-${String(g + 1).padStart(2, '0')}`;

    // hubs for this gateway
    const hubCount = Math.min(hubsPerGateway, totalHubs - g * hubsPerGateway);
    const hubs = [];
    for (let h = 0; h < hubCount; h++) {
      const hubIdx = g * hubsPerGateway + h;
      const hubId = `${site.short}-HUB-${String(hubIdx + 1).padStart(2, '0')}`;
      const isMaster = h === 0;
      const daisyChainPos = h; // 0 = master, 1..3 = slaves

      // 16 locks per hub
      const startUnit = hubIdx * unitsPerHub;
      const endUnit = Math.min(startUnit + unitsPerHub, site.units);
      const lockCount = endUnit - startUnit;

      const locks = [];
      for (let l = 0; l < lockCount; l++) {
        const port = l + 1;
        const unitNum = startUnit + l + 1;
        const unitLabel = `${zoneLetter}-${String(unitNum % 100).padStart(2, '0')}`;
        const occupied = Math.random() < site.occ;
        // Introduce a few faulty locks in crisis mode + occasional issues
        let status = 'good';
        let lastEvent = '2h ago · NFC tap';
        if (mode === 'crisis' && siteId === 'rivonia' && g === 0 && h === 0 && l < 4) {
          status = 'bad';
          lastEvent = 'No response · 4h';
        } else if (mode === 'crisis' && siteId === 'eikestad' && g === 1 && l === 8) {
          status = 'watch';
          lastEvent = 'Slow ack · 312ms';
        } else if (siteId === 'rosebank' && g === 0 && h === 0 && l === 7) {
          status = 'watch';
          lastEvent = 'Battery 18% · backup mode';
        } else if (siteId === 'eikestad' && g === 1 && h === 1 && l === 14) {
          status = 'watch';
          lastEvent = 'Lock motor wear detected';
        }

        locks.push({
          id: `${hubId}-P${String(port).padStart(2, '0')}`,
          port, unit: unitLabel, status, occupied,
          lastEvent,
          firmware: 'KR-A8 1.4.2',
        });
      }

      // Sensors per hub (a few)
      const sensors = [];
      if (isMaster) {
        sensors.push({ id: `${hubId}-S01`, kind: 'temp',  port: 'AUX-1', value: mode === 'crisis' && siteId === 'eikestad' && g === 1 ? '32.4°C' : '22.4°C', status: mode === 'crisis' && siteId === 'eikestad' && g === 1 ? 'watch' : 'good', label: `Temp · zone ${zoneLetter}` });
        sensors.push({ id: `${hubId}-S02`, kind: 'humid', port: 'AUX-2', value: mode === 'crisis' && siteId === 'eikestad' ? '78%' : '63%', status: mode === 'crisis' && siteId === 'eikestad' ? 'watch' : 'good', label: `Humidity · zone ${zoneLetter}` });
        sensors.push({ id: `${hubId}-S03`, kind: 'smoke', port: 'AUX-3', value: 'clear', status: 'good', label: `Smoke · zone ${zoneLetter}` });
        if (g === 0) sensors.push({ id: `${hubId}-S04`, kind: 'motion', port: 'AUX-4', value: 'idle', status: 'good', label: 'Motion · main aisle' });
      }

      // Lights per hub (LED strips)
      const lights = [];
      if (isMaster) {
        lights.push({ id: `${hubId}-L01`, port: 'LIGHT-1', label: `Aisle ${zoneLetter} · LED strip`, status: 'good', state: 'auto · motion', wattage: '24W' });
        lights.push({ id: `${hubId}-L02`, port: 'LIGHT-2', label: `Entrance ${zoneLetter} · spot`,     status: 'good', state: 'on · 18:00-06:00', wattage: '8W' });
      }
      if (h === hubCount - 1 && g === 0) {
        lights.push({ id: `${hubId}-L03`, port: 'LIGHT-3', label: 'Emergency exit', status: 'good', state: 'always on', wattage: '4W' });
      }

      // Hub overall status — derived from worst child + crisis-mode overrides
      let hubStatus = 'good';
      if (mode === 'crisis' && siteId === 'rivonia' && g === 0 && h === 0) hubStatus = 'bad';
      else if (locks.some(l => l.status === 'bad')) hubStatus = 'bad';
      else if (locks.some(l => l.status === 'watch') || sensors.some(s => s.status === 'watch')) hubStatus = 'watch';

      hubs.push({
        id: hubId,
        model: 'Kerong KR-CU16 · 16-channel',
        firmware: 'CU16 v3.2',
        isMaster, daisyChainPos,
        rs485Address: 0x01 + h,
        locks, sensors, lights,
        status: hubStatus,
        lastPing: hubStatus === 'bad' ? '5h ago' : hubStatus === 'watch' ? '2m ago · slow' : '40s ago',
        powerDraw: `${(0.8 + lockCount * 0.05).toFixed(1)}A @ 12V DC`,
      });
    }

    // Gateway status derived from its hubs + crisis overrides
    let gwStatus = 'good';
    if (mode === 'crisis' && siteId === 'rivonia' && g === 0) gwStatus = 'bad';
    else if (mode === 'crisis' && siteId === 'eikestad' && g === 1) gwStatus = 'watch';
    else if (hubs.some(h => h.status === 'bad')) gwStatus = 'bad';
    else if (hubs.some(h => h.status === 'watch')) gwStatus = 'watch';

    zones.push({
      zoneId,
      zoneLabel: `Zone ${zoneLetter}`,
      poePort,
      poeWattage: `${24 + hubs.length * 6}W / 30W`,
      gateway: {
        id: gwId,
        model: 'Flexistore Site Gateway · v2',
        firmware: 'FXSG 4.1.2',
        ip: `10.${siteId.charCodeAt(0)}.${10 + g}.1`,
        macSuffix: gwId.slice(-2) + ':' + gwId.slice(-4, -2),
        status: gwStatus,
        uptime: gwStatus === 'bad' ? '0h' : gwStatus === 'watch' ? '8d' : '47d',
        lastPing: gwStatus === 'bad' ? '5h ago' : gwStatus === 'watch' ? '2m ago' : '40s ago',
      },
      hubs,
    });
  }

  // VIP units (premium / high-security tier)
  // mark some as VIP — we'll surface this in the unit list
  return {
    udm: udmFor(siteId),
    zones,
    totals: {
      gateways: zones.length,
      hubs: zones.reduce((a, z) => a + z.hubs.length, 0),
      locks: zones.reduce((a, z) => a + z.hubs.reduce((b, h) => b + h.locks.length, 0), 0),
      sensors: zones.reduce((a, z) => a + z.hubs.reduce((b, h) => b + h.sensors.length, 0), 0),
      lights: zones.reduce((a, z) => a + z.hubs.reduce((b, h) => b + h.lights.length, 0), 0),
    },
  };
}

window.FXHARDWARE = { hardwareFor, udmFor };
