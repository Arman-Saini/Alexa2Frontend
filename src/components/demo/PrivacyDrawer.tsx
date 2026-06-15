import { C } from './ScenarioDefs';
import type { ActiveScenario } from './ScenarioDefs';

interface Props { activeScenario: ActiveScenario | null; lastVoiceCommand?: string | null }

export function PrivacyDrawer({ activeScenario, lastVoiceCommand }: Props) {
  const isFestival = activeScenario?.id === 'pooja';
  const room = activeScenario?.roomGlow ?? null;
  const state = lastVoiceCommand
    ? lastVoiceCommand.substring(0, 48)
    : activeScenario?.roomState
      ? activeScenario.roomState.replace(/[\[\]]/g, '')
      : 'idle';

  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px', height: 52,
      background: '#050609', borderTop: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text3, flexShrink: 0 }}>
        Privacy Log
      </div>
      <div style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '10px 0', flexShrink: 0 }} />

      <div style={{ flex: 1, fontSize: 8, lineHeight: 1.55, color: C.text3 }}>
        <span style={{ color: C.green, fontWeight: 700 }}>[LOCAL DATA RESIDENCY]</span>
        {' '}Raw audio → acoustic embeddings on-device (Silero / YAMNet). Dropped from RAM immediately. No PII transmitted.
      </div>

      <div style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '10px 0', flexShrink: 0 }} />

      <div style={{ flex: 1, fontSize: 8, lineHeight: 1.55, color: C.text3 }}>
        <span style={{ color: C.amber, fontWeight: 700 }}>[CLOUD ESCALATION]</span>
        {' '}Anonymised payload to Bedrock:{' '}
        <span style={{ fontFamily: 'Courier New, monospace', color: C.violet }}>
          {`{event:"${state}"${room ? `,room:"${room}"` : ''}}`}
        </span>
      </div>

      <div style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '10px 0', flexShrink: 0 }} />

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {isFestival && (
          <div style={{
            fontSize: 7, fontWeight: 700, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
            border: `1px solid ${C.violetDim}`, background: C.violetBg, color: C.violet,
            animation: 'privFestBlink 1.6s step-end infinite',
          }}>
            [FESTIVAL MODE , LEARNING PAUSED]
          </div>
        )}
        <div style={{ fontSize: 7, color: C.text3 }}>DPDP Act · India compliant</div>
        <div style={{ fontSize: 7, color: C.text3, whiteSpace: 'nowrap' }}>
          3D assets: CMHT Oculus (CC-BY) · Quaternius, Poly Haven, Kenney (CC0)
        </div>
      </div>

      <style>{`
        @keyframes privFestBlink {
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
