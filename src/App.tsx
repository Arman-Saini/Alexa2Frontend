import { useState, useEffect } from 'react';
import { DemoDashboard } from './components/demo/DemoDashboard';
import { ConstructionMode } from './components/demo/ConstructionMode';

export default function App() {
  const [page, setPage] = useState(
    window.location.hash === '#/construct' ? 'construct' : 'dashboard'
  );

  useEffect(() => {
    const handler = () => setPage(window.location.hash === '#/construct' ? 'construct' : 'dashboard');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (page === 'construct') {
    return <ConstructionMode onBack={() => { window.location.hash = ''; }} />;
  }
  return <DemoDashboard onOpenConstruct={() => { window.location.hash = '#/construct'; }} />;
}
