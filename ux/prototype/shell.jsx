/* ============================================================
   Flexistore CRM — app shell (sidebar + topbar)
   Plus the route table and minimal hash-router.
   ============================================================ */

const NAV = [
  { id: 'cockpit',   label: 'Ops cockpit',  icon: 'grid',   badge: null },
  { id: 'inbox',     label: 'Inbox',        icon: 'inbox',  badge: 6 },
  { id: 'customers', label: 'Customers',    icon: 'users' },
  { id: 'corporate', label: 'Corporate',    icon: 'building' },
  { id: 'leads',     label: 'Leads',        icon: 'lead',   badge: 8 },
  { id: 'ai',        label: 'AI activity',  icon: 'sparkles' },
  { id: 'devices',   label: 'Devices',      icon: 'sensor', badge: null },
  { id: 'facilities',label: 'Facilities',   icon: 'building' },
  { id: 'billing',   label: 'Subs & invoices', icon: 'invoice' },
  { id: 'arrears',   label: 'Arrears',      icon: 'alert' },
  { id: 'reports',   label: 'Reports',      icon: 'chart' },
  { id: 'migration', label: 'Migration',    icon: 'settings' },
];

function Sidebar({ route, onNav, mode, kpi }) {
  const NAV_WORKSPACE = NAV.slice(0, 6);
  const NAV_OPS = NAV.slice(6);
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src={(window.__resources && window.__resources.fxLogo) || "fx-logo.svg"} alt="Flexistore" style={{ height: 26, display: 'block', filter: 'invert(1) brightness(1.05)' }} />
        <div className="sidebar__brand-sub" style={{ marginTop: 6 }}>Operator console</div>
      </div>

      <div className="nav-section">Workspace</div>
      {NAV_WORKSPACE.map(item => (
        <NavRow key={item.id} item={item} active={route === item.id} onClick={() => onNav(item.id)} mode={mode} kpi={kpi} />
      ))}

      <div className="nav-section">Operations</div>
      {NAV_OPS.map(item => (
        <NavRow key={item.id} item={item} active={route === item.id} onClick={() => onNav(item.id)} mode={mode} kpi={kpi} />
      ))}

      <div className="sidebar__footer">
        <div className="sidebar__avatar">GT</div>
        <div style={{ flex: 1 }}>
          <div className="sidebar__user">Geir Tellefsen</div>
          <div className="sidebar__role">Org admin · all tenants</div>
        </div>
        <button className="btn btn--quiet btn--icon" style={{ color: 'var(--navy-100)' }} title="Settings"><Icon name="settings" size={15} /></button>
      </div>
    </aside>
  );
}

function NavRow({ item, active, onClick, mode, kpi }) {
  // compute dynamic badges per route based on mode
  let badge = item.badge;
  let badgeTone = 'default';
  if (item.id === 'inbox') {
    badge = mode === 'crisis' ? 14 : mode === 'quiet' ? 1 : 6;
    if (mode === 'crisis') badgeTone = 'urgent';
  }
  if (item.id === 'devices') {
    if (mode === 'crisis') { badge = 7; badgeTone = 'urgent'; }
    else if (mode === 'busy') { badge = 3; badgeTone = 'urgent'; }
    else badge = null;
  }
  if (item.id === 'arrears') {
    badge = mode === 'crisis' ? 9 : mode === 'quiet' ? 1 : 5;
  }
  if (item.id === 'leads') {
    badge = mode === 'crisis' ? 12 : mode === 'quiet' ? 3 : 8;
  }
  if (item.id === 'ai') {
    badge = mode === 'crisis' ? 11 : mode === 'quiet' ? 2 : 4;
    badgeTone = 'ai';
  }

  return (
    <button className={`nav-item ${active ? 'is-active' : ''}`} onClick={onClick} style={{ border: 'none', textAlign: 'left', width: '100%', color: 'inherit', font: 'inherit' }}>
      <Icon name={item.icon} size={17} className="nav-item__icon" />
      <span className="nav-item__label">{item.label}</span>
      {badge != null && (
        <span className={`nav-item__badge ${badgeTone === 'urgent' ? '' : 'nav-item__badge--muted'}`} style={badgeTone === 'ai' ? { background: 'var(--ai-600)', color: 'white' } : null}>{badge}</span>
      )}
    </button>
  );
}

