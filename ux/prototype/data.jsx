/* ============================================================
   Flexistore — mock data
   Three modes: busy / quiet / crisis. The cockpit, inbox, devices
   and AI activity log all change shape based on `MODE`.
   ============================================================ */

// —————————————————————— Sites ——————————————————————
const SITES = [
  // Cape Town
  { id: 'bellville',  short: 'BVL', name: 'Bellville',           city: 'Bellville',       region: 'Cape Town',   units: 168, occ: 0.88 },
  { id: 'megapark',   short: 'MGP', name: 'Mega Park',           city: 'Bellville South', region: 'Cape Town',   units: 112, occ: 0.81 },
  // Johannesburg
  { id: 'rivonia',    short: 'RIV', name: 'Edenburg Terraces',   city: 'Rivonia',         region: 'Johannesburg', units: 124, occ: 0.91 },
  { id: 'randburg',   short: 'RDB', name: 'Randburg',            city: 'Randburg',        region: 'Johannesburg', units: 142, occ: 0.86 },
  { id: 'rosebank',   short: 'RBK', name: 'Rosebank Mall',       city: 'Rosebank',        region: 'Johannesburg', units: 178, occ: 0.83 },
  { id: 'epsom',      short: 'EPS', name: 'Epsom Downs',         city: 'Epsom Downs',     region: 'Johannesburg', units: 96,  occ: 0.69 },
  { id: 'marshall',   short: 'MSH', name: 'Marshalltown',        city: 'Marshalltown',    region: 'Johannesburg', units: 154, occ: 0.74 },
  // Paarl
  { id: 'rembrandt',  short: 'RMB', name: 'Rembrandt Mall',      city: 'Paarl',           region: 'Paarl',       units: 96,  occ: 0.77 },
  { id: 'cellars',    short: 'CLR', name: 'The Cellars',         city: 'Paarl',           region: 'Paarl',       units: 84,  occ: 0.72 },
  // Stellenbosch
  { id: 'eikestad',   short: 'EIK', name: 'Eikestad Mall',       city: 'Stellenbosch',    region: 'Stellenbosch', units: 142, occ: 0.92 },
  // Mbombela
  { id: 'riverside',  short: 'RVS', name: 'Riverside Junction',  city: 'Mbombela',        region: 'Mbombela',    units: 134, occ: 0.61 },
];

// —————————————————————— People ——————————————————————
// SA-flavoured names; mix of individual + business
const PEOPLE = [
  { id: 'C-24551', first: 'Tinus',   last: 'Greyling',  email: 'tinus.g@gmail.com',     phone: '+27 82 555 1142', site: 'rosebank',  unit: 'D-08', plan: 5, type: 'individual' },
  { id: 'C-24552', first: 'Megan',   last: 'Roberts',   email: 'm.roberts@outlook.com', phone: '+27 73 880 0214', site: 'rosebank',  unit: 'E-11', plan: 5, type: 'individual' },
  { id: 'C-24553', first: 'Marilet', last: 'Theron',    email: 'mlet11xd@gmail.com',    phone: '+27 73 844 0802', site: 'eikestad',  unit: '058',  plan: 4, type: 'individual' },
  { id: 'C-24554', first: 'Johan',   last: 'Pretorius', email: 'jpretorius@iafrica.com',phone: '+27 84 122 9981', site: null,        unit: null,   plan: 16, type: 'lead' },
  { id: 'C-24555', first: 'Thandi',  last: 'Mokoena',   email: 'thandi.m@gmail.com',    phone: '+27 71 904 2207', site: null,        unit: null,   plan: 5,  type: 'lead' },
  { id: 'C-24556', first: 'Sipho',   last: 'Dlamini',   email: 'sdlamini@dlaminigp.co.za',phone: '+27 83 661 1100', site: 'bellville', unit: 'A-22', plan: 10, type: 'business', company: 'Dlamini Group' },
  { id: 'C-24557', first: 'Kerry',   last: 'van Wyk',   email: 'kerry@vw.co.za',        phone: '+27 79 221 5566', site: 'eikestad',  unit: '112',  plan: 3,  type: 'individual' },
  { id: 'C-24558', first: 'Anand',   last: 'Naidoo',    email: 'a.naidoo@gmail.com',    phone: '+27 82 401 8090', site: 'rivonia',   unit: 'C-04', plan: 8,  type: 'individual' },
  { id: 'C-24559', first: 'Pieter',  last: 'Botha',     email: 'pieter.botha@webmail.co.za', phone: '+27 71 555 4422', site: 'rembrandt', unit: 'B-15', plan: 12, type: 'individual' },
  { id: 'C-24560', first: 'Lerato',  last: 'Khumalo',   email: 'lerato.k@outlook.com',  phone: '+27 78 209 1144', site: 'rosebank',  unit: 'F-07', plan: 5,  type: 'individual' },
  { id: 'C-24561', first: 'Asha',    last: 'Patel',     email: 'asha@patelfamily.za',   phone: '+27 76 800 2210', site: 'rivonia',   unit: 'A-10', plan: 6,  type: 'individual' },
  { id: 'C-24562', first: 'Cobus',   last: 'du Plessis',email: 'c.duplessis@gmail.com', phone: '+27 82 100 9988', site: 'bellville',    unit: 'B-04', plan: 8,  type: 'individual' },
];

