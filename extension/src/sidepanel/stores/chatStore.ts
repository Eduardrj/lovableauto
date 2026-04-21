import { create } from 'zustand';
import type { ChatMessage, ChangePlan } from '../../shared/types';
import { apiClient } from '../../shared/api-client';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentJobId: string | null;
  currentPlan: ChangePlan | null;

  // Actions
  sendMessage: (projectId: string, prompt: string) => Promise<void>;
  fetchPlan: (jobId: string) => Promise<void>;
  applyChanges: (jobId: string) => Promise<void>;
  commitChanges: (jobId: string, message?: string) => Promise<void>;
  clearMessages: () => void;
  addSystemMessage: (content: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  currentJobId: null,
  currentPlan: null,

  sendMessage: async (projectId, prompt) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
    }));

    try {
      const { jobId } = await apiClient.sendMessage(projectId, prompt);
      set({ currentJobId: jobId });

      // Add "thinking" message
      const thinkingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '🔍 Analisando seu projeto e gerando plano...',
        timestamp: new Date().toISOString(),
        jobId,
        status: 'analyzing',
      };
      set((state) => ({ messages: [...state.messages, thinkingMsg] }));

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const { job } = await apiClient.getJobStatus(jobId);

          if (job.status === 'completed') {
            clearInterval(pollInterval);
            await get().fetchPlan(jobId);
            set({ isLoading: false });
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            const errorMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `❌ Erro: ${job.errorMessage || 'Falha na análise'}`,
              timestamp: new Date().toISOString(),
              status: 'failed',
            };
            set((state) => ({
              messages: [...state.messages.filter((m) => m.jobId !== jobId), errorMsg],
              isLoading: false,
            }));
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
        status: 'failed',
      };
      set((state) => ({
        messages: [...state.messages, errorMsg],
        isLoading: false,
      }));
    }
  },

  fetchPlan: async (jobId) => {
    try {
      const { plan } = await apiClient.getPlan(jobId);
      const planMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: plan.explanation,
        timestamp: new Date().toISOString(),
        jobId,
        status: 'plan_ready',
        plan,
      };
      set((state) => ({
        messages: [...state.messages.filter((m) => m.jobId !== jobId), planMsg],
        currentPlan: plan,
      }));
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    }
  },

  applyChanges: async (jobId) => {
    set({ isLoading: true });
    try {
      const result = await apiClient.applyChanges(jobId);
      get().addSystemMessage(
        `✅ Mudanças aplicadas! ${result.filesUpdated.length} arquivo(s) atualizado(s).`,
      );
    } catch (err) {
      get().addSystemMessage(
        `❌ Erro ao aplicar: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    } finally {
      set({ isLoading: false });
    }
  },

  commitChanges: async (jobId, message) => {
    set({ isLoading: true });
    try {
      const result = await apiClient.commitChanges(jobId, message);
      get().addSystemMessage(
        `🚀 Commit feito! SHA: ${result.commitSha.slice(0, 7)}\nAguardando sync da Lovable...`,
      );
    } catch (err) {
      get().addSystemMessage(
        `❌ Erro no commit: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    } finally {
      set({ isLoading: false });
    }
  },

  clearMessages: () => set({ messages: [], currentPlan: null, currentJobId: null }),

  addSystemMessage: (content) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },
}));
