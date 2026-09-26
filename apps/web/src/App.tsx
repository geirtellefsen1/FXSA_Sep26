import { useEffect, useState, type ReactNode } from 'react';
import { Card, Empty } from './components.js';
import { Sidebar, Topbar, NAV } from './shell.js';
import { CockpitScreen } from './screens/cockpit.js';
import { CustomersScreen } from './screens/customers.js';

function parseHash(): { top: string; rest: string[] } {
  const raw = location.hash.replace(/^#\//, '');
  const [top, ...rest] = raw.split('/').filter(Boolean);
  return { top: top || 'cockpit', rest };
}

function Placeholder({ name }: { name: string }) {
  return (
    <div data-screen-label={name}>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{name}</h1>
          <div className="page-hd__sub">Coming in a later sprint — see docs/07-SPRINTS.md.</div>
        </div>
      </div>
      <Card>
        <Empty icon="sparkles" title="Not built yet" sub="This screen ships in a later Phase 1 day. Use the sidebar to explore what's live." />
      </Card>
    </div>
  );
}

export function App() {
  const [{ top, rest }, setRoute] = useState(parseHash);

  useEffect(() => {
    const fn = () => setRoute(parseHash());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  const nav = (id: string) => {
    location.hash = `#/${id}`;
  };

  let content: ReactNode;
  if (top === 'cockpit') {
    content = <CockpitScreen />;
  } else if (top === 'customers') {
    content = (
      <CustomersScreen
        customerId={rest[0] ?? null}
        onSelect={(id) => { location.hash = `#/customers/${id}`; }}
        onBack={() => { location.hash = '#/customers'; }}
      />
    );
  } else {
    content = <Placeholder name={NAV.find((n) => n.id === top)?.label ?? top} />;
  }

  return (
    <div className="app">
      <Sidebar route={top} onNav={nav} />
      <div className="main">
        <Topbar route={top} />
        <div className="content">{content}</div>
      </div>
    </div>
  );
}
