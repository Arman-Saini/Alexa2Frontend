import { useState, useEffect } from 'react';
import { appStoreApi, type AppStoreModule } from '../../api/appStoreApi';
import { useEcosystemStore } from '../../store/ecosystemStore';
import { MEMORY_MODULES, AGENTIC_MODULES, getAppModules, type AppStoreItem } from './moduleGroups';
import { SplitCard } from './SplitCard';

interface AppStoreSectionProps {
  onClose?: () => void;
}

export function AppStoreSection({ onClose }: AppStoreSectionProps) {
  const [activeTab, setActiveTab] = useState<'memory' | 'app' | 'agentic'>('app');
  const [realModules, setRealModules] = useState<AppStoreModule[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const installedModuleIds = useEcosystemStore((s) => s.installedModuleIds);
  const markInstalled = useEcosystemStore((s) => s.markInstalled);

  useEffect(() => {
    let cancelled = false;
    appStoreApi.getModules()
      .then((res) => {
        if (!cancelled) setRealModules(res.modules);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const appModules = getAppModules(realModules);

  const getFilteredItems = (): AppStoreItem[] => {
    if (activeTab === 'memory') return MEMORY_MODULES;
    if (activeTab === 'agentic') return AGENTIC_MODULES;
    return appModules;
  };

  const handleInstall = async (module: AppStoreItem) => {
    setInstallingId(module.id);
    try {
      if (module.status === 'live' && module.id !== 'bookkeeper') {
        await appStoreApi.installModule(module.id);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      markInstalled(module.id);
    } catch (err) {
      console.error('Failed to install:', err);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 5vw, 36px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Hearth Module Store
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 'var(--space-1) 0 0 0',
            }}
          >
            Expand your smart home twin's memory, integration apps, and cloud reasoning agents.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '13px',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }}
          >
            Back to Twin
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        {(['app', 'memory', 'agentic'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'app' ? 'Applications & Devices' : tab === 'memory' ? 'Memory & Cache' : 'Agentic Orchestration';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: isActive ? 'var(--copper-500)' : 'transparent',
                color: isActive ? 'var(--void-950)' : 'var(--text-secondary)',
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '13px',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {getFilteredItems().map((item) => (
          <SplitCard
            key={item.id}
            item={item}
            installed={installedModuleIds.includes(item.id)}
            isInstalling={installingId === item.id}
            onInstall={() => handleInstall(item)}
          />
        ))}
      </div>
    </div>
  );
}
export default AppStoreSection;
