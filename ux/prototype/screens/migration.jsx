/* ============================================================
   Migration  #/migration   (Phase 1 screen, not in the original memo)
   What the operator sees while the Zoho data is being brought across
   and kept in sync: import runs, reconciliation checks, per-module
   counts, market/tenant derivation, and the source-of-record switch.
   Data shape = import.runs / import.checks / import.files (db/0004).
   Sample numbers below are the expected full-backup counts from
   docs/source/ZOHO_BACKUP_CRM_IMPORT_SPEC_2.md, shown as a PASSing run.
   ============================================================ */

const MIG_RUNS = [
  { id: 'run-3', kind: 'zoho_delta',  label: 'Hourly delta · Sales_Orders, Payments, AppEvents, Contacts', startedAt: 'Today 07:00', seconds: 84,   status: 'validated', rows: 1_942 },
  { id: 'run-2', kind: 'zoho_backup', label: 'Full backup · Data_001 (2026-09-05)',                          startedAt: 'Mon 02:10',  seconds: 1_860, status: 'validated', rows: 2_889_105 },
  { id: 'run-1', kind: 'zoho_backup', label: 'Full backup · Data_001 (2026-09-05) · dry run on staging',    startedAt: 'Sun 21:40',  seconds: 1_910, status: 'failed',    rows: 2_889_105, error: '3 required columns missing → aliases.json' },
];

const MIG_MODULES = [
  // module, staged, legacy, core target, core rows, note
  ['Facilities',            55,        55,        'sites',          55,        'market from Country'],
  ['Bods / Units',          7_071,     7_071,     'units',          7_071,     'gateway → board → lock topology built from wiring'],
  ['Contacts',              63_639,    63_639,    'customers',      null,      '≈33k app users/customers/partner people; ≈26k SalesIQ visitor stubs stay legacy-only'],
  ['Reservations',          27_214,    27_214,    'subscriptions',  19_471,    '7,735 UNPAID + 8 PENDING → reservations (abandoned/pending)'],
  ['Payment Details',       27_117,    27_117,    'payment_instruments', null, 'one per customer × provider × token'],
  ['Payments',              187_664,   187_664,   'payments',       187_238,   '426 test rows kept in legacy, flagged'],
  ['Status History',        305_287,   305_287,   'activity_log',   305_287,   'timestamps reconstructed from durations'],
  ['Status History Gads',   14_617,    14_617,    'activity_log',   14_617,    ''],
  ['AppEvents (21 files)',  2_087_453, 2_087_453, 'activity_log',   2_087_453, '+ price_history from SYSTEM_NOTIFY'],
  ['Communications',        79_175,    79_175,    'activity_log',   79_175,    'notification.* events'],
  ['Emails',                16_335,    16_335,    'messages',       16_299,    ''],
  ['SMSes',                 28_554,    28_554,    'messages',       28_554,    ''],
  ['Calls',                 58_506,    58_506,    'messages',       26_328,    'only calls linked to a contact become messages'],
  ['Notes',                 14_287,    14_287,    'messages / notes', null,    'SalesIQ transcripts → chat messages; the rest → notes'],
  ['Leads + Old Contacts',  2_800,     2_800,     'leads',          2_800,     'stage new ≤30d, else lost (stale_import)'],
  ['Gateways',              339,       339,       'devices',        339,       '18 in SA stock, 11 in NO stock (no site)'],
  ['Property Prospects',    245,       245,       '— legacy only',  0,         'shown in Legacy (Zoho) tab'],
  ['Business Partners',     90,        90,        'landlords',      80,        'Property Owner type only'],
  ['OfferRequests',         14_049,    14_049,    '— legacy only',  0,         'NO/FI insurance add-on; never sold in SA'],
  ['Attachments',           399,       399,       'documents',      null,      'facility + contact files; prospect files stay legacy; 1.1 GB re-hosted in M5'],
];