const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map(p => [p.id, p]));

// price per m² ~ R 180 in metros, R 130 in Mbombela
function priceFor(p) {
  const sites = { rivonia: 195, rosebank: 220, eikestad: 175, bellville: 165, rembrandt: 150, riverside: 125 };
  const base = (sites[p.site] || 180) * p.plan;
  return Math.round(base / 50) * 50; // round to nearest R50
}

// —————————————————————— Devices ——————————————————————
const DEVICES_BASE = [
  // device id, site, type, name, ip, normal status
  { id: 'gw-riv-01',  site: 'rivonia',   kind: 'gateway',  name: 'Site Gateway',     ip: '10.149.225.1', uptime: 99.4 },
  { id: 'gw-rbk-01',  site: 'rosebank',  kind: 'gateway',  name: 'Site Gateway',     ip: '10.92.18.1',   uptime: 99.8 },
  { id: 'gw-eik-01',  site: 'eikestad',  kind: 'gateway',  name: 'Site Gateway',     ip: '10.68.46.1',   uptime: 99.1 },
  { id: 'gw-bvl-01',  site: 'bellville',    kind: 'gateway',  name: 'Site Gateway',     ip: '10.173.129.1', uptime: 99.6 },
  { id: 'gw-rmb-01',  site: 'rembrandt', kind: 'gateway',  name: 'Site Gateway',     ip: '10.101.70.1',  uptime: 98.9 },
  { id: 'gw-rvs-01',  site: 'riverside', kind: 'gateway',  name: 'Site Gateway',     ip: '10.45.12.1',   uptime: 99.2 },

  { id: 'sw-eik-01',  site: 'eikestad',  kind: 'switch',   name: 'Core Switch · upstream', ip: '10.120.154.1', uptime: 96.0 },
  { id: 'sw-riv-01',  site: 'rivonia',   kind: 'switch',   name: 'Core Switch',       ip: '10.149.225.2', uptime: 99.7 },

  { id: 'dr-rbk-A',   site: 'rosebank',  kind: 'door',     name: 'Door Controller · Zone A', ip: '10.92.18.10', uptime: 99.5 },
  { id: 'dr-rbk-B',   site: 'rosebank',  kind: 'door',     name: 'Door Controller · Zone B', ip: '10.92.18.11', uptime: 99.4 },
  { id: 'dr-riv-A',   site: 'rivonia',   kind: 'door',     name: 'Door Controller · Zone A', ip: '10.149.225.10', uptime: 72.0 },
  { id: 'dr-eik-A',   site: 'eikestad',  kind: 'door',     name: 'Door Controller · Zone A', ip: '10.68.46.10', uptime: 96.2 },
  { id: 'dr-eik-B',   site: 'eikestad',  kind: 'door',     name: 'Door Controller · Zone B', ip: '10.68.46.11', uptime: 99.0 },
  { id: 'dr-bvl-A',   site: 'bellville',    kind: 'door',     name: 'Door Controller · Zone A', ip: '10.173.129.10', uptime: 99.3 },
  { id: 'dr-rmb-A',   site: 'rembrandt', kind: 'door',     name: 'Door Controller · Zone A', ip: '10.101.70.10', uptime: 98.5 },
  { id: 'dr-rvs-A',   site: 'riverside', kind: 'door',     name: 'Door Controller · Zone A', ip: '10.45.12.10', uptime: 99.0 },

  { id: 'cam-rbk-1',  site: 'rosebank',  kind: 'camera',   name: 'CCTV · main aisle',  ip: '10.92.18.30', uptime: 99.9 },
  { id: 'cam-eik-1',  site: 'eikestad',  kind: 'camera',   name: 'CCTV · entrance',    ip: '10.68.46.30', uptime: 99.7 },
  { id: 'cam-riv-1',  site: 'rivonia',   kind: 'camera',   name: 'CCTV · loading bay', ip: '10.149.225.30', uptime: 99.5 },
  { id: 'cam-bvl-1',  site: 'bellville',    kind: 'camera',   name: 'CCTV · entrance',    ip: '10.173.129.30', uptime: 99.6 },

  { id: 'pwr-rbk-1',  site: 'rosebank',  kind: 'electrical', name: 'Mains · DB-1',    metric: 'load', uptime: 100 },
  { id: 'pwr-eik-1',  site: 'eikestad',  kind: 'electrical', name: 'UPS · rack room', metric: 'battery', uptime: 99.4 },
  { id: 'pwr-bvl-1',  site: 'bellville',    kind: 'electrical', name: 'Generator',       metric: 'fuel', uptime: 100 },
  { id: 'pwr-rvs-1',  site: 'riverside', kind: 'electrical', name: 'UPS · entrance',  metric: 'battery', uptime: 99.7 },

  { id: 'env-rbk-1',  site: 'rosebank',  kind: 'env', name: 'Temp · Zone A',       value: '22.4°C', uptime: 100 },
  { id: 'env-eik-1',  site: 'eikestad',  kind: 'env', name: 'Humidity · Zone B',   value: '64%', uptime: 100 },
  { id: 'env-riv-1',  site: 'rivonia',   kind: 'env', name: 'Smoke · main',        value: 'clear', uptime: 100 },
  { id: 'env-bvl-1',  site: 'bellville',    kind: 'env', name: 'Temp · all zones',    value: '21.8°C', uptime: 100 },
];

