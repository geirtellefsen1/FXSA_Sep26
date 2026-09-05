/* ============================================================
   New facility — setup wizard
   7 steps · stepper layout · AI suggestions at every step.
   Covers: location, building, units, electrical, network,
   access/security, launch checklist.
   ============================================================ */

function NewFacilityScreen({ onCancel, onComplete }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState(defaultFacilityData());

  const steps = [
    { id: 'basics',  label: 'Basics',                icon: 'pin' },
    { id: 'units',   label: 'Unit catalog & pricing',icon: 'grid' },
    { id: 'doors',   label: 'Doors · code each one', icon: 'door' },
    { id: 'infra',   label: 'Infrastructure',        icon: 'wifi' },
    { id: 'launch',  label: 'Launch checklist',      icon: 'check-circle' },
  ];

  const progress = (step + 1) / steps.length;
  const setField = (k, v) => setData(d => ({ ...d, [k]: v }));

  return (
    <div data-screen-label="New facility" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - var(--topbar))', overflow: 'hidden', background: 'white', borderTop: '1px solid var(--ink-150)', margin: '-28px -36px -80px' }}>
      {/* Stepper rail */}
      <aside style={{ borderRight: '1px solid var(--ink-150)', padding: 22, display: 'flex', flexDirection: 'column', background: 'var(--ink-50)', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="chevron-right" size={11} style={{ transform: 'rotate(180deg)' }} />Cancel
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', letterSpacing: 0.08, textTransform: 'uppercase' }}>New facility</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: '-0.02em', marginTop: 4 }}>{data.name || 'Untitled facility'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>{data.city ? `${data.city} · ${data.region}` : 'Step ' + (step + 1) + ' of ' + steps.length}</div>
        </div>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button key={s.id} onClick={() => setStep(i)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 10px',
                border: 'none',
                background: active ? 'white' : 'transparent',
                borderRadius: 7,
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                boxShadow: active ? 'var(--shadow-xs)' : 'none',
                border: active ? '1px solid var(--ink-150)' : '1px solid transparent',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: done ? 'var(--good-600)' : active ? 'var(--orange-600)' : 'white',
                  border: done || active ? 'none' : '1.5px solid var(--ink-200)',
                  color: done || active ? 'white' : 'var(--ink-500)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {done ? <Icon name="check" size={11} /> : (i + 1)}
                </span>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--ink-900)' : done ? 'var(--ink-700)' : 'var(--ink-500)', flex: 1 }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Progress</span>
            <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--ink-150)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--orange-600)', borderRadius: 3, transition: 'width 0.2s' }} />
          </div>
        </div>
      </aside>

      {/* Step content + footer */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 28px' }}>
          <StepHeader step={step} steps={steps} />
          {step === 0 && <StepLocation data={data} setField={setField} />}
          {step === 1 && <StepUnits    data={data} setField={setField} />}
          {step === 2 && <StepDoors    data={data} setField={setField} />}
          {step === 3 && <StepInfra    data={data} setField={setField} />}
          {step === 4 && <StepLaunch   data={data} setField={setField} />}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 40px', borderTop: '1px solid var(--ink-150)', background: 'var(--ink-50)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn kind="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><Icon name="chevron-right" size={11} style={{ transform: 'rotate(180deg)' }} />Back</Btn>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>Step {step + 1} of {steps.length} · {steps[step].label}</span>
          <Btn kind="ghost" icon="paperclip">Save draft</Btn>
          {step < steps.length - 1 ? (
            <Btn kind="primary" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} iconAfter="arrow-right">Continue</Btn>
          ) : (
            <Btn kind="accent" icon="check" onClick={() => onComplete?.(data)}>Launch facility</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ step, steps }) {
  const s = steps[step];
  const desc = [
    'Where the facility lives + the landlord deal behind it.',
    'Define your unit types. Any size, any unit, normal + VIP price per type.',
    'Every door, fully coded. Mark individual units as VIP. Auto-wire then override.',
    'WAN, UDM Pro, electrical, CCTV, alarms — sensible defaults, override only if needed.',
    'Final readiness — every category green before go-live.',
  ][step];
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--orange-700)' }}>Step {step + 1}</div>
      <h1 style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink-900)', marginTop: 4 }}>{s.label}</h1>
      <div style={{ fontSize: 13.5, color: 'var(--ink-500)', marginTop: 4 }}>{desc}</div>
    </div>
  );
}

// ——————————— Step 1: Location ———————————
function StepLocation({ data, setField }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="Facility name & address">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Facility name" hint="Public-facing — used in customer comms">
              <Input value={data.name} onChange={v => setField('name', v)} placeholder="e.g. Bryanston Crossing" />
            </Field>
            <Field label="Internal short code" hint="3-letter prefix for unit IDs">
              <Input value={data.short} onChange={v => setField('short', v.toUpperCase().slice(0, 3))} placeholder="BRY" />
            </Field>
            <Field label="City">
              <Input value={data.city} onChange={v => setField('city', v)} placeholder="Bryanston" />
            </Field>
            <Field label="Region">
              <Select value={data.region} onChange={v => setField('region', v)} options={['Cape Town', 'Johannesburg', 'Paarl', 'Stellenbosch', 'Mbombela']} />
            </Field>
            <Field label="Street address" full>
              <Input value={data.address} onChange={v => setField('address', v)} placeholder="William Nicol Drive, Bryanston" />
            </Field>
            <Field label="GPS / what3words" hint="Used in WhatsApp directions to customers">
              <Input value={data.gps} onChange={v => setField('gps', v)} placeholder="-26.0561, 28.0291" />
            </Field>
            <Field label="Operating hours" hint="Most sites are 24/7 self-access">
              <Select value={data.hours} onChange={v => setField('hours', v)} options={['24/7 self-access', 'Mon–Sun 06:00–22:00', 'Mon–Fri 08:00–18:00 · Sat 09:00–13:00']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="Landlord & lease">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Property owner / landlord">
              <Input value={data.landlord} onChange={v => setField('landlord', v)} placeholder="Bryanston Property Co." />
            </Field>
            <Field label="Landlord contact" hint="Name + phone for ops issues">
              <Input value={data.landlordContact} onChange={v => setField('landlordContact', v)} placeholder="Marius Roux · +27 82 …" />
            </Field>
            <Field label="Lease start">
              <Input type="date" value={data.leaseStart} onChange={v => setField('leaseStart', v)} />
            </Field>
            <Field label="Lease term">
              <Select value={data.leaseTerm} onChange={v => setField('leaseTerm', v)} options={['3 years', '5 years', '7 years', '10 years']} />
            </Field>
            <Field label="Monthly base rent (R)" hint="Excluding ops costs · for cash-flow modelling">
              <Input value={data.rent} onChange={v => setField('rent', v)} placeholder="48 000" />
            </Field>
            <Field label="Rev-share to landlord (%)" hint="Typical: 12–20%">
              <Input value={data.revShare} onChange={v => setField('revShare', v)} placeholder="18" />
            </Field>
            <Field label="Annual escalation (%)">
              <Input value={data.escalation} onChange={v => setField('escalation', v)} placeholder="8" />
            </Field>
            <Field label="Notice period (months)">
              <Input value={data.notice} onChange={v => setField('notice', v)} placeholder="6" />
            </Field>
          </div>
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">Heads-up on this address</div>
        <div className="ai-card__reason">
          Within 4 km I count <b>2 competitors</b> (StorageRSA Bryanston @ R 220/m², BoxOnDemand @ R 195/m²). Median household income suggests our <b>R 200–230/m²</b> band should clear at &gt;85% occupancy in 6–9 months. Want me to fill this step from <b>Rosebank</b> as a template?
        </div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="sparkles">Use Rosebank as template</Btn>
          <Btn size="sm" kind="ghost">Skip</Btn>
        </div>
      </AiTip>
    </div>
  );
}

