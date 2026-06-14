import { useAppStore } from '../../store/store';

export function Header() {
  const { ui, setActiveRoom, exportState } = useAppStore();
  const { activeRoomId, isPlacementMode } = ui;
  const rooms = useAppStore((s) => s.rooms);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const handleExport = () => {
    const json = exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digital-twin-state.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-alexa-dark border-b border-alexa-card shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Alexa Digital Twin</h1>
            <p className="text-xs text-alexa-blue leading-none mt-0.5">Smart Home Simulator</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm ml-4">
          <button
            onClick={() => setActiveRoom(null)}
            className={`px-2 py-1 rounded transition-colors ${
              !activeRoomId
                ? 'bg-alexa-blue text-alexa-dark font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            House View
          </button>
          {activeRoom && (
            <>
              <span className="text-gray-600">/</span>
              <span className="px-2 py-1 rounded bg-alexa-card text-alexa-blue font-semibold">
                {activeRoom.name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPlacementMode && (
          <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-bold animate-pulse">
            PLACEMENT MODE — Click floor to place
          </span>
        )}
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1.5 rounded bg-alexa-card hover:bg-alexa-accent text-gray-300 hover:text-white transition-colors"
        >
          Export JSON
        </button>
      </div>
    </header>
  );
}