const MIG_CHECKS = [
  ['staging', 'rows app_events',                          '2,087,453', '2,087,453', 'PASS'],
  ['legacy',  'tenant assigned legacy.contacts',           '0 missing', '0',         'PASS'],
  ['legacy',  'market derivation legacy.contacts',         '≤5% default', '(sample)', 'PASS'],
  ['legacy',  'fk reservations→units',                     '≤0% unresolved', '0/27,214', 'PASS'],
  ['legacy',  'fk reservations→contacts (User ID)',        '≤3% unresolved', '641/27,214 (2.4%)', 'WARN'],
  ['legacy',  'fk payments→reservations',                  '≤0% unresolved', '0/187,575', 'PASS'],
  ['core',    'sites = legacy facilities',                 '55', '55', 'PASS'],
  ['core',    'subscriptions = non-draft reservations',    '19,471', '19,471', 'PASS'],
  ['core',    'payments = non-test payments',              '187,238', '187,238', 'PASS'],
  ['core',    'activity_log ≥ legacy app_events',          '2,087,453', '2,486,532', 'PASS'],
  ['core',    'occupied units have a current subscription','0', '3', 'WARN'],
  ['legacy',  'fill legacy.contacts.phone_e164',           '>0%', '≈42%', 'PASS'],
];

const MIG_MARKET = [
  ['facilities',   { country: 55 }],
  ['contacts',     { financial_tool: 31_118, reservation: 1_402, country: 7_311, organisation: 16_884, owner_role: 5_601, default: 1_323 }],
  ['reservations', { facility: 27_214 }],
  ['payments',     { currency: 187_664 }],
  ['leads',        { country: 2_561, contact: 88, module: 54, default: 97 }],
];

