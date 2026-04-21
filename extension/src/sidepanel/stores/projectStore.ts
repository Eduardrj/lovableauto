import { create } from 'zustand';
import type { LovableProjectInfo, ConnectionStatus } from '../../shared/types';
import { apiClient } from '../../shared/api-client';

interface ProjectState {
  currentProject: any | null;
  lovableInfo: LovableProjectInfo | null;
  connectionStatus: ConnectionStatus;
  isAuthenticated: boolean;
  user: any | null;
  errorMessage: string | null;

  // Actions
  init: () => Promise<void>;
  setLovableInfo: (info: LovableProjectInfo) => void;
  connectProject: (info: LovableProjectInfo) => Promise<void>;
  connectManual: (projectId: string, projectUrl: string, owner: string, repo: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  setAuthenticated: (user: any) => void;
  logout: () => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  lovableInfo: null,
  connectionStatus: 'disconnected',
  isAuthenticated: false,
  user: null,
  errorMessage: null,

  init: async () => {
    await apiClient.loadToken();
    if (apiClient.isAuthenticated) {
      try {
        const { user } = await apiClient.getMe();
        set({ isAuthenticated: true, user, errorMessage: null });
        await get().loadProjects();
      } catch (err: any) {
        set({ isAuthenticated: false, errorMessage: err.message });
      }
    }
  },

  setLovableInfo: (info) => {
    set({ lovableInfo: info, errorMessage: null });
    // If we have projects, try to find a match
    const projects = (get() as any).allProjects || [];
    const match = projects.find((p: any) => p.lovableProjectUrl.includes(info.projectId));
    if (match) {
      set({ currentProject: match, connectionStatus: 'connected' });
    }
  },

  connectProject: async (info) => {
    if (!info.githubOwner || !info.githubRepo) {
      set({ 
        connectionStatus: 'error', 
        errorMessage: 'Não foi possível detectar o repositório GitHub. Tente abrir o menu do GitHub no Lovable primeiro.' 
      });
      return;
    }

    set({ connectionStatus: 'connecting', errorMessage: null });
    try {
      const { project } = await apiClient.connectProject({
        lovableProjectUrl: info.projectUrl,
        githubOwner: info.githubOwner,
        githubRepo: info.githubRepo,
        defaultBranch: info.branch,
      });
      set({ currentProject: project, connectionStatus: 'connected', errorMessage: null });
    } catch (err: any) {
      console.error('[LovableAuto] Connection failed:', err);
      set({ connectionStatus: 'error', errorMessage: err.message });
    }
  },

  connectManual: async (projectId, projectUrl, owner, repo) => {
    set({ connectionStatus: 'connecting', errorMessage: null });
    try {
      const { project } = await apiClient.connectProject({
        lovableProjectUrl: projectUrl,
        githubOwner: owner,
        githubRepo: repo,
        defaultBranch: 'main',
      });
      set({ currentProject: project, connectionStatus: 'connected', errorMessage: null });
    } catch (err: any) {
      set({ connectionStatus: 'error', errorMessage: err.message });
    }
  },

  loadProjects: async () => {
    try {
      const { projects } = await apiClient.listProjects();
      const info = get().lovableInfo;
      const match = info 
        ? projects.find((p: any) => p.lovableProjectUrl.includes(info.projectId))
        : null;

      if (match) {
        set({ currentProject: match, connectionStatus: 'connected' });
      } else if (projects.length > 0) {
        set({ currentProject: projects[0], connectionStatus: 'connected' });
      }
    } catch {
      // silent fail
    }
  },

  setAuthenticated: (user) => set({ isAuthenticated: true, user }),

  logout: () => {
    apiClient.clearToken();
    set({
      isAuthenticated: false,
      user: null,
      currentProject: null,
      connectionStatus: 'disconnected',
    });
  },
}));
