import React from 'react';
import { useProjectStore } from '../stores/projectStore';
import { GitBranch, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react';

const statusConfig = {
  connected: {
    icon: CheckCircle,
    label: 'Conectado',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  disconnected: {
    icon: XCircle,
    label: 'Desconectado',
    color: 'text-text-muted',
    bg: 'bg-surface-overlay',
    border: 'border-surface-border',
  },
  connecting: {
    icon: Loader2,
    label: 'Conectando...',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  error: {
    icon: AlertCircle,
    label: 'Erro',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
  },
};

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus, currentProject, errorMessage } = useProjectStore();
  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <div className="mx-3 mt-2 flex flex-col gap-1">
      <div className={`px-3 py-2 rounded-lg border ${config.bg} ${config.border} flex items-center gap-2`}>
        <Icon
          className={`w-3.5 h-3.5 ${config.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`}
        />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>

        {currentProject && connectionStatus === 'connected' && (
          <div className="flex items-center gap-1 ml-auto">
            <GitBranch className="w-3 h-3 text-text-muted" />
            <span className="text-[11px] text-text-secondary font-mono">
              {currentProject.defaultBranch}
            </span>
          </div>
        )}
      </div>
      
      {errorMessage && (
        <div className="px-2 py-1 text-[10px] text-danger bg-danger/5 rounded border border-danger/10 leading-tight">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
