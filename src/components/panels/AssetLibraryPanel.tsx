import { useState } from 'react';
import { useAppStore } from '../../store/store';
import { ASSET_DEFINITIONS } from '../../constants/assets';
import type { AssetDefinition } from '../../constants/assets';
import type { AssetType } from '../../types';

type Category = 'all' | 'alexa' | 'furniture';

const CATEGORY_ICONS: Record<Category, string> = {
  all: '⊞',
  alexa: '🔵',
  furniture: '🪑',
};

export function AssetLibraryPanel() {
  const { enterPlacementMode, setDraggedAsset, ui } = useAppStore();
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

  const alexaCount = ASSET_DEFINITIONS.filter((a) => a.isAlexaDevice).length;
  const furnitureCount = ASSET_DEFINITIONS.filter((a) => !a.isAlexaDevice).length;

  return (
    <div className="flex flex-col h-full bg-[#111111] p-3 gap-3">
      {/* Header */}
      <div className="shrink-0">
        <p className="text-xs font-bold text-white mb-0.5">Asset Library</p>
        <p className="text-[10px] text-[#888888] leading-snug">
          Select a device, then click on the 3D floor to place it.
        </p>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#888888]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#242424] border border-[#404040] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#888888] focus:outline-none focus:border-[#E8E8E6] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 shrink-0">
        {(['all', 'alexa', 'furniture'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
              category === cat
                ? 'bg-[#E8E8E6] text-[#111111]'
                : 'bg-[#242424] text-[#888888] border border-[#404040] hover:border-[#E8E8E6] hover:text-white'
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>
              {cat === 'alexa' ? `Alexa (${alexaCount})` : cat === 'furniture' ? `Furniture (${furnitureCount})` : 'All'}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      {search && (
        <p className="text-[10px] text-[#888888] shrink-0 -mt-1">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
        </p>
      )}

      {/* Asset grid */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-xs text-[#888888]">No assets match "{search}"</p>
          </div>
        ) : (
          filtered.map((def) => (
            <AssetCard
              key={def.type}
              def={def}
              isSelected={ui.placementAssetType === def.type && ui.isPlacementMode}
              onSelect={() => enterPlacementMode(def.type)}
              onDragStart={(type) => {
                setDraggedAsset(type);
                enterPlacementMode(type);
              }}
              onDragEnd={() => setDraggedAsset(null)}
            />
          ))
        )}
      </div>

      {/* Active placement hint */}
      {ui.isPlacementMode && (
        <div className="shrink-0 flex flex-col gap-1 px-3 py-2 bg-[#1A3A4A] border border-[#E8E8E6] rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8E8E6] animate-pulse" />
            <p className="text-xs text-[#E8E8E6] font-semibold">Placement mode active</p>
          </div>
          <p className="text-[10px] text-[#6ABEDC] pl-4">
            Click the 3D floor to place · or drag an asset card directly onto the canvas
          </p>
        </div>
      )}
    </div>
  );
}

function AssetCard({
  def,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  def: AssetDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (type: AssetType) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('assetType', def.type);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(def.type);
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      title="Click to enter placement mode · Drag onto the 3D canvas to place directly"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all card-hover cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'bg-[#1A3A4A] border border-[#E8E8E6]'
          : 'bg-[#242424] border border-[#404040] hover:border-[#505050]'
      }`}
    >
      {/* Color swatch + emoji */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: def.color + '33', border: `1px solid ${def.color}44` }}
      >
        {def.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{def.label}</p>
        <p className="text-[10px] text-[#888888] truncate leading-tight mt-0.5">
          {def.defaultDescription.slice(0, 48)}…
        </p>
        {def.isAlexaDevice && def.defaultState.powerConsumption !== undefined && (
          <p className="text-[9px] text-[#E8E8E6] mt-0.5">⚡ {def.defaultState.powerConsumption}W</p>
        )}
      </div>

      {/* Alexa / Furniture badge */}
      {def.isAlexaDevice ? (
        <span className="shrink-0 text-[9px] bg-[#1A3A4A] text-[#E8E8E6] px-1.5 py-0.5 rounded-md font-semibold border border-[#E8E8E633]">
          Alexa
        </span>
      ) : (
        <span className="shrink-0 text-[9px] bg-[#242424] text-[#888888] px-1.5 py-0.5 rounded-md border border-[#404040]">
          Furniture
        </span>
      )}
    </button>
  );
}