// ——————————— Step 2: Building & zones ———————————
function StepBuilding({ data, setField }) {
  const zones = data.zones || [];
  const addZone = () => setField('zones', [...zones, { id: `Z${zones.length + 1}`, name: `Zone ${String.fromCharCode(65 + zones.length)}`, type: 'medium', units: 24, climate: false }]);
  const updateZone = (i, patch) => setField('zones', zones.map((z, j) => j === i ? { ...z, ...patch } : z));
  const removeZone = (i) => setField('zones', zones.filter((_, j) => j !== i));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="Building size">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Gross area (m²)">
              <Input value={data.gross} onChange={v => setField('gross', v)} placeholder="1 200" />
            </Field>
            <Field label="Lettable area (m²)" hint="Target 80%+ for healthy ROI">
              <Input value={data.lettable} onChange={v => setField('lettable', v)} placeholder="960" />
            </Field>
            <Field label="Efficiency ratio">
              <Input value={data.efficiency} onChange={v => setField('efficiency', v)} placeholder="80%" readonly />
            </Field>
            <Field label="Floors">
              <Select value={data.floors} onChange={v => setField('floors', v)} options={['1', '2', '3']} />
            </Field>
            <Field label="Ceiling height (m)">
              <Input value={data.ceiling} onChange={v => setField('ceiling', v)} placeholder="3.0" />
            </Field>
            <Field label="Floor loading (kg/m²)" hint="Important for heavy goods customers">
              <Input value={data.loading} onChange={v => setField('loading', v)} placeholder="500" />
            </Field>
          </div>
        </SubSection>

        <SubSection title="Zones" action={<Btn size="sm" kind="ghost" icon="plus" onClick={addZone}>Add zone</Btn>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zones.map((z, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 130px 90px 110px 32px', gap: 10, alignItems: 'center', padding: 10, background: 'white', border: '1px solid var(--ink-150)', borderRadius: 8 }}>
                <span style={{ width: 36, height: 36, borderRadius: 7, background: z.type === 'vip' ? '#FCF6E5' : z.climate ? 'var(--info-50)' : 'var(--ink-100)', color: z.type === 'vip' ? '#C8941F' : z.climate ? 'var(--info-700)' : 'var(--ink-600)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>{z.id}</span>
                <Input value={z.name} onChange={v => updateZone(i, { name: v })} />
                <Select value={z.type} onChange={v => updateZone(i, { type: v })} options={[
                  { v: 'small', l: 'Small (1–4 m²)' },
                  { v: 'medium', l: 'Medium (5–10 m²)' },
                  { v: 'large', l: 'Large (12–20 m²)' },
                  { v: 'vip', l: 'VIP / premium' },
                ]} />
                <Input value={z.units} onChange={v => updateZone(i, { units: Number(v) || 0 })} placeholder="units" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-700)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={z.climate} onChange={(e) => updateZone(i, { climate: e.target.checked })} /> Climate
                </label>
                <button onClick={() => removeZone(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: 4 }}><Icon name="x" size={14} /></button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: 12, background: 'var(--ink-50)', borderRadius: 8, display: 'flex', gap: 18, fontSize: 12.5 }}>
            <span><Icon name="grid" size={12} style={{ verticalAlign: -2, marginRight: 5 }} />Total units: <b>{zones.reduce((s, z) => s + (z.units || 0), 0)}</b></span>
            <span>VIP: <b>{zones.filter(z => z.type === 'vip').reduce((s, z) => s + (z.units || 0), 0)}</b></span>
            <span>Climate-controlled: <b>{zones.filter(z => z.climate).reduce((s, z) => s + (z.units || 0), 0)}</b></span>
          </div>
        </SubSection>

        <SubSection title="Floor plan">
          <DropZone
            label="Drag-and-drop a CAD or PDF floor plan"
            sub="We'll auto-extract walls, aisles and unit footprints to seed the interactive map. Designer can fine-tune in the Facility editor."
            icon="paperclip"
          />
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">Suggested zone mix</div>
        <div className="ai-card__reason">
          For a 960m² lettable, comparable urban sites do best with <b>~40% small · 45% medium · 12% large · 3% VIP</b>. That gives you <b>96 units</b> with strong starter price points. Want me to seed the zone table?
        </div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="sparkles">Seed zone mix</Btn>
        </div>
      </AiTip>
    </div>
  );
}

// ——————————— Step 3: Units & pricing ———————————
const TYPE_COLOR_CYCLE = ['var(--good-600)', 'var(--info-600)', 'var(--watch-600)', '#C8941F', '#7A5AE0', 'var(--bad-600)', '#2C9CDB', '#1F8A5B'];

function StepUnits({ data, setField }) {
  const types = data.unitTypes || defaultUnitTypes();
  const update = (i, patch) => setField('unitTypes', types.map((t, j) => j === i ? { ...t, ...patch } : t));
  const remove = (i) => setField('unitTypes', types.filter((_, j) => j !== i));
  const add = () => {
    const idx = types.length;
    setField('unitTypes', [...types, {
      id: `custom-${Date.now()}`,
      label: `Type ${idx + 1}`,
      color: TYPE_COLOR_CYCLE[idx % TYPE_COLOR_CYCLE.length],
      size: 6, count: 10, perSqm: 180,
      features: [],
    }]);
  };
  const updateFeatures = (i, csv) => update(i, { features: csv.split(',').map(s => s.trim()).filter(Boolean) });

  const [configureTypeId, setConfigureTypeId] = React.useState(null);

  const total = types.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const mrr = types.reduce((s, t) => s + ((Number(t.count) || 0) * (Number(t.size) || 0) * (Number(t.perSqm) || 0)), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="Unit types & pricing" action={<Btn size="sm" kind="ghost" icon="plus" onClick={add}>Add type</Btn>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 64px 64px 1fr 86px 86px 100px 130px 28px', gap: 10, padding: '8px 12px', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-500)', letterSpacing: 0.06, textTransform: 'uppercase' }}>
              <span>Type name</span>
              <span>m²</span>
              <span>Count</span>
              <span>Features (comma-sep.)</span>
              <span className="num">R / m²</span>
              <span className="num">Monthly</span>
              <span className="num">Total MRR</span>
              <span />
              <span />
            </div>
            {types.map((t, i) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '180px 64px 64px 1fr 86px 86px 100px 130px 28px', gap: 10, padding: 10, alignItems: 'center', background: 'white', border: '1px solid var(--ink-150)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => {
                    const idx = TYPE_COLOR_CYCLE.indexOf(t.color);
                    update(i, { color: TYPE_COLOR_CYCLE[(idx + 1) % TYPE_COLOR_CYCLE.length] });
                  }} title="Cycle colour" style={{ width: 12, height: 12, borderRadius: 3, background: t.color, border: 'none', cursor: 'pointer', flexShrink: 0 }} />
                  <Input value={t.label} onChange={v => update(i, { label: v })} />
                </div>
                <Input value={t.size} onChange={v => update(i, { size: Number(v) || 0 })} />
                <Input value={t.count} onChange={v => update(i, { count: Number(v) || 0 })} />
                <Input value={(t.features || []).join(', ')} onChange={v => updateFeatures(i, v)} placeholder="Climate, Per-unit alarm…" />
                <Input value={t.perSqm} onChange={v => update(i, { perSqm: Number(v) || 0 })} />
                <div className="num"><span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{FXTENANT.symbol} {((Number(t.size) || 0) * (Number(t.perSqm) || 0)).toLocaleString(FXTENANT.locale)}</span></div>
                <div className="num"><span style={{ fontWeight: 600, color: 'var(--good-700)' }}>{FXTENANT.symbol} {((Number(t.count) || 0) * (Number(t.size) || 0) * (Number(t.perSqm) || 0)).toLocaleString(FXTENANT.locale)}</span></div>
                <Btn size="sm" kind="ghost" icon="grid" onClick={() => setConfigureTypeId(t.id)}>Configure {Number(t.count) || 0} units</Btn>
                <button onClick={() => remove(i)} title="Remove type" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: 4 }}><Icon name="x" size={14} /></button>
              </div>
            ))}
            {types.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--ink-500)', fontSize: 12.5, border: '1px dashed var(--ink-200)', borderRadius: 8 }}>
                No unit types yet — add as many as you like, name them whatever fits this facility.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 64px 64px 1fr 86px 86px 100px 130px 28px', gap: 10, padding: 10, background: 'var(--ink-50)', borderRadius: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
              <span>Total</span>
              <span />
              <span className="num">{total}</span>
              <span />
              <span />
              <span />
              <span className="num"><span style={{ color: 'var(--good-700)' }}>{FXTENANT.symbol} {mrr.toLocaleString(FXTENANT.locale)}</span></span>
              <span />
              <span />
            </div>
          </div>
        </SubSection>

        <SubSection title="Pricing strategy">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Dynamic pricing">
              <Select value={data.dynPrice} onChange={v => setField('dynPrice', v)} options={['Enabled · 3-price engine', 'Listed prices only · no auto-adjust']} />
            </Field>
            <Field label="Move-in promo">
              <Select value={data.movePromo} onChange={v => setField('movePromo', v)} options={['First month 50% off (12-month sign)', 'First month free (no commit)', 'No promo']} />
            </Field>
            <Field label="B2B discount">
              <Select value={data.b2bDisc} onChange={v => setField('b2bDisc', v)} options={['5% standard', '10% on 5+ units', 'None']} />
            </Field>
            <Field label="Student discount">
              <Select value={data.studentDisc} onChange={v => setField('studentDisc', v)} options={['15% with verified .ac.za email', '10% with valid ID', 'None']} />
            </Field>
          </div>
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">Pricing benchmark</div>
        <div className="ai-card__reason">
          Comparable urban sites (Rosebank, Rivonia) hit <b>R 180–220 / m²</b> on small, <b>R 165–195</b> on medium, <b>R 145–175</b> on large. VIP/climate can charge 1.4×–1.6×. Your current table totals <b>{FXTENANT.symbol} {mrr.toLocaleString(FXTENANT.locale)} MRR at 100% occupancy</b> — at 85% target we'd see <b>{FXTENANT.symbol} {Math.round(mrr * 0.85).toLocaleString(FXTENANT.locale)}</b>.
        </div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="sparkles">Apply benchmark prices</Btn>
        </div>
      </AiTip>

      {configureTypeId && (
        <PerUnitConfigurator
          data={data}
          setField={setField}
          typeId={configureTypeId}
          onClose={() => setConfigureTypeId(null)}
        />
      )}
    </div>
  );
}