// —————————————————————— Mode application ——————————————————————
// Each mode mutates which devices are red/amber, which AI tasks fire,
// what the queues look like, etc.
function modify(items, modFn) { return items.map(modFn); }

function devicesFor(mode) {
  // Default: everything green
  let d = DEVICES_BASE.map(x => ({ ...x, status: 'good', lastPing: '2m ago', latencyMs: 40 + Math.round(Math.random()*40) }));

  const set = (id, status, extra={}) => {
    const i = d.findIndex(x => x.id === id);
    if (i >= 0) d[i] = { ...d[i], status, ...extra };
  };

  if (mode === 'busy') {
    set('sw-eik-01', 'watch', { lastPing: '2m ago', latencyMs: 86, note: 'High latency — investigate' });
    set('gw-bvl-01', 'watch', { lastPing: '2m ago', latencyMs: 300, note: 'High latency' });
    set('dr-eik-A',  'watch', { lastPing: '4m ago', latencyMs: 235, note: 'High latency' });
  }
  if (mode === 'crisis') {
    set('sw-eik-01', 'bad',   { lastPing: '47m ago', latencyMs: null, note: 'Uplink down · facility offline to head office', uptime: 80 });
    set('dr-riv-A',  'bad',   { lastPing: '5h ago',  latencyMs: null, note: 'No heartbeat for 4h · door fails closed, manual override at site', uptime: 72 });
    set('gw-riv-01', 'bad',   { lastPing: '8h ago',  latencyMs: null, note: 'Gateway unreachable · payments + door access affected', uptime: 60 });
    set('gw-bvl-01', 'watch', { lastPing: '2m ago',  latencyMs: 312, note: 'High latency' });
    set('sw-eik-01', 'bad',   { lastPing: '47m ago', latencyMs: null, note: 'Uplink down · facility offline', uptime: 80 });
    set('dr-eik-A',  'watch', { lastPing: '4m ago',  latencyMs: 235, note: 'High latency' });
    set('gw-eik-01', 'watch', { lastPing: '2m ago',  latencyMs: 86,  note: 'High latency' });
    set('gw-rmb-01', 'watch', { lastPing: '3m ago',  latencyMs: 264, note: 'High latency' });
    set('pwr-eik-1', 'watch', { value: '38% battery', note: 'UPS battery at 38% — load shedding stage 4 reported', uptime: 99 });
    set('env-eik-1', 'watch', { value: '78%', note: 'Humidity above threshold (>70%) for 35 min' });
  }
  return d;
}

