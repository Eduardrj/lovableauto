import React from 'react';
import { RefreshCw, FolderSync, History, Settings } from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';

interface Props {
  onSync?: () => void;
  onShowHistory?: () => void;
  isSyncing?: boolean;
}

export const ActionButtons: React.FC<Props> = ({ onSync, onShowHistory, isSyncing }) => {
  const { currentProject, connectionStatus } = useProjectStore();
  const disabled = !currentProject || connectionStatus !== 'connected';

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-border">
      <button
        onClick={onSync}
        disabled={disabled || isSyncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-overlay text-text-secondary border border-surface-border hover:bg-surface-border/50 disabled:opacity-40 transition-all"
        title="Sincronizar arquivos"
      >
        <FolderSync className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        Sync
      </button>
      <button
        onClick={onShowHistory}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-overlay text-text-secondary border border-surface-border hover:bg-surface-border/50 disabled:opacity-40 transition-all"
        title="Histórico"
      >
        <History className="w-3 h-3" />
        Histórico
      </button>
      <button
        onClick={() => useProjectStore.getState().clearProject()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-overlay text-text-secondary border border-surface-border hover:bg-surface-border/50 transition-all"
        title="Trocar Projeto"
      >
        <Settings className="w-3 h-3" />
        Trocar
      </button>
    </div>
  );
};
