import { create } from 'zustand';

export interface EcosystemState {
  installedModuleIds: string[];
  markInstalled: (moduleId: string) => void;
  markUninstalled: (moduleId: string) => void;
  isInstalled: (moduleId: string) => boolean;
}

export const useEcosystemStore = create<EcosystemState>()((set, get) => ({
  // Bookkeeper is installed by default as it is the real working server
  installedModuleIds: ['bookkeeper'],

  markInstalled: (moduleId) => {
    set((s) => {
      if (s.installedModuleIds.includes(moduleId)) return s;
      return { installedModuleIds: [...s.installedModuleIds, moduleId] };
    });
  },

  markUninstalled: (moduleId) => {
    set((s) => ({
      installedModuleIds: s.installedModuleIds.filter((id) => id !== moduleId),
    }));
  },

  isInstalled: (moduleId) => {
    return get().installedModuleIds.includes(moduleId);
  },
}));