// AI proposed actions — change per mode
function aiTasksFor(mode) {
  const tasks = [];
  // Always present (some baseline)
  tasks.push({
    id: 'ai-1', kind: 'reminder', confidence: 0.94,
    title: 'Send arrears reminder to 3 customers',
    rationale: 'These cards declined yesterday for "insufficient funds". Pattern shows 64% recover within 24h with a single WhatsApp nudge.',
    affects: ['Tinus Greyling', 'Pieter Botha', 'Cobus du Plessis'],
    impact: 'R 8 470 expected recovery',
    action: 'Send WhatsApp · approved template',
  });
  tasks.push({
    id: 'ai-2', kind: 'pricing', confidence: 0.88,
    title: 'Drop listed price 8% at Riverside Junction',
    rationale: 'Occupancy stuck at 61% for 30 days. Comparable units at competitor "StorageRSA Mbombela" listed at R145/m². Promo for 30 days should clear 6–8 units.',
    affects: ['Riverside Junction · 12 vacant units'],
    impact: '+R 7 200 MRR if 50% conversion',
    action: 'Schedule price drop · effective tomorrow 00:00',
  });
  tasks.push({
    id: 'ai-3', kind: 'support', confidence: 0.97,
    title: 'Auto-reply to 4 routine WhatsApp queries',
    rationale: 'All 4 messages match patterns I\'ve answered before: 2 × "what size for a 1-bed move?", 1 × "operating hours?", 1 × "can I pay by EFT?".',
    affects: ['+27 76 …2210', '+27 82 …8090', '+27 71 …4422', '+27 79 …5566'],
    impact: 'Saves ~12 min handle time',
    action: 'Send drafted replies',
  });

  if (mode === 'busy') {
    tasks.push({
      id: 'ai-4', kind: 'kyc', confidence: 0.91,
      title: 'Chase KYC docs from Megan Roberts',
      rationale: 'Move-in scheduled 13:30 today. KYC status: identity not yet verified. SumSub link expires in 4h. Without docs, door access can\'t be activated.',
      affects: ['Megan Roberts · Rosebank E-11'],
      impact: 'Prevents likely 1-day move-in delay',
      action: 'Send SumSub re-invite + WhatsApp nudge',
    });
  }
  if (mode === 'crisis') {
    tasks.push({
      id: 'ai-c1', kind: 'incident', confidence: 0.99,
      title: 'Reboot Eikestad core switch remotely',
      rationale: 'Uplink down for 47min. Switch is reachable on management VLAN. Power-cycle via Kerong relay has 92% success on prior incidents.',
      affects: ['Eikestad Mall · all online services'],
      impact: 'Restores service to 142 units within ~3 min',
      action: 'Trigger relay reboot',
      severity: 'bad',
    });
    tasks.push({
      id: 'ai-c2', kind: 'incident', confidence: 0.86,
      title: 'Dispatch technician to Rivonia · door controller',
      rationale: 'No heartbeat 4h+. Door is failing closed (customers can\'t enter). Operator override active. Last 3 customers turned away. Technician available within 90min.',
      affects: ['Rivonia · 23 active subscribers'],
      impact: 'Restores door access; 3 customers waiting',
      action: 'Book Mr Daniels · ETA 90 min',
      severity: 'bad',
    });
    tasks.push({
      id: 'ai-c3', kind: 'comms', confidence: 0.93,
      title: 'Notify Rivonia customers of disruption',
      rationale: 'Standard outage comms template fits. Suggest 30% off next month for the 23 affected customers per outage SLA.',
      affects: ['23 customers · WhatsApp + email'],
      impact: 'Pre-empts inbound complaints',
      action: 'Send disruption notice + credit offer',
    });
    tasks.push({
      id: 'ai-c4', kind: 'power', confidence: 0.79,
      title: 'Switch Eikestad to generator',
      rationale: 'UPS battery at 38% and falling. Load shedding stage 4 confirmed for 14:00–16:30. Generator fuel: 86% (sufficient).',
      affects: ['Eikestad Mall'],
      impact: 'Maintains door access through outage window',
      action: 'Send relay command',
      severity: 'watch',
    });
  }
  return tasks;
}

