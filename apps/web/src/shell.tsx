import { Icon } from './icons.js';
import { TenantSwitcher, useTenant } from './tenants.js';

export type NavItem = { id: string; label: string; icon: string };

/**
 * Badge counts (inbox unread, AI proposals, arrears cases) are Phase 4/5 features with no live
 * source yet — the prototype faked them from a mock "mode" scenario. Rather than ship fake
 * numbers, badges are omitted here until each screen has a real count to show.
 */
export const NAV: NavItem[] = [
  { id: 'cockpit', label: 'Ops cockpit', icon: 'grid' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'corporate', label: 'Corporate', icon: 'building' },
  { id: 'leads', label: 'Leads', icon: 'lead' },
  { id: 'ai', label: 'AI activity', icon: 'sparkles' },
  { id: 'devices', label: 'Devices', icon: 'sensor' },
  { id: 'facilities', label: 'Facilities', icon: 'building' },
  { id: 'billing', label: 'Subs & invoices', icon: 'invoice' },
  { id: 'arrears', label: 'Arrears', icon: 'alert' },
  { id: 'reports', label: 'Reports', icon: 'chart' },
  { id: 'migration', label: 'Migration', icon: 'settings' },
];

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function Sidebar({ route, onNav }: { route: string; onNav: (id: string) => void }) {
  const { current } = useTenant();
  const NAV_WORKSPACE = NAV.slice(0, 6);
  const NAV_OPS = NAV.slice(6);
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <FlexistoreLogo color="white" height={26} />
        <div className="sidebar__brand-sub" style={{ marginTop: 6 }}>Operator console</div>
      </div>

      <div className="nav-section">Workspace</div>
      {NAV_WORKSPACE.map((item) => (
        <NavRow key={item.id} item={item} active={route === item.id} onClick={() => onNav(item.id)} />
      ))}

      <div className="nav-section">Operations</div>
      {NAV_OPS.map((item) => (
        <NavRow key={item.id} item={item} active={route === item.id} onClick={() => onNav(item.id)} />
      ))}

      <div className="sidebar__footer">
        <div className="sidebar__avatar">{initials(current.name)}</div>
        <div style={{ flex: 1 }}>
          <div className="sidebar__user">{current.name}</div>
          <div className="sidebar__role">{current.role}</div>
        </div>
        <button className="btn btn--quiet btn--icon" style={{ color: 'var(--navy-100)' }} title="Settings"><Icon name="settings" size={15} /></button>
      </div>
    </aside>
  );
}

function NavRow({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? 'is-active' : ''}`} onClick={onClick} style={{ border: 'none', textAlign: 'left', width: '100%', color: 'inherit', font: 'inherit' }}>
      <Icon name={item.icon} size={17} className="nav-item__icon" />
      <span className="nav-item__label">{item.label}</span>
    </button>
  );
}

export function Topbar({ route }: { route: string }) {
  const routeLabel = NAV.find((n) => n.id === route)?.label ?? 'Console';
  const { current } = useTenant();
  return (
    <header className="topbar">
      <div className="topbar__crumb">
        {current.name} <Icon name="chevron-right" size={11} style={{ verticalAlign: -1, opacity: 0.5, margin: '0 4px' }} />
        <span className="topbar__crumb-current">{routeLabel}</span>
      </div>

      <div className="topbar__search">
        <Icon name="search" />
        <input placeholder="Search customers, units, invoices, leads…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar__right">
        <TenantSwitcher />
        <button className="btn btn--ghost btn--icon" title="Notifications" style={{ position: 'relative' }}>
          <Icon name="bell" size={15} />
        </button>
        <button className="btn btn--ghost" style={{ gap: 7 }}>
          <Icon name="sparkles" size={14} style={{ color: 'var(--ai-600)' }} />
          Ask AI
        </button>
      </div>
    </header>
  );
}

export function FlexistoreLogo({
  color = '#2A2A2A', markColor, height = 28, markOnly = false,
}: {
  color?: string;
  markColor?: string;
  height?: number;
  markOnly?: boolean;
}) {
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