function Topbar({ route }) {
  const routeLabel = NAV.find(n => n.id === route)?.label || 'Console';
  const tenant = useTenant();
  return (
    <header className="topbar">
      <div className="topbar__crumb">
        {tenant.name} <Icon name="chevron-right" size={11} style={{ verticalAlign: -1, opacity: 0.5, margin: '0 4px' }} />
        <span className="topbar__crumb-current">{routeLabel}</span>
      </div>

      <div className="topbar__search">
        <Icon name="search" />
        <input placeholder="Search customers, units, invoices, leads…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar__right">
        <TenantSwitcher canSwitch={true} />
        <button className="btn btn--ghost btn--icon" title="Notifications" style={{ position: 'relative' }}>
          <Icon name="bell" size={15} />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--orange-600)', border: '1.5px solid white' }} />
        </button>
        <button className="btn btn--ghost" style={{ gap: 7 }}>
          <Icon name="sparkles" size={14} style={{ color: 'var(--ai-600)' }} />
          Ask AI
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar, NAV, FlexistoreLogo });

function FlexistoreLogo({ color = '#2A2A2A', markColor, height = 28, markOnly = false, wordOnly = false }) {
  // Two box-glyphs with diagonals + "Flexistore" wordmark.
  const stroke = markColor || color;
  if (markOnly) {
    return (
      <svg viewBox="0 0 44 50" height={height} style={{ display: 'block' }} aria-label="Flexistore">
        <g fill="none" stroke={stroke} strokeWidth="2.5">
          <rect x="2" y="5" width="18" height="40" rx="1" />
          <line x1="2" y1="25" x2="20" y2="25" />
          <line x1="2" y1="5" x2="20" y2="25" />
          <line x1="20" y1="5" x2="2" y2="25" />
          <line x1="2" y1="25" x2="20" y2="45" />
          <line x1="20" y1="25" x2="2" y2="45" />
          <rect x="24" y="5" width="18" height="40" rx="1" />
          <line x1="24" y1="25" x2="42" y2="25" />
          <line x1="24" y1="5" x2="42" y2="25" />
          <line x1="42" y1="5" x2="24" y2="25" />
          <line x1="24" y1="25" x2="42" y2="45" />
          <line x1="42" y1="25" x2="24" y2="45" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 300 50" height={height} style={{ display: 'block' }} aria-label="Flexistore">
      <g fill="none" stroke={stroke} strokeWidth="2.5">
        <rect x="2" y="5" width="18" height="40" rx="1" />
        <line x1="2" y1="25" x2="20" y2="25" />
        <line x1="2" y1="5" x2="20" y2="25" />
        <line x1="20" y1="5" x2="2" y2="25" />
        <line x1="2" y1="25" x2="20" y2="45" />
        <line x1="20" y1="25" x2="2" y2="45" />
        <rect x="24" y="5" width="18" height="40" rx="1" />
        <line x1="24" y1="25" x2="42" y2="25" />
        <line x1="24" y1="5" x2="42" y2="25" />
        <line x1="42" y1="5" x2="24" y2="25" />
        <line x1="24" y1="25" x2="42" y2="45" />
        <line x1="42" y1="25" x2="24" y2="45" />
      </g>
      <text x="54" y="37" fontFamily="'DM Sans', 'Montserrat', system-ui, sans-serif" fontSize="32" fontWeight="500" fill={color} letterSpacing="0">Flexistore</text>
    </svg>
  );
}
