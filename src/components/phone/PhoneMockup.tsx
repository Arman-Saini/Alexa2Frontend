import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../shared/GlassCard';
import { useMic } from '../../hooks/useMic';
import { useActStore } from '../../store/actStore';
import { useAppStore } from '../../store/store';
import { useEcosystemStore } from '../../store/ecosystemStore';
import { simulateApi } from '../../api/simulateApi';
import { appStoreApi, type AppStoreModule } from '../../api/appStoreApi';
import { getAppModules, type AppStoreItem } from '../appstore/moduleGroups';

function extractDeviceId(res: any): string | null {
  if (!res) return null;
  if (res.result?.device_id) return res.result.device_id;
  if (res.result?.action_taken?.device_id) return res.result.action_taken.device_id;
  if (res.result?.tool_calls && Array.isArray(res.result.tool_calls)) {
    for (const call of res.result.tool_calls) {
      if (call.tool_input?.device_id) {
        return call.tool_input.device_id;
      }
    }
  }
  return null;
}

export function PhoneMockup() {
  const [activeTab, setActiveTab] = useState<'control' | 'store'>('control');
  const [textInput, setTextInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done'>('idle');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [realModules, setRealModules] = useState<AppStoreModule[]>([]);

  const placedObjects = useAppStore((s) => s.placedObjects);
  const rooms = useAppStore((s) => s.rooms);
  const triggerXray = useActStore((s) => s.triggerXray);

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

  const handleCommandSubmit = async (utterance: string) => {
    if (!utterance.trim()) return;
    setStatus('processing');
    setLastCommand(utterance);

    try {
      const response = await simulateApi.voiceCommand(utterance);
      const data = response.data;

      // Wait 300ms for WS state to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      const deviceId = extractDeviceId(data);
      let targetId = 'house';
      if (deviceId) {
        const deviceExists = placedObjects.some((o) => o.id === deviceId);
        if (deviceExists) {
          targetId = deviceId;
        } else {
          const roomExists = rooms.some((r) => r.id === deviceId);
          if (roomExists) {
            targetId = deviceId;
          }
        }
      }

      // Format trace and explanation
      const phoneTrace = data.trace || {
        tier_label: data.tier || 'T1 Local NLU',
        latency_ms: data.latency ? parseFloat(data.latency) : 45,
        cost_usd: data.cost ? parseFloat(data.cost.replace(/[^0-9.]/g, '')) : 0,
        path: data.trace?.path || ['device', 't0', 't1'],
      };

      const phoneExplanation =
        data.result?.explanation ||
        data.result?.reasoning ||
        data.message ||
        'Action executed successfully.';

      // Set trigger context in actStore
      useActStore.setState({
        triggerContext: {
          deviceId: deviceId || undefined,
          scenarioText: utterance,
          phoneTrace,
          phoneExplanation,
        },
      });

      // Trigger the Matrix wireframe sweep
      triggerXray(targetId, 'phone');
      setStatus('done');
    } catch (error) {
      console.error('Failed to submit voice command:', error);
      setStatus('idle');
    }
  };

  const handleInstallModule = async (module: AppStoreItem) => {
    setInstallingId(module.id);
    try {
      // If it is a real app module (not a concept one), trigger backend install
      if (module.status === 'live' && module.id !== 'bookkeeper') {
        await appStoreApi.installModule(module.id);
      } else {
        // Simulate a 500ms delay for concept apps
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      markInstalled(module.id);
    } catch (error) {
      console.error('Failed to install module:', error);
    } finally {
      setInstallingId(null);
    }
  };

  const { listening, liveText, toggle } = useMic((finalText) => {
    setTextInput(finalText);
    void handleCommandSubmit(finalText);
  });

  useEffect(() => {
    if (listening) {
      setStatus('listening');
    } else if (status === 'listening') {
      setStatus('idle');
    }
  }, [listening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'processing') return;
    void handleCommandSubmit(textInput);
    setTextInput('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        width: '320px',
        zIndex: 40,
        pointerEvents: 'auto',
      }}
    >
      <GlassCard padding="md" glow="none">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(217, 154, 68, 0.15)',
              paddingBottom: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: status === 'listening' ? 'var(--ember-500)' : 'var(--copper-500)',
                  boxShadow: status === 'listening' ? '0 0 8px var(--ember-500)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                Hearth Companion
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {status === 'listening'
                ? 'listening'
                : status === 'processing'
                ? 'processing'
                : 'online'}
            </span>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              padding: '2px',
              borderRadius: 'var(--r-md)',
              border: '1px solid rgba(255, 255, 255, 0.03)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('control')}
              style={{
                flex: 1,
                backgroundColor: activeTab === 'control' ? 'var(--glass-bg)' : 'transparent',
                border: 'none',
                color: activeTab === 'control' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '11px',
                padding: '6px',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Control
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              style={{
                flex: 1,
                backgroundColor: activeTab === 'store' ? 'var(--glass-bg)' : 'transparent',
                border: 'none',
                color: activeTab === 'store' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '11px',
                padding: '6px',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              App Store
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'control' ? (
            <>
              {/* Screen area / feedback */}
              <div
                style={{
                  minHeight: '80px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--r-md)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                }}
              >
                {status === 'listening' ? (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--ember-400)',
                      margin: 0,
                      fontStyle: 'italic',
                    }}
                  >
                    {liveText || 'Listening for command...'}
                  </p>
                ) : status === 'processing' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--copper-500)',
                      }}
                    >
                      SENDING TO HEARTH CORE
                    </span>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}
                    >
                      "{lastCommand}"
                    </p>
                  </div>
                ) : lastCommand ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      LAST COMMAND
                    </span>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        margin: 0,
                      }}
                    >
                      "{lastCommand}"
                    </p>
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--text-tertiary)',
                      textAlign: 'center',
                      margin: 0,
                    }}
                  >
                    Ask Hearth to control devices or run routines.
                  </p>
                )}
              </div>

              {/* Form Controls */}
              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={status === 'processing' || status === 'listening'}
                  placeholder="Ask Hearth..."
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--r-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(217, 154, 68, 0.4)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--glass-border)';
                  }}
                />

                {/* Mic button */}
                <button
                  type="button"
                  onClick={toggle}
                  disabled={status === 'processing'}
                  style={{
                    backgroundColor: status === 'listening' ? 'var(--ember-500)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--r-md)',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: status === 'listening' ? 'var(--void-950)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            /* App Store tab contents */
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px',
              }}
            >
              <Link
                to="/ecosystem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(217, 154, 68, 0.1)',
                  border: '1px dashed var(--copper-500)',
                  color: 'var(--copper-500)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '11px',
                  textDecoration: 'none',
                  padding: '8px',
                  borderRadius: 'var(--r-md)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(217, 154, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(217, 154, 68, 0.1)';
                }}
              >
                Open Full App Store ↗
              </Link>
              {appModules.map((module) => {
                const installed = installedModuleIds.includes(module.id);
                const installing = installingId === module.id;
                return (
                  <div
                    key={module.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      padding: '8px',
                      borderRadius: 'var(--r-md)',
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {module.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '10px',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {module.status === 'live' ? 'Live Integration' : 'Concept App'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={installed || installing}
                      onClick={() => void handleInstallModule(module)}
                      style={{
                        backgroundColor: installed ? 'rgba(255, 255, 255, 0.05)' : 'var(--copper-500)',
                        border: installed ? '1px solid var(--glass-border)' : 'none',
                        color: installed ? 'var(--text-tertiary)' : 'var(--void-950)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: '10px',
                        padding: '6px 12px',
                        borderRadius: 'var(--r-sm)',
                        cursor: installed ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {installing ? 'Installing...' : installed ? 'Installed' : 'Install'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
