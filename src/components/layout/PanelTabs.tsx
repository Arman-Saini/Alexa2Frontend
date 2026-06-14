import { useAppStore } from '../../store/store';
import type { ActivePanel } from '../../types';

const TABS: { id: ActivePanel; label: string; emoji: string }[] = [
  { id: 'alexa', label: 'Alexa', emoji: '🔵' },
  { id: 'library', label: 'Library', emoji: '📦' },
  { id: 'inspector', label: 'Inspector', emoji: '🔍' },
];

export function PanelTabs() {
  const { ui, setActivePanel } = useAppStore();

  return (
    <div className="flex border-b border-alexa-card shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActivePanel(tab.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            ui.activePanel === tab.id
              ? 'bg-alexa-dark text-alexa-blue border-b-2 border-alexa-blue'
              : 'bg-alexa-panel text-gray-400 hover:text-white'
          }`}
        >
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