// ——————————— Step 4: Electrical & power ———————————
function StepElectric({ data, setField }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="Mains supply">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Phases">
              <Select value={data.phases} onChange={v => setField('phases', v)} options={['3-phase · 80A (recommended)', '3-phase · 60A', 'Single-phase · 60A']} />
            </Field>
            <Field label="Eskom account / SP">
              <Input value={data.eskom} onChange={v => setField('eskom', v)} placeholder="e.g. City of Cape Town · 1102-…" />
            </Field>
            <Field label="DBs serving the site" hint="How many distribution boards">
              <Input value={data.dbCount} onChange={v => setField('dbCount', v)} placeholder="2" />
            </Field>
            <Field label="Sub-metering" hint="Per-zone or per-tenant for landlord recovery">
              <Select value={data.subMeter} onChange={v => setField('subMeter', v)} options={['Per-zone smart meter', 'Single bulk meter', 'Not metered']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="DB layout">
          <div style={{ background: 'var(--ink-50)', borderRadius: 8, padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {(data.dbs || defaultDBs()).map((db, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--ink-900)', color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{db.id}</span>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{db.label}</div>
                  </div>
                  <table style={{ width: '100%', fontSize: 11.5, color: 'var(--ink-600)' }}>
                    <tbody>
                      {db.circuits.map((c, j) => (
                        <tr key={j}>
                          <td className="mono" style={{ padding: '3px 0', width: 50 }}>{c.id}</td>
                          <td style={{ padding: '3px 8px' }}>{c.label}</td>
                          <td className="num" style={{ padding: '3px 0', fontWeight: 600 }}>{c.amp}A</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </SubSection>

        <SubSection title="Backup power">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="UPS" hint="Sized for door access + AI gateway · runtime ≥ 4h">
              <Select value={data.ups} onChange={v => setField('ups', v)} options={['10 kVA · 6h runtime · door + gateway', '6 kVA · 4h runtime · gateway only', 'None']} />
            </Field>
            <Field label="Generator">
              <Select value={data.genset} onChange={v => setField('genset', v)} options={['25 kVA diesel · auto ATS', '15 kVA diesel · manual', 'None — UPS only']} />
            </Field>
            <Field label="Solar / battery (optional)" hint="Cape Town & Paarl sites recoup 40% via solar">
              <Select value={data.solar} onChange={v => setField('solar', v)} options={['10 kW solar + 20 kWh battery', '5 kW solar only', 'None']} />
            </Field>
            <Field label="Load-shedding strategy">
              <Select value={data.lsStrategy} onChange={v => setField('lsStrategy', v)} options={['UPS → generator @ stage 2+ · solar always on', 'UPS only · accept downtime past 4h', 'Manual switch by site staff']} />
            </Field>
          </div>

          <div className="ai-card" style={{ marginTop: 14 }}>
            <div className="ai-card__icon"><Icon name="sparkles" size={13} /></div>
            <div className="ai-card__bd">
              <div className="ai-card__meta">AI · load model</div>
              <div className="ai-card__title">Minimum backup load = 1.6 kW</div>
              <div className="ai-card__reason">UDM Pro (60W) + site gateway (40W) + 6 Kerong hubs (480W) + LED aisles on emergency (200W) + climate VIP (800W) = 1.58 kW. Recommended UPS: <b>3 kVA · 4h</b> minimum. Generator only kicks in stage 3+ outages.</div>
            </div>
          </div>
        </SubSection>

        <SubSection title="Energy monitoring">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Smart meter / current sensor" hint="Per DB · feeds the Devices dashboard">
              <Select value={data.energyMon} onChange={v => setField('energyMon', v)} options={['Shelly EM3 · per DB + WiFi (recommended)', 'CT clamps · Modbus to gateway', 'Eskom meter only']} />
            </Field>
            <Field label="Reporting cadence">
              <Select value={data.energyReport} onChange={v => setField('energyReport', v)} options={['Real-time on Devices screen + daily digest', 'Daily digest only', 'Monthly bill only']} />
            </Field>
          </div>
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">Eskom application checklist</div>
        <div className="ai-card__reason">For a {data.gross || '1 200'} m² facility, you'll need an Eskom NMD upgrade to <b>80A 3-phase</b>. Application typically takes 4–6 weeks. I've drafted the application — review at any point.</div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="paperclip">Open draft application</Btn>
        </div>
      </AiTip>
    </div>
  );
}

// ——————————— Step 5: Network & devices ———————————
function StepNetwork({ data, setField }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="WAN / internet">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Primary provider">
              <Select value={data.wan} onChange={v => setField('wan', v)} options={['Vumatel fibre · 200 Mbps', 'Openserve fibre · 100 Mbps', 'Frogfoot fibre · 200 Mbps', 'Mweb fibre · 100 Mbps', 'Vodacom LTE · primary']} />
            </Field>
            <Field label="Backup link">
              <Select value={data.wanBackup} onChange={v => setField('wanBackup', v)} options={['Vodacom LTE · failover', 'Telkom LTE · failover', 'None (single link)']} />
            </Field>
            <Field label="Static IP" hint="Needed for site-to-HQ VPN">
              <Select value={data.staticIp} onChange={v => setField('staticIp', v)} options={['Yes · /29 block', 'Yes · single IP', 'No · use Tailscale']} />
            </Field>
            <Field label="DNS / firewall">
              <Select value={data.firewall} onChange={v => setField('firewall', v)} options={['NextDNS · UniFi policy', 'UDM built-in only', 'Custom pfSense']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="UDM Pro & gateways">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="UDM model">
              <Select value={data.udmModel} onChange={v => setField('udmModel', v)} options={['UDM Pro · 8-PoE (recommended)', 'UDM SE · 8-PoE', 'UDM Base · 4-PoE']} />
            </Field>
            <Field label="Site gateways" hint="One per ~50 units, max 3 hubs per gateway">
              <Input value={data.gateways} onChange={v => setField('gateways', v)} placeholder="3" />
            </Field>
            <Field label="IP subnet · LAN">
              <Input value={data.lan} onChange={v => setField('lan', v)} placeholder="10.220.0.0/16" />
            </Field>
            <Field label="PoE budget" hint="Auto-calculated · UDM has 150W total">
              <Input value={data.poe} onChange={v => setField('poe', v)} placeholder="68 / 150 W" readonly />
            </Field>
          </div>

          <div style={{ marginTop: 14, padding: 14, background: 'var(--ink-50)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', letterSpacing: 0.06, textTransform: 'uppercase', marginBottom: 10 }}>PoE port allocation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {[
                { p: 1, l: 'GW-01 · Zone A', use: true },
                { p: 2, l: 'GW-02 · Zone B', use: true },
                { p: 3, l: 'GW-03 · Zone C', use: true },
                { p: 4, l: 'AP-01 · entrance', use: true },
                { p: 5, l: 'AP-02 · centre', use: true },
                { p: 6, l: 'CCTV NVR', use: true },
                { p: 7, l: 'Reserved', use: false },
                { p: 8, l: 'Reserved', use: false },
              ].map(p => (
                <div key={p.p} style={{ padding: '8px 10px', background: p.use ? 'white' : 'transparent', border: '1px dashed var(--ink-200)', borderColor: p.use ? 'var(--ink-200)' : 'var(--ink-200)', borderRadius: 6, fontSize: 11 }}>
                  <div style={{ color: 'var(--ink-500)', fontSize: 10, fontWeight: 600 }}>POE {p.p}</div>
                  <div style={{ fontWeight: p.use ? 600 : 400, color: p.use ? 'var(--ink-900)' : 'var(--ink-400)', marginTop: 2 }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>
        </SubSection>

        <SubSection title="Kerong hubs & locks">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Hubs required" hint="16 locks per hub · daisy-chain max 3 per gateway">
              <Input value={data.hubs} onChange={v => setField('hubs', v)} placeholder="6" readonly />
            </Field>
            <Field label="Lock model">
              <Select value={data.lockModel} onChange={v => setField('lockModel', v)} options={['Kerong KR-CU16 + KR-100 solenoid (standard)', 'Kerong KR-CU16 + KR-200 (heavy duty)', 'Kerong + mechanical override']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="WiFi (customer-facing)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="SSID">
              <Input value={data.ssid} onChange={v => setField('ssid', v)} placeholder="Flexistore Guest" />
            </Field>
            <Field label="Coverage">
              <Select value={data.wifi} onChange={v => setField('wifi', v)} options={['U6-Pro × 3 (entrance + aisles)', 'U6-LR × 2 (entrance only)', 'None']} />
            </Field>
          </div>
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">Network sized correctly</div>
        <div className="ai-card__reason">Based on <b>{data.unitTypes ? data.unitTypes.reduce((s, t) => s + t.count, 0) : 96} units</b>, you need <b>6 Kerong hubs</b> across <b>3 gateways</b> on PoE ports 1–3. UDM has 5 free ports for APs, CCTV NVR, and growth.</div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="paperclip">Generate Bill of Materials</Btn>
        </div>
      </AiTip>
    </div>
  );
}

// ——————————— Step 6: Access & security ———————————
function StepAccess({ data, setField }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SubSection title="Customer access">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Door access method">
              <Select value={data.access} onChange={v => setField('access', v)} options={['Flexistore app · Bluetooth + NFC (standard)', 'App + PIN backup', 'App only']} />
            </Field>
            <Field label="QR self-tour" hint="Walk-ins scan a QR to view available units">
              <Select value={data.qrTour} onChange={v => setField('qrTour', v)} options={['Enabled · 24/7', 'Office hours only', 'Disabled']} />
            </Field>
            <Field label="Digital key sharing">
              <Select value={data.keyShare} onChange={v => setField('keyShare', v)} options={['Up to 5 shared keys / unit · time-limited', 'Up to 2 shared keys', 'Owner only']} />
            </Field>
            <Field label="Auto-revoke on arrears">
              <Select value={data.autoRevoke} onChange={v => setField('autoRevoke', v)} options={['Day 30 · standard', 'Day 14 · aggressive', 'Manual only']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="CCTV">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cameras">
              <Input value={data.cctv} onChange={v => setField('cctv', v)} placeholder="6 × UniFi G5 Bullet" />
            </Field>
            <Field label="NVR / retention">
              <Select value={data.nvr} onChange={v => setField('nvr', v)} options={['NVR Pro · 30-day retention', 'NVR · 14-day retention', 'Cloud-only']} />
            </Field>
            <Field label="Smart detection">
              <Select value={data.smartDet} onChange={v => setField('smartDet', v)} options={['Person + vehicle · alert AI', 'Motion only', 'No detection']} />
            </Field>
            <Field label="Police link">
              <Select value={data.police} onChange={v => setField('police', v)} options={['Direct link to ADT armed response', 'Local SAPS station notify', 'None']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="Alarms & emergency">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Per-unit alarm">
              <Select value={data.unitAlarm} onChange={v => setField('unitAlarm', v)} options={['Door + motion · standard', 'Door only', 'Optional add-on']} />
            </Field>
            <Field label="Smoke / fire detection">
              <Select value={data.smoke} onChange={v => setField('smoke', v)} options={['Per-zone smoke + heat (SANS)', 'Smoke only', 'Single building detector']} />
            </Field>
            <Field label="Sprinklers">
              <Select value={data.sprinklers} onChange={v => setField('sprinklers', v)} options={['Wet system · full coverage', 'Dry pipe · high-value zones', 'None (extinguishers only)']} />
            </Field>
            <Field label="Emergency exit">
              <Select value={data.emergencyExit} onChange={v => setField('emergencyExit', v)} options={['2 exits · maglock with break-glass', '1 exit · push bar', 'Main entrance only']} />
            </Field>
          </div>
        </SubSection>

        <SubSection title="Operator overrides">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Master access code" hint="Geir + Adam only · audit-logged">
              <Input value={data.masterCode} onChange={v => setField('masterCode', v)} placeholder="Auto-generated" readonly />
            </Field>
            <Field label="Tech access (after-hours)">
              <Select value={data.techAccess} onChange={v => setField('techAccess', v)} options={['Time-bounded NFC tag · per visit', 'Permanent NFC + log', 'Master code only']} />
            </Field>
          </div>
        </SubSection>
      </div>

      <AiTip>
        <div className="ai-card__title">SANS 10400 compliance preview</div>
        <div className="ai-card__reason">Current configuration meets SANS 10400-T (fire), -W (water) and Occupational H&amp;S Act requirements for a self-storage facility under 2 000 m². I've drafted the compliance pack for sign-off.</div>
        <div className="ai-card__actions">
          <Btn size="sm" kind="ai" icon="paperclip">Open compliance pack</Btn>
        </div>
      </AiTip>
    </div>
  );
}

// ——————————— Step 7: Launch checklist ———————————
function StepLaunch({ data, setField }) {
  const checks = [
    { cat: 'Legal',       items: [
      { id: 'lease',  l: 'Signed lease + landlord intro pack',         done: !!data.landlord },
      { id: 'munic',  l: 'Municipal change-of-use approval',           done: true },
      { id: 'fire',   l: 'Fire compliance certificate (SANS 10400-T)', done: false },
      { id: 'cipc',   l: 'CIPC update · new trading address',          done: true },
    ]},
    { cat: 'Build-out',   items: [
      { id: 'walls',  l: 'Internal walls + panels installed',          done: true },
      { id: 'floor',  l: 'Floor sealed + numbered',                    done: true },
      { id: 'doors',  l: 'Doors hung + Kerong locks fitted',           done: false },
      { id: 'paint',  l: 'Branding paint + signage',                   done: false },
    ]},
    { cat: 'Electrical',  items: [
      { id: 'eskom',  l: 'Eskom NMD upgrade · 80A 3-phase',            done: false },
      { id: 'dbs',    l: 'DBs energised + tested',                     done: false },
      { id: 'ups',    l: 'UPS commissioned',                           done: false },
      { id: 'genset', l: 'Generator + ATS load-tested',                done: false },
      { id: 'solar',  l: 'Solar + battery sign-off',                   done: false },
    ]},
    { cat: 'Network',     items: [
      { id: 'wan',    l: 'Fibre + LTE backup active',                  done: !!data.wan },
      { id: 'udm',    l: 'UDM Pro configured + adopted',               done: false },
      { id: 'gws',    l: 'Site gateways online · all hubs handshake',  done: false },
      { id: 'cctv',   l: 'CCTV feeds visible from HQ',                 done: false },
      { id: 'wifi',   l: 'Guest WiFi published',                       done: false },
    ]},
    { cat: 'Access',      items: [
      { id: 'pos',    l: 'All units mapped to lock ports',             done: false },
      { id: 'qr',     l: 'QR self-tour codes printed + on doors',      done: false },
      { id: 'test',   l: 'End-to-end open from app · all units',       done: false },
      { id: 'audit',  l: 'Audit log shipping to HQ',                   done: false },
    ]},
    { cat: 'Go-live',     items: [
      { id: 'web',    l: 'Site listed on flexistore.co.za',            done: false },
      { id: 'gads',   l: 'Google Ads + local SEO launched',            done: false },
      { id: 'staff',  l: 'Customer service trained on new site',       done: false },
      { id: 'tour',   l: 'Geir + Adam walkthrough sign-off',           done: false },
    ]},
  ];

  const all = checks.flatMap(c => c.items);
  const doneN = all.filter(c => c.done).length;
  const totalN = all.length;
  const pct = doneN / totalN;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Summary banner */}
        <div style={{ padding: 20, background: pct === 1 ? 'var(--good-50)' : 'var(--ink-50)', borderRadius: 12, border: `1px solid ${pct === 1 ? 'var(--good-100)' : 'var(--ink-150)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Donut value={pct} size={64} stroke={8} color={pct === 1 ? 'var(--good-600)' : 'var(--orange-600)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)' }}>{doneN} of {totalN} ready</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 3 }}>{pct === 1 ? 'You can go live. 🟢' : `${totalN - doneN} items remaining · estimated ${Math.ceil((totalN - doneN) * 1.5)} working days`}</div>
            </div>
            <div>
              <Btn size="sm" kind="ghost" icon="paperclip">Export PDF</Btn>
            </div>
          </div>
        </div>

        {checks.map(cat => {
          const catDone = cat.items.filter(i => i.done).length;
          return (
            <div key={cat.cat} style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>{cat.cat}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)' }}>{catDone}/{cat.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {cat.items.map(it => (
                  <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 9px', borderRadius: 6, cursor: 'pointer', background: it.done ? 'var(--good-50)' : 'transparent' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: it.done ? 'var(--good-600)' : 'white', border: it.done ? 'none' : '1.5px solid var(--ink-300)', display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}>
                      {it.done && <Icon name="check" size={11} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: it.done ? 'var(--good-700)' : 'var(--ink-700)', fontWeight: it.done ? 500 : 500, textDecoration: it.done ? 'line-through' : 'none' }}>{it.l}</span>
                    <Btn size="sm" kind="quiet" icon="user">Assign</Btn>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Target go-live">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Soft launch (staff only)">
              <Input value={data.softLaunch} onChange={v => setField('softLaunch', v)} placeholder="20 Jun 2026" />
            </Field>
            <Field label="Public launch">
              <Input value={data.publicLaunch} onChange={v => setField('publicLaunch', v)} placeholder="1 Jul 2026" />
            </Field>
            <Field label="Marketing kick-off">
              <Input value={data.marketingStart} onChange={v => setField('marketingStart', v)} placeholder="15 Jun 2026" />
            </Field>
          </div>
        </Card>

        <Card title="Estimated finances">
          <KV3 lbl="CapEx total" val="R 1.42M" sub="Build + electrical + network + locks" />
          <KV3 lbl="Monthly OpEx" val="R 76 400" sub="Rent · utilities · staff share" />
          <KV3 lbl="Break-even occupancy" val="58%" sub="At target prices" />
          <KV3 lbl="Payback" val="22 months" sub="If we hit 85% by month 9" />
        </Card>

        <AiTip>
          <div className="ai-card__title">I'll handle the bookings</div>
          <div className="ai-card__reason">Once you launch this facility, I can auto-create:
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>UDM Pro UniFi site profile</li>
              <li>Kerong hub address map → IDs</li>
              <li>Xero contact + rev-share tracking</li>
              <li>iBidOnStorage seller record</li>
              <li>Marketing landing page · flexistore.co.za</li>
            </ul>
          </div>
          <div className="ai-card__actions">
            <Btn size="sm" kind="ai" icon="check">Pre-create all</Btn>
          </div>
        </AiTip>
      </div>
    </div>
  );
}

function KV3({ lbl, val, sub }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-500)', fontWeight: 500 }}>{lbl}</span>
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--ink-900)' }}>{val}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ——————————— Helpers ———————————
function SubSection({ title, action, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink-900)' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, hint, full, children }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : null}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-700)', display: 'block', marginBottom: 3 }}>{label}</label>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 5 }}>{hint}</div>}
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type = 'text', readonly, small }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readonly}
      style={{
        width: '100%',
        padding: small ? '4px 7px' : '7px 11px',
        border: '1px solid var(--ink-200)',
        borderRadius: 7,
        fontSize: 13,
        outline: 'none',
        background: readonly ? 'var(--ink-50)' : 'white',
        color: readonly ? 'var(--ink-500)' : 'var(--ink-800)',
        fontFamily: 'var(--font-body)',
      }}
    />
  );
}
function Select({ value, onChange, options }) {
  return (
    <select value={value || ''} onChange={(e) => onChange?.(e.target.value)} style={{ width: '100%', padding: '7px 9px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 13, background: 'white', color: 'var(--ink-800)', fontFamily: 'var(--font-body)' }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.v;
        const l = typeof o === 'string' ? o : o.l;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}
function AiTip({ children }) {
  return (
    <div className="ai-card" style={{ position: 'sticky', top: 0 }}>
      <div className="ai-card__icon"><Icon name="sparkles" size={15} /></div>
      <div className="ai-card__bd">
        <div className="ai-card__meta">AI · assistant</div>
        {children}
      </div>
    </div>
  );
}
function DropZone({ label, sub, icon }) {
  return (
    <div style={{ border: '2px dashed var(--ink-200)', borderRadius: 10, padding: 24, textAlign: 'center', background: 'var(--ink-50)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: 'white', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--ink-500)', border: '1px solid var(--ink-150)' }}>
        <Icon name={icon} size={17} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4, maxWidth: 460, margin: '4px auto 12px' }}>{sub}</div>
      <Btn size="sm" kind="ghost" icon="paperclip">Browse files</Btn>
    </div>
  );
}

// ——————————— Defaults ———————————
function defaultFacilityData() {
  return {
    name: '', short: '', city: '', region: 'Johannesburg',
    address: '', gps: '', hours: '24/7 self-access',
    landlord: '', landlordContact: '',
    leaseStart: '', leaseTerm: '5 years', rent: '', revShare: '18', escalation: '8', notice: '6',
    gross: '1 200', lettable: '960', efficiency: '80%', floors: '1', ceiling: '3.0', loading: '500',
    zones: [
      { id: 'Z1', name: 'Zone A · Small lockers', type: 'small', units: 38, climate: false },
      { id: 'Z2', name: 'Zone B · Medium units',  type: 'medium', units: 44, climate: false },
      { id: 'Z3', name: 'Zone C · Large units',   type: 'large', units: 12, climate: false },
      { id: 'Z4', name: 'Zone V · VIP climate',   type: 'vip', units: 6,  climate: true },
    ],
    unitTypes: defaultUnitTypes(),
    vipTemp: '16–18 °C', vipHumidity: '55–65 %RH', vipAlarm: 'Motion + door · 24/7', vipCamera: 'Per-aisle CCTV', vipConcierge: 'By appointment', vipPack: 'Yes — branded',
    dynPrice: 'Enabled · 3-price engine', movePromo: 'First month 50% off (12-month sign)', b2bDisc: '5% standard', studentDisc: '15% with verified .ac.za email',
    phases: '3-phase · 80A (recommended)', eskom: '', dbCount: '2', subMeter: 'Per-zone smart meter',
    dbs: defaultDBs(),
    ups: '10 kVA · 6h runtime · door + gateway', genset: '25 kVA diesel · auto ATS', solar: '10 kW solar + 20 kWh battery',
    lsStrategy: 'UPS → generator @ stage 2+ · solar always on',
    energyMon: 'Shelly EM3 · per DB + WiFi (recommended)', energyReport: 'Real-time on Devices screen + daily digest',
    wan: 'Vumatel fibre · 200 Mbps', wanBackup: 'Vodacom LTE · failover', staticIp: 'Yes · /29 block', firewall: 'NextDNS · UniFi policy',
    udmModel: 'UDM Pro · 8-PoE (recommended)', gateways: '3', lan: '10.220.0.0/16', poe: '68 / 150 W',
    hubs: '6', lockModel: 'Kerong KR-CU16 + KR-100 solenoid (standard)',
    ssid: 'Flexistore Guest', wifi: 'U6-Pro × 3 (entrance + aisles)',
    access: 'Flexistore app · Bluetooth + NFC (standard)', qrTour: 'Enabled · 24/7', keyShare: 'Up to 5 shared keys / unit · time-limited', autoRevoke: 'Day 30 · standard',
    cctv: '6 × UniFi G5 Bullet', nvr: 'NVR Pro · 30-day retention', smartDet: 'Person + vehicle · alert AI', police: 'Direct link to ADT armed response',
    unitAlarm: 'Door + motion · standard', smoke: 'Per-zone smoke + heat (SANS)', sprinklers: 'Wet system · full coverage', emergencyExit: '2 exits · maglock with break-glass',
    masterCode: '••• generated on launch •••', techAccess: 'Time-bounded NFC tag · per visit',
    softLaunch: '', publicLaunch: '', marketingStart: '',
  };
}
function defaultUnitTypes() {
  return [
    { id: 'small',   label: 'Small',    color: 'var(--good-600)',  size: 3,  count: 38, perSqm: 210, features: ['Locker · indoor'] },
    { id: 'medium',  label: 'Medium',   color: 'var(--info-600)',  size: 7,  count: 44, perSqm: 185, features: ['Walk-in'] },
    { id: 'large',   label: 'Large',    color: 'var(--watch-600)', size: 16, count: 12, perSqm: 160, features: ['Drive-up', '2.4m door'] },
    { id: 'vip',     label: 'VIP / climate', color: '#C8941F',     size: 18, count: 6,  perSqm: 280, features: ['Climate', 'Per-unit alarm', 'Concierge'] },
  ];
}
function defaultDBs() {
  return [
    { id: 'DB-1', label: 'Main · mains + locks', circuits: [
      { id: 'C-01', label: 'Office + admin',         amp: 10 },
      { id: 'C-02', label: 'Kerong hubs · 24V rail', amp: 20 },
      { id: 'C-03', label: 'CCTV + UDM',             amp: 6 },
      { id: 'C-04', label: 'Aisle LED · Zones A+B',  amp: 10 },
    ]},
    { id: 'DB-2', label: 'Backup · VIP + climate', circuits: [
      { id: 'C-05', label: 'VIP zone climate (AC)',  amp: 20 },
      { id: 'C-06', label: 'VIP per-unit sensors',   amp: 6 },
      { id: 'C-07', label: 'Emergency exit + alarm', amp: 10 },
      { id: 'C-08', label: 'Solar input',            amp: 32 },
    ]},
  ];
}

window.NewFacilityScreen = NewFacilityScreen;

// ——————————— Per-unit configurator ———————————
// Lets the operator drill into a type and configure each unit individually:
// name, number, VIP toggle, hub/port, distance from entrance, lock/sensor/light.
function PerUnitConfigurator({ data, setField, typeId, onClose }) {
  const type = (data.unitTypes || []).find(t => t.id === typeId);
  if (!type) return null;

  // The per-unit override map lives in data.unitDetails[typeId] = [{number, ...}]
  const detailsMap = data.unitDetails || {};
  const existing = detailsMap[typeId] || [];
  const short = data.short || 'XX';

  // Generate full list, merging existing overrides with defaults.
  const units = React.useMemo(() => {
    const count = Number(type.count) || 0;
    const out = [];
    for (let i = 0; i < count; i++) {
      const existingUnit = existing.find(u => u.idx === i);
      const defaultNumber = (i + 1).toString().padStart(2, '0');
      const hubsTotal = Number(data.hubs || 6);
      const gatewaysTotal = Number(data.gateways || 3);
      const hubsPerGw = Math.max(1, Math.ceil(hubsTotal / gatewaysTotal));
      const hubIdx = Math.floor(i / 16);
      const gwIdx = Math.floor(hubIdx / hubsPerGw);
      const port = (i % 16) + 1;
      out.push({
        idx: i,
        number: existingUnit?.number ?? defaultNumber,
        name: existingUnit?.name ?? `${type.label} ${defaultNumber}`,
        vip: existingUnit?.vip ?? ((type.features || []).some(f => /vip/i.test(f))),
        lockModel: existingUnit?.lockModel ?? 'KR-100 solenoid',
        sensor: existingUnit?.sensor ?? (type.features?.some(f => /alarm/i.test(f)) ? 'Door + motion' : 'Door only'),
        light: existingUnit?.light ?? 'LED · aisle shared',
        hub: existingUnit?.hub ?? `${short}-HUB-${(hubIdx + 1).toString().padStart(2, '0')}`,
        port: existingUnit?.port ?? port,
        gateway: existingUnit?.gateway ?? `${short}-GW-${(gwIdx + 1).toString().padStart(2, '0')}`,
        poePort: existingUnit?.poePort ?? (gwIdx + 1),
        metersFromEntrance: existingUnit?.metersFromEntrance ?? Math.round(6 + i * 1.2),
      });
    }
    return out;
  }, [type, existing, data.hubs, data.gateways, short]);

  const [editingIdx, setEditingIdx] = React.useState(null);

  const persist = (idx, patch) => {
    const next = (detailsMap[typeId] || []).filter(u => u.idx !== idx);
    const merged = { ...units[idx], ...patch };
    next.push({
      idx,
      number: merged.number,
      name: merged.name,
      vip: merged.vip,
      lockModel: merged.lockModel,
      sensor: merged.sensor,
      light: merged.light,
      hub: merged.hub,
      port: merged.port,
      gateway: merged.gateway,
      poePort: merged.poePort,
      metersFromEntrance: merged.metersFromEntrance,
    });
    setField('unitDetails', { ...detailsMap, [typeId]: next });
  };

  const editing = editingIdx != null ? units[editingIdx] : null;

  return (
    <Modal
      open onClose={onClose}
      title={`Configure ${type.label} units`}
      subtitle={`${units.length} units · click any row to edit · per-unit overrides save automatically`}
      width={1100}
      footer={
        <>
          <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--ink-500)' }}>
            <Icon name="sparkles" size={11} style={{ verticalAlign: -2, marginRight: 4, color: 'var(--ai-600)' }} />
            AI auto-assigned hub/port and entrance distance — adjust as needed.
          </span>
          <Btn kind="ghost" onClick={onClose}>Done</Btn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: editing ? '1.4fr 1fr' : '1fr', gap: 16 }}>
        {/* Units list */}
        <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>Name</th><th>VIP</th><th>Hub · Port</th><th>Gateway · PoE</th><th>m from door</th><th></th></tr></thead>
              <tbody>
                {units.map((u, i) => (
                  <tr key={i} onClick={() => setEditingIdx(i)} style={{ cursor: 'pointer', background: editingIdx === i ? 'var(--orange-50)' : 'transparent' }}>
                    <td className="mono" style={{ fontWeight: 600 }}>{short}-{u.number}</td>
                    <td>{u.name}</td>
                    <td>{u.vip ? <Badge tone="watch">★ VIP</Badge> : <span className="muted">—</span>}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{u.hub} · P{u.port.toString().padStart(2, '0')}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{u.gateway} · PoE {u.poePort}</td>
                    <td className="num">{u.metersFromEntrance} m</td>
                    <td className="right"><Icon name="chevron-right" size={12} style={{ color: 'var(--ink-400)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit panel */}
        {editing && (
          <div style={{ background: 'white', border: '1px solid var(--ink-150)', borderRadius: 10, padding: 16, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: type.color, color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11 }}>{short}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }} className="mono">{short}-{editing.number}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{type.label} · {type.size} m²</div>
              </div>
              <button onClick={() => setEditingIdx(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-400)' }}><Icon name="x" size={15} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Unit number" hint="Shown on door · in app">
                <Input value={editing.number} onChange={v => persist(editing.idx, { number: v })} />
              </Field>
              <Field label="Display name" hint="Internal label — also visible to admin">
                <Input value={editing.name} onChange={v => persist(editing.idx, { name: v })} />
              </Field>

              <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 10, background: editing.vip ? '#FCF6E5' : 'var(--ink-50)', borderRadius: 7, cursor: 'pointer', border: editing.vip ? '1px solid #E6CE89' : '1px solid transparent' }}>
                <input type="checkbox" checked={editing.vip} onChange={(e) => persist(editing.idx, { vip: e.target.checked })} />
                <span style={{ fontSize: 13, fontWeight: 600, color: editing.vip ? '#7A5A14' : 'var(--ink-800)' }}>★ Mark as VIP</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-500)' }}>Per-unit alarm · concierge · climate</span>
              </label>

              <SubFieldGroup title="Hardware">
                <Field label="Lock">
                  <Select value={editing.lockModel} onChange={v => persist(editing.idx, { lockModel: v })} options={['KR-100 solenoid', 'KR-200 heavy-duty', 'KR-300 climate-rated', 'Manual override (special)']} />
                </Field>
                <Field label="Sensor">
                  <Select value={editing.sensor} onChange={v => persist(editing.idx, { sensor: v })} options={['Door only', 'Door + motion', 'Door + motion + temp', 'None']} />
                </Field>
                <Field label="Light">
                  <Select value={editing.light} onChange={v => persist(editing.idx, { light: v })} options={['LED · aisle shared', 'LED · per-unit motion', 'LED · always on', 'None']} />
                </Field>
              </SubFieldGroup>

              <SubFieldGroup title="Wiring · physical">
                <Field label="Hub" hint="Where the lock plugs in">
                  <Input value={editing.hub} onChange={v => persist(editing.idx, { hub: v })} />
                </Field>
                <Field label="Hub port (1–16)">
                  <Input value={editing.port} onChange={v => persist(editing.idx, { port: Number(v) || 1 })} />
                </Field>
                <Field label="Gateway" hint="Hub's upstream gateway">
                  <Input value={editing.gateway} onChange={v => persist(editing.idx, { gateway: v })} />
                </Field>
                <Field label="Gateway PoE port" hint="On the UDM Pro">
                  <Input value={editing.poePort} onChange={v => persist(editing.idx, { poePort: Number(v) || 1 })} />
                </Field>
              </SubFieldGroup>

              <Field label="Meters from entrance door" hint="Used for app walking directions">
                <Input value={editing.metersFromEntrance} onChange={v => persist(editing.idx, { metersFromEntrance: Number(v) || 0 })} />
              </Field>

              <div style={{ padding: 10, background: 'var(--ai-50)', border: '1px solid var(--ai-100)', borderRadius: 7, fontSize: 11.5, color: 'var(--ai-700)', lineHeight: 1.5 }}>
                <Icon name="sparkles" size={11} style={{ verticalAlign: -2, marginRight: 4 }} />
                Wiring map will appear on Devices → Hub view (lock port {editing.port}) and in the floor plan.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SubFieldGroup({ title, children }) {
  return (
    <div style={{ padding: 12, background: 'var(--ink-50)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-500)' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
    </div>
  );
}