// Conversations (unified inbox)
function conversationsFor(mode) {
  const base = [
    {
      id: 'cv-1', customerId: 'C-24551', channel: 'whatsapp', subject: 'Card declined — help?',
      last: 'Hi, my card was declined this morning. Can I try a different one?',
      lastAt: '4m ago', unread: 1, status: 'awaiting-operator', botHandled: 0,
    },
    {
      id: 'cv-2', customerId: 'C-24555', channel: 'whatsapp', subject: 'Lead · 5m² at Rivonia',
      last: 'Hi! I\'m looking for storage near Sandton, around 5m². Do you have availability?',
      lastAt: '12m ago', unread: 1, status: 'bot-handling', botHandled: 2,
    },
    {
      id: 'cv-3', customerId: 'C-24557', channel: 'email', subject: 'Invoice query INV-202604-1124',
      last: 'I think I was charged twice — could you check?',
      lastAt: '32m ago', unread: 1, status: 'awaiting-operator',
    },
    {
      id: 'cv-4', customerId: 'C-24558', channel: 'chat', subject: 'How to share digital key',
      last: 'Bot: \"Sure, here\'s how to share access with someone else…\"',
      lastAt: '54m ago', unread: 0, status: 'bot-resolved', botHandled: 3,
    },
    {
      id: 'cv-5', customerId: 'C-24554', channel: 'whatsapp', subject: 'Lead · 16m² Paarl',
      last: 'Yes I can do 25 May. What\'s the price?',
      lastAt: '2h ago', unread: 0, status: 'bot-handling', botHandled: 4,
    },
    {
      id: 'cv-6', customerId: 'C-24560', channel: 'email', subject: 'Move-out confirmation',
      last: 'Bot: \"All confirmed — please make sure unit is empty by Sun 28th May.\"',
      lastAt: '5h ago', unread: 0, status: 'bot-resolved', botHandled: 2,
    },
    {
      id: 'cv-7', customerId: 'C-24556', channel: 'whatsapp', subject: 'B2B · 3 more units please',
      last: 'Dlamini Group needs 3 more 10m² units. Can we extend our agreement?',
      lastAt: '6h ago', unread: 0, status: 'awaiting-operator',
    },
    {
      id: 'cv-8', customerId: 'C-24562', channel: 'email', subject: 'Late payment apology',
      last: 'Apologies — paying this evening. Thanks.',
      lastAt: '1d ago', unread: 0, status: 'bot-resolved',
    },
  ];

  if (mode === 'quiet') return base.slice(0, 4);
  if (mode === 'crisis') return [
    {
      id: 'cv-x1', customerId: 'C-24552', channel: 'whatsapp', subject: 'I can\'t get into my unit!',
      last: 'I\'m at the gate right now and the app won\'t open the door. Please help, I\'m double-parked.',
      lastAt: '2m ago', unread: 1, status: 'urgent', botHandled: 0,
    },
    {
      id: 'cv-x2', customerId: 'C-24558', channel: 'whatsapp', subject: 'Outage at Rivonia',
      last: 'Hi, is there an outage? I drove 30 minutes and can\'t access my stuff.',
      lastAt: '4m ago', unread: 1, status: 'urgent', botHandled: 0,
    },
    {
      id: 'cv-x3', customerId: 'C-24561', channel: 'whatsapp', subject: 'Door problem',
      last: 'My door won\'t open — second time this week.',
      lastAt: '7m ago', unread: 1, status: 'urgent', botHandled: 0,
    },
    ...base,
  ];
  return base;
}

