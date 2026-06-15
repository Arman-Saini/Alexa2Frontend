import { useState, useEffect } from 'react';
import { DemoDashboard } from './components/demo/DemoDashboard';
import { ConstructionMode } from './components/demo/ConstructionMode';
import { ProjectIntro } from './components/demo/ProjectIntro';

export default function App() {
  const [page, setPage] = useState<'intro' | 'dashboard' | 'construct'>(
    window.location.hash === '#/construct' ? 'construct' : 'intro'
  );

  useEffect(() => {
    const handler = () => {
      if (window.location.hash === '#/construct') setPage('construct');
      else if (window.location.hash === '#/demo') setPage('dashboard');
      else setPage('intro');
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (page === 'construct') {
    return <ConstructionMode onBack={() => { window.location.hash = ''; }} />;
  }
  if (page === 'dashboard') {
    return <DemoDashboard onOpenConstruct={() => { window.location.hash = '#/construct'; }} />;
  }
  return <ProjectIntro onEnterDemo={() => { window.location.hash = '#/demo'; setPage('dashboard'); }} />;
}
