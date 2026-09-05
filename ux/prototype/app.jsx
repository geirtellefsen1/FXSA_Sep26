/* ============================================================
   Flexistore CRM — root app
   ============================================================ */

// The prototype's mock data is generated per "day scenario" (quiet / busy / crisis). Phase 1 drops the
// operator-facing toggle; the API drives real state. The scenario stays fixed here only to keep the mock
// data generators working until the screens are wired to fetch().
const DATA_SCENARIO = 'busy';

function App() {
  const t = { mode: DATA_SCENARIO };
  useTenant();   // re-render the whole tree when the tenant scope changes (currency, locale, labels)
  const [route, setRoute] = React.useState(() => location.hash.replace('#/', '') || 'cockpit');

  React.useEffect(() => {
    const fn = () => setRoute(location.hash.replace('#/', '') || 'cockpit');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  const nav = (id) => { location.hash = `#/${id}`; setRoute(id); };

  const screens = {
    cockpit:    () => <CockpitScreen mode={t.mode} onNav={nav} />,
    inbox:      () => <InboxScreen mode={t.mode} onNav={nav} />,
    customers:  () => <CustomersScreen mode={t.mode} onNav={nav} />,
    corporate:  () => <CorporateScreen mode={t.mode} onNav={nav} />,
    leads:      () => <LeadsScreen mode={t.mode} onNav={nav} />,
    ai:         () => <AiScreen mode={t.mode} onNav={nav} />,
    devices:    () => <DevicesScreen mode={t.mode} onNav={nav} />,
    facilities: () => <FacilitiesScreen mode={t.mode} onNav={nav} />,
    billing:    () => <BillingScreen mode={t.mode} onNav={nav} />,
    arrears:    () => <ArrearsScreen mode={t.mode} onNav={nav} />,
    reports:    () => <ReportsScreen mode={t.mode} onNav={nav} />,
    migration:  () => <MigrationScreen onNav={nav} />,
  };
  const Screen = screens[route] || screens.cockpit;

  return (
    <div className="app">
      <Sidebar route={route} onNav={nav} mode={t.mode} />
      <div className="main">
        <Topbar route={route} />
        <div className="content"><Screen /></div>
      </div>
    </div>
  );
}

function Placeholder({ name }) {
  return (
    <div data-screen-label={name}>
      <div className="page-hd">
        <div>
          <h1 className="page-hd__title">{name}</h1>
          <div className="page-hd__sub">Designed in the next iteration. Use the sidebar to explore what's done.</div>
        </div>
      </div>
      <Card>
        <Empty icon="sparkles" title="Coming up" sub="Building this screen next — refresh once it's ready." />
      </Card>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