// Activity log — chronological list of what the AI did autonomously
function aiActivityFor(mode) {
  const today = [
    { time: '14:32', kind: 'auto-reply', desc: 'Replied to Kerry van Wyk on WhatsApp', detail: 'Resolved query about unit access hours', conf: 0.99, channel: 'whatsapp', cust: 'C-24557' },
    { time: '14:18', kind: 'reminder',  desc: 'Sent payment reminder to Anand Naidoo', detail: '1st reminder · invoice INV-202604-0998', conf: 0.95, channel: 'email', cust: 'C-24558' },
    { time: '13:51', kind: 'lead',      desc: 'Qualified lead from Johan Pretorius', detail: 'Matched to 16m² Paarl — sent reservation link', conf: 0.91, channel: 'whatsapp', cust: 'C-24554' },
    { time: '12:47', kind: 'pricing',   desc: 'Recomputed prices · Rivonia',     detail: 'No changes triggered (occupancy still in band)', conf: 0.88 },
    { time: '12:30', kind: 'auto-reply', desc: 'Replied to 4 routine queries',    detail: 'Avg confidence 0.96 · saved ~12min', conf: 0.96 },
    { time: '11:14', kind: 'kyc',       desc: 'Re-sent KYC link to Megan Roberts', detail: 'SumSub link expired; new one valid 24h', conf: 0.98, cust: 'C-24552' },
    { time: '10:02', kind: 'payment',   desc: 'Retried failed card · Tinus Greyling', detail: 'Declined again · escalated to dunning', conf: 0.78, cust: 'C-24551' },
    { time: '09:47', kind: 'doors',     desc: 'Granted access · 14 customers',    detail: 'Morning peak — all normal', conf: 1.0 },
    { time: '09:00', kind: 'reports',   desc: 'Generated morning ops digest',     detail: 'Sent to geir@flexistore.co.za + adam@…', conf: 1.0 },
    { time: '08:13', kind: 'pricing',   desc: 'Flagged Riverside Junction',       detail: 'Occupancy 61% · proposed 8% price drop', conf: 0.88 },
  ];
  if (mode === 'crisis') {
    return [
      { time: '14:33', kind: 'incident', desc: 'Detected uplink down · Eikestad', detail: 'No heartbeat from sw-eik-01 for 30s · escalated', conf: 0.99, severity: 'bad' },
      { time: '14:31', kind: 'incident', desc: 'Failover triggered · Rivonia DB',  detail: 'Read replica promoted automatically', conf: 0.95, severity: 'watch' },
      { time: '14:28', kind: 'comms',    desc: 'Drafted outage notice (pending)',  detail: 'Awaiting operator approval', conf: 0.93, severity: 'watch' },
      { time: '14:26', kind: 'doors',    desc: 'Engaged manual override · Rivonia A', detail: 'Door fails closed; site staff notified', conf: 1.0, severity: 'bad' },
      ...today,
    ];
  }
  return today;
}

// Cockpit KPIs
function cockpitFor(mode) {
  if (mode === 'busy') return {
    mrr: 218450, mrrDelta: +4.2, outstanding: 18420, outsCount: 7,
    collectedToday: 47200, paymentsToday: 19, paymentsFailed: 2,
    moveInsToday: 4, moveOutsToday: 1, occupancyAvg: 0.84,
    botHandled: 47, botEscalated: 3, deflection: 0.94,
    devicesOnline: 33, devicesTotal: 36, devicesDegraded: 2, devicesOffline: 1,
  };
  if (mode === 'quiet') return {
    mrr: 218450, mrrDelta: +1.1, outstanding: 4200, outsCount: 1,
    collectedToday: 4900, paymentsToday: 4, paymentsFailed: 0,
    moveInsToday: 1, moveOutsToday: 1, occupancyAvg: 0.84,
    botHandled: 12, botEscalated: 0, deflection: 1.0,
    devicesOnline: 36, devicesTotal: 36, devicesDegraded: 0, devicesOffline: 0,
  };
  if (mode === 'crisis') return {
    mrr: 218450, mrrDelta: +4.2, outstanding: 24750, outsCount: 9,
    collectedToday: 31200, paymentsToday: 14, paymentsFailed: 6,
    moveInsToday: 5, moveOutsToday: 0, occupancyAvg: 0.84,
    botHandled: 38, botEscalated: 14, deflection: 0.73,
    devicesOnline: 29, devicesTotal: 36, devicesDegraded: 4, devicesOffline: 3,
  };
}

// Leads pipeline
const LEADS = [
  { id: 'L-2031', name: 'Johan Pretorius', source: 'website', site: 'rembrandt', size: 16, stage: 'qualified', age: '2d', value: 2400, lastTouch: 'AI replied 2h ago' },
  { id: 'L-2032', name: 'Thandi Mokoena',  source: 'whatsapp', site: 'rivonia', size: 5, stage: 'qualified', age: '3d', value: 975, lastTouch: 'AI sent reservation link 4h ago' },
  { id: 'L-2033', name: 'David Chen',      source: 'walk-in', site: 'rosebank', size: 8, stage: 'visiting', age: '1d', value: 1760, lastTouch: 'Booked tour Sat 11am' },
  { id: 'L-2034', name: 'Naledi Khoza',    source: 'referral', site: 'bellville', size: 12, stage: 'reserved', age: '5h', value: 1980, lastTouch: 'Paystack pending' },
  { id: 'L-2035', name: 'Wian Coetzer',    source: 'google-ads', site: 'eikestad', size: 4, stage: 'contacted', age: '6h', value: 700, lastTouch: 'AI sent intro 1h ago' },
  { id: 'L-2036', name: 'Brenda Smith',    source: 'website', site: 'rivonia', size: 6, stage: 'new', age: '12m', value: 1170, lastTouch: 'Just submitted form' },
  { id: 'L-2037', name: 'Yusuf Adams',     source: 'whatsapp', site: 'bellville', size: 10, stage: 'qualified', age: '4d', value: 1650, lastTouch: 'Operator follow-up needed' },
  { id: 'L-2038', name: 'Riana de Klerk',  source: 'walk-in', site: 'eikestad', size: 8, stage: 'lost', age: '1w', value: 1400, lastTouch: 'Chose competitor' },
];