function MigrationScreen({ onNav }) {
  const tenant = useTenant();
  const [tab, setTab] = React.useState('overview');
  const last = MIG_RUNS[1];
  const fmt = (n) => n.toLocaleString(FXTENANT.locale);

  return (
    <div data-screen-label="Migration">
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">Migration</h1>
          <div className="page-hd__sub">Zoho CRM → Flexistore PMS · {tenant.name} · source of record: <b>Zoho (parallel run)</b> <Badge tone="watch">Sample data · counts from the backup analysis</Badge></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="ghost" icon="refresh">Run delta now</Btn>
          <Btn kind="primary" icon="check">Set PMS as source of record…</Btn>
        </div>
      </div>

      <div className="grid grid--4" style={{ marginBottom: 20 }}>
        <Kpi label="Last full load" value="Validated" sub={`${last.startedAt} · ${Math.round(last.seconds / 60)} min · ${fmt(last.rows)} rows staged`} tone="good" />
        <Kpi label="Delta sync" value="OK" sub="hourly · last run 84 s · backlog 0" tone="good" />
        <Kpi label="Checks" value="94 / 96" sub="2 warnings · 0 failures" />
        <Kpi label="Needs review" value="—" sub="contacts with market = default (known after the first real run)" />
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' }, { id: 'modules', label: 'Modules' }, { id: 'checks', label: 'Checks' },
        { id: 'markets', label: 'Tenant derivation' }, { id: 'runs', label: 'Runs' }, { id: 'legacy', label: 'Legacy browser' },
      ]} />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <Card title="What is in the PMS today" subtitle="core rows with source = zoho, this tenant">
            <table className="tbl">
              <tbody>
                {[['Sites', 11], ['Units', 1_613], ['Customers (Xero-tagged contacts)', 13_643], ['Subscriptions (active)', 1_065], ['Subscriptions (ended)', 2_194], ['Reservations (abandoned)', 1_197], ['Payments', 44_482], ['Leads', 1_146], ['Gateways in production', 48]].map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td className="tabnum" style={{ textAlign: 'right' }}>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Cutover checklist" subtitle="Phase 1 · M6">
            {[
              ['Full load reconciled (M1)', true], ['Delta sync 7 days clean (M2)', true], ['Screens on real data (M3)', true],
              ['CRM writes in the PMS (M4)', true], ['Parallel run 3–4 weeks (M5)', false], ['Attachments re-hosted (M5)', false],
              ['Zoho write freeze + final delta (M6)', false], ['Zoho read-only · archive stored (M6)', false],
            ].map(([label, done]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <SevDot status={done ? 'good' : 'neutral'} /><span style={{ color: done ? 'var(--ink-800)' : 'var(--ink-500)' }}>{label}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'modules' && (
        <Card title="Zoho modules → legacy → core" subtitle="staged = rows in zoho_raw · legacy = typed rows · core = rows that have a home in the PMS model" padding={false} inset>
          <table className="tbl">
            <thead><tr><th>Module</th><th style={{ textAlign: 'right' }}>Staged</th><th style={{ textAlign: 'right' }}>Legacy</th><th>Core table</th><th style={{ textAlign: 'right' }}>Core rows</th><th>Note</th></tr></thead>
            <tbody>
              {MIG_MODULES.map(([m, st, lg, tbl, core, note]) => (
                <tr key={m}>
                  <td style={{ fontWeight: 600 }}>{m}</td>
                  <td className="tabnum" style={{ textAlign: 'right' }}>{fmt(st)}</td>
                  <td className="tabnum" style={{ textAlign: 'right' }}>{fmt(lg)}</td>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tbl}</code></td>
                  <td className="tabnum" style={{ textAlign: 'right', color: core ? 'inherit' : 'var(--ink-400)' }}>{core ? fmt(core) : (core === null ? 'after first run' : '—')}</td>
                  <td style={{ color: 'var(--ink-500)' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'checks' && (
        <Card title="Reconciliation checks" subtitle="import.checks · last validated run" padding={false} inset>
          <table className="tbl">
            <thead><tr><th>Stage</th><th>Check</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
            <tbody>
              {MIG_CHECKS.map(([stage, name, exp, act, res]) => (
                <tr key={name}>
                  <td><Badge tone="neutral">{stage}</Badge></td><td>{name}</td><td className="tabnum">{exp}</td><td className="tabnum">{act}</td>
                  <td><Badge tone={res === 'PASS' ? 'good' : res === 'WARN' ? 'watch' : 'bad'} dot>{res}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'markets' && (
        <Card title="How each row got its tenant" subtitle="market_source per legacy table (illustrative split; real values after the first run) · rows with 'default' need an operator's eye">
          {MIG_MARKET.map(([table, dist]) => {
            const total = Object.values(dist).reduce((a, b) => a + b, 0);
            return (
              <div key={table} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <b>{table}</b><span className="tabnum" style={{ color: 'var(--ink-500)' }}>{fmt(total)} rows</span>
                </div>
                <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', background: 'var(--ink-100)' }}>
                  {Object.entries(dist).map(([k, v]) => (
                    <div key={k} title={`${k}: ${fmt(v)}`} style={{ width: `${100 * v / total}%`, background: k === 'default' ? 'var(--bad-600)' : k === 'organisation' ? 'var(--watch-600)' : 'var(--good-600)', opacity: k === 'financial_tool' || k === 'facility' || k === 'currency' || k === 'country' ? 1 : 0.75 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-500)', marginTop: 4, flexWrap: 'wrap' }}>
                  {Object.entries(dist).map(([k, v]) => <span key={k}>{k} <b className="tabnum">{fmt(v)}</b></span>)}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 8 }}><Btn kind="ghost" icon="users">Review contacts with market = default</Btn></div>
        </Card>
      )}

      {tab === 'runs' && (
        <Card title="Import runs" subtitle="import.runs" padding={false} inset>
          <table className="tbl">
            <thead><tr><th>Started</th><th>Kind</th><th>What</th><th style={{ textAlign: 'right' }}>Rows</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              {MIG_RUNS.map(r => (
                <tr key={r.id}>
                  <td>{r.startedAt}</td><td><Badge tone="neutral">{r.kind}</Badge></td><td>{r.label}{r.error && <div style={{ color: 'var(--bad-700)', fontSize: 12 }}>{r.error}</div>}</td>
                  <td className="tabnum" style={{ textAlign: 'right' }}>{fmt(r.rows)}</td><td className="tabnum">{Math.round(r.seconds / 60)} min</td>
                  <td><Badge tone={r.status === 'validated' ? 'good' : 'bad'} dot>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'legacy' && (
        <Card title="Legacy (Zoho) browser" subtitle="everything that has no home in the PMS model yet, read-only">
          <Empty icon="inbox" title="Property prospects · offer requests · tasks · visitor stubs · Zoho metadata"
                 sub="Phase 1 M3: table browser over the legacy schema with search by Zoho id, name and email. Every customer, site and unit also has a Legacy (Zoho) tab." />
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { MigrationScreen });
