import React, { useEffect, useState } from 'react';
import { ProjectHeader } from './components/ProjectHeader';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ChatPanel } from './components/ChatPanel';
import { HistoryList } from './components/HistoryList';
import { ActionButtons } from './components/ActionButtons';
import { useProjectStore } from './stores/projectStore';
import { apiClient } from '../shared/api-client';
import type { AppView } from '../shared/types';
import { Github, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const { isAuthenticated, init, connectionStatus } = useProjectStore();
  const [view, setView] = useState<AppView>('chat');
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    init().finally(() => setIsInitializing(false));
  }, []);

  // Listen for messages from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'LOVABLE_PROJECT_DETECTED') {
        useProjectStore.getState().setLovableInfo(message.data);
      }
      if (message.type === 'AUTH_SUCCESS') {
        console.log('[LovableAuto] Auth success received!', message.user);
        apiClient.loadToken().then(() => {
          useProjectStore.getState().setAuthenticated(message.user);
          useProjectStore.getState().loadProjects();
        });
      }
    };

    chrome.runtime?.onMessage?.addListener(handleMessage);
    return () => chrome.runtime?.onMessage?.removeListener(handleMessage);
  }, []);

  const handleShowHistory = async () => {
    const project = useProjectStore.getState().currentProject;
    if (!project) return;

    try {
      const { entries } = await apiClient.getHistory(project.id);
      setHistoryEntries(entries);
      setView('history');
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleRollback = async (changesetId: string) => {
    try {
      await apiClient.rollback(changesetId);
      // Refresh history
      handleShowHistory();
    } catch (err) {
      console.error('Rollback failed:', err);
    }
  };

  const handleLogin = async () => {
    console.log('[LovableAuto] Requesting auth URL...');
    try {
      const { authUrl } = await apiClient.getAuthUrl();
      console.log('[LovableAuto] Opening auth URL:', authUrl);
      // Open GitHub OAuth in new tab
      chrome.tabs?.create({ url: authUrl });
    } catch (err) {
      console.error('[LovableAuto] Auth request failed:', err);
      alert('Erro ao conectar com o backend. Verifique se ele está rodando na porta 3001.');
    }
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4 glow animate-pulse-soft">
          <span className="text-xl">⚡</span>
        </div>
        <p className="text-xs text-text-muted">Carregando...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-6 glow">
          <span className="text-2xl">⚡</span>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">LovableAuto</h2>
        <p className="text-xs text-text-muted text-center mb-8 leading-relaxed">
          Edite seu projeto Lovable com IA.
          <br />
          Conecte sua conta GitHub para começar.
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors shadow-lg"
        >
          <Github className="w-5 h-5" />
          Conectar com GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <ProjectHeader />
      <ConnectionStatus />

      {view === 'history' ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
            <button
              onClick={() => setView('chat')}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <HistoryList entries={historyEntries} onRollback={handleRollback} />
          </div>
        </>
      ) : (
        <>
          <ChatPanel />
          <ActionButtons onShowHistory={handleShowHistory} />
        </>
      )}
    </div>
  );
};

export default App;