const LEAD_STAGES = [
  { id: 'new',        label: 'New',        color: 'info' },
  { id: 'contacted',  label: 'Contacted',  color: 'info' },
  { id: 'qualified',  label: 'Qualified',  color: 'watch' },
  { id: 'visiting',   label: 'Visiting',   color: 'watch' },
  { id: 'reserved',   label: 'Reserved',   color: 'good' },
  { id: 'lost',       label: 'Lost',       color: 'neutral' },
];

// Arrears
const ARREARS = [
  { customerId: 'C-24551', amount: 2750, days: 7, attempts: 3, status: 'active', stage: 'gentle' },
  { customerId: 'C-24559', amount: 4200, days: 14, attempts: 5, status: 'active', stage: 'firm' },
  { customerId: 'C-24562', amount: 1320, days: 3, attempts: 1, status: 'active', stage: 'gentle' },
  { customerId: 'C-24558', amount: 6480, days: 28, attempts: 7, status: 'arranged', stage: 'arranged' },
  { customerId: 'C-24561', amount: 950,  days: 5, attempts: 2, status: 'active', stage: 'gentle' },
];

// Tech tickets — customer service can register issues against a facility / unit / device
function ticketsFor(siteId, mode) {
  const tickets = [
    { id: 'T-1024', siteId: 'rosebank', subject: 'Door beep but won\'t open',  unit: 'E-11',  customer: 'Megan Roberts',   priority: 'high',   age: '8m',  status: 'open',     channel: 'whatsapp', deviceId: 'dr-rbk-A', notes: 'Customer at gate · multiple retries · Bluetooth on · app online' },
    { id: 'T-1023', siteId: 'rosebank', subject: 'Aisle light flickering · Zone B', unit: '—', customer: 'Lerato Khumalo', priority: 'low',    age: '2h',  status: 'open',     channel: 'whatsapp', deviceId: null, notes: 'Reported during morning visit · not blocking access' },
    { id: 'T-1022', siteId: 'rosebank', subject: 'Camera CCTV-1 black screen', unit: '—',     customer: 'Internal',         priority: 'medium', age: '5h',  status: 'investigating', channel: 'internal', deviceId: 'cam-rbk-1', notes: 'Camera reachable but feed black · power-cycle queued' },
    { id: 'T-1021', siteId: 'rivonia',  subject: 'Can\'t enter facility · gate stuck',  unit: '—', customer: 'Anand Naidoo', priority: 'high', age: '4h', status: 'open', channel: 'phone', deviceId: 'gw-riv-01', notes: 'Outage at Rivonia · linked to active incident' },
    { id: 'T-1019', siteId: 'eikestad', subject: 'Move-in: key not working',   unit: '058',   customer: 'Marilet Theron',   priority: 'high',   age: '1d',  status: 'resolved', channel: 'whatsapp', deviceId: 'dr-eik-A', notes: 'Resolved · operator re-issued digital key' },
    { id: 'T-1015', siteId: 'bellville',   subject: 'Humidity high · Zone B',     unit: '—',     customer: 'Internal',         priority: 'medium', age: '3d',  status: 'resolved', channel: 'internal', deviceId: null, notes: 'Spike for 35min · returned to normal · noted' },
    { id: 'T-1012', siteId: 'rosebank', subject: 'Unit smells damp',           unit: 'B-12',  customer: 'Asha Patel',       priority: 'low',    age: '1w',  status: 'resolved', channel: 'email', deviceId: null, notes: 'Inspected · no leak found · checking dehumidifier' },
  ];
  let out = tickets.filter(t => !siteId || t.siteId === siteId);
  if (mode === 'crisis') {
    out = [
      { id: 'T-1030', siteId: 'rivonia', subject: 'Outage — gate not responding',     unit: '—',    customer: 'Mass · 23 customers', priority: 'critical', age: '3m', status: 'open', channel: 'auto', deviceId: 'gw-riv-01', notes: 'Auto-opened by AI · linked to gateway down incident' },
      ...out,
    ];
  }
  return out;
}

