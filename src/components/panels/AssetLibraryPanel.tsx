import { useState } from 'react';
import { useAppStore } from '../../store/store';
import { ASSET_DEFINITIONS } from '../../constants/assets';
import type { AssetDefinition } from '../../constants/assets';

type Category = 'all' | 'alexa' | 'furniture';

export function AssetLibraryPanel() {
  const { enterPlacementMode, ui } = useAppStore();
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');

  const filtered = ASSET_DEFINITIONS.filter((a) => {
    const matchCat =
      category === 'all' ||
      (category === 'alexa' && a.isAlexaDevice) ||
      (category === 'furniture' && !a.isAlexaDevice);
    const matchSearch = a.label.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Search assets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-alexa-dark border border-alexa-card rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-alexa-blue"
      />

      {/* Category tabs */}
      <div className="flex gap-1">
        {(['all', 'alexa', 'furniture'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-1 rounded text-xs font-medium capitalize transition-colors ${
              category === cat
                ? 'bg-alexa-blue text-alexa-dark'
                : 'bg-alexa-card text-gray-400 hover:text-white'
            }`}
          >
            {cat === 'alexa' ? '🔵 Alexa' : cat === 'furniture' ? '🪑 Furniture' : 'All'}
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-500 leading-snug">
        Select an item then click anywhere on the 3D floor to place it.
      </p>

      {/* Asset grid */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {filtered.map((def) => (
          <AssetCard
            key={def.type}
            def={def}
            isSelected={ui.placementAssetType === def.type && ui.isPlacementMode}
            onSelect={() => enterPlacementMode(def.type)}
          />
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  def,
  isSelected,
  onSelect,
}: {
  def: AssetDefinition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
        isSelected
          ? 'bg-alexa-blue bg-opacity-20 border border-alexa-blue'
          : 'bg-alexa-card hover:bg-opacity-70 border border-transparent hover:border-alexa-card'
      }`}
    >
      <span className="text-2xl shrink-0">{def.emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{def.label}</p>
        <p className="text-xs text-gray-500 truncate leading-tight">{def.defaultDescription.slice(0, 45)}…</p>
      </div>
      {def.isAlexaDevice && (
        <span className="shrink-0 text-xs bg-alexa-accent text-alexa-blue px-1.5 py-0.5 rounded ml-auto">
          Alexa
        </span>
      )}
    </button>
  );
}
