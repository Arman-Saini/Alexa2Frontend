import { useEffect, useState } from 'react';
import { DigitalTwinCanvas } from './components/canvas/DigitalTwinCanvas';
import { ActShell } from './components/acts/ActShell';
import { EcosystemPage } from './components/ecosystem/EcosystemPage';

type Route = 'home' | 'ecosystem';

function routeFromHash(): Route {
  return window.location.hash === '#/ecosystem' ? 'ecosystem' : 'home';
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash());

  useEffect(() => {
    const handler = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route === 'ecosystem') {
    return <EcosystemPage />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--void-950)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <DigitalTwinCanvas />
      </div>
      <ActShell />
    </div>
  );
}