// Facility floor plans — a declarative layout the renderer turns into SVG.
// Each site has zones, units per zone, aisles, devices and an entrance.
function planFor(siteId) {
  // Default config, can be overridden per site
  const base = {
    width: 1000, height: 540,
    entrance: { x: 40, y: 270, label: 'Entrance' },
    zones: [
      { id: 'A', name: 'Zone A · Small lockers', x: 80,  y: 60,  rows: 4, cols: 6, unitW: 60, unitH: 50, gap: 4, type: 'small' },
      { id: 'B', name: 'Zone B · Medium units', x: 80,  y: 310, rows: 3, cols: 6, unitW: 60, unitH: 60, gap: 4, type: 'medium' },
      { id: 'C', name: 'Zone C · Large units',  x: 520, y: 60,  rows: 3, cols: 4, unitW: 100, unitH: 70, gap: 4, type: 'large' },
      { id: 'V', name: 'Zone V · VIP climate-controlled', x: 520, y: 310, rows: 2, cols: 3, unitW: 130, unitH: 80, gap: 4, type: 'vip' },
    ],
    aisles: [
      { x1: 50, y1: 270, x2: 950, y2: 270 }, // horizontal main
      { x1: 470, y1: 30, x2: 470, y2: 510 }, // vertical
    ],
    devices: [
      { id: 'gw-01', kind: 'gateway',    x: 50,  y: 30,  label: 'Site Gateway' },
      { id: 'sw-01', kind: 'switch',     x: 920, y: 30,  label: 'Core Switch' },
      { id: 'dr-A',  kind: 'door',       x: 240, y: 30,  label: 'Door · Zone A' },
      { id: 'dr-B',  kind: 'door',       x: 240, y: 510, label: 'Door · Zone B' },
      { id: 'dr-C',  kind: 'door',       x: 700, y: 30,  label: 'Door · Zone C' },
      { id: 'dr-V',  kind: 'door',       x: 700, y: 510, label: 'Door · VIP' },
      { id: 'cam-1', kind: 'camera',     x: 60,  y: 510, label: 'CCTV · main' },
      { id: 'cam-2', kind: 'camera',     x: 940, y: 510, label: 'CCTV · rear' },
      { id: 'pwr-1', kind: 'electrical', x: 480, y: 30,  label: 'DB · main' },
      { id: 'env-1', kind: 'env',        x: 480, y: 510, label: 'Climate sensor' },
    ],
  };
  return base;
}

window.FXDATA = {
  SITES, PEOPLE, PEOPLE_BY_ID, DEVICES_BASE, priceFor,
  devicesFor, aiTasksFor, conversationsFor, aiActivityFor, cockpitFor,
  LEADS, LEAD_STAGES, ARREARS, SCHEDULE,
  ticketsFor, planFor,
};

// Today's schedule
const SCHEDULE = [
  { time: '09:00', kind: 'move-in',  who: 'Megan Roberts',  site: 'rosebank',  unit: 'E-11', note: 'KYC pending' },
  { time: '11:30', kind: 'move-out', who: 'Tinus Greyling', site: 'rosebank',  unit: 'D-08', note: 'Auction risk' },
  { time: '13:30', kind: 'move-in',  who: 'Naledi Khoza',   site: 'bellville',    unit: 'B-21', note: 'Paystack confirmed' },
  { time: '15:00', kind: 'tour',     who: 'David Chen',     site: 'rosebank',  unit: '—',     note: 'Self-guided · QR sent' },
  { time: '16:00', kind: 'move-in',  who: 'Sipho Dlamini',  site: 'bellville',    unit: 'A-22', note: 'B2B · 3rd unit' },
];

window.FXDATA = {
  SITES, PEOPLE, PEOPLE_BY_ID, DEVICES_BASE, priceFor,
  devicesFor, aiTasksFor, conversationsFor, aiActivityFor, cockpitFor,
  LEADS, LEAD_STAGES, ARREARS, SCHEDULE,
  ticketsFor, planFor,
};
// (final export — older one above kept for diff stability)
