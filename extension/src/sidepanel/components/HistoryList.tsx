import React from 'react';
import { Clock, FileCode, ArrowUpRight, RotateCcw } from 'lucide-react';

interface HistoryEntry {
  session: {
    id: string;
    userPrompt: string;
    status: string;
    createdAt: string;
  };
  changeset?: {
    id: string;
    summary: string;
    commitSha?: string;
    status: string;
    filesAffected: Array<{ path: string; action: string }>;
  };
}

interface Props {
  entries: HistoryEntry[];
  onRollback?: (changesetId: string) => void;
}

const statusBadge: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-text-muted' },
  analyzing: { label: 'Analisando', color: 'text-warning' },
  plan_ready: { label: 'Plano pronto', color: 'text-brand-400' },
  applied: { label: 'Aplicado', color: 'text-success' },
  committed: { label: 'Commitado', color: 'text-success' },
  failed: { label: 'Falhou', color: 'text-danger' },
};

export const HistoryList: React.FC<Props> = ({ entries, onRollback }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <Clock className="w-10 h-10 text-text-muted mb-3 opacity-40" />
        <p className="text-xs text-text-muted">Nenhum histórico ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 py-3">
      {entries.map((entry) => {
        const badge = statusBadge[entry.session.status] ?? statusBadge.pending;
        const date = new Date(entry.session.createdAt);

        return (
          <div
            key={entry.session.id}
            className="glass-card px-3.5 py-3 space-y-2 animate-fade-in"
          >
            {/* Prompt */}
            <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">
              {entry.session.userPrompt}
            </p>

            {/* Meta */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] text-text-muted">
                  {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {entry.changeset?.commitSha && (
                <div className="flex items-center gap-1">
                  <code className="text-[10px] text-text-muted font-mono">
                    {entry.changeset.commitSha.slice(0, 7)}
                  </code>
                  {onRollback && entry.changeset.status === 'committed' && (
                    <button
                      onClick={() => onRollback(entry.changeset!.id)}
                      className="p-1 rounded text-text-muted hover:text-danger transition-colors"
                      title="Rollback"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Files */}
            {entry.changeset && (
              <div className="flex flex-wrap gap-1">
                {(entry.changeset.filesAffected as Array<{ path: string }>).slice(0, 3).map((f) => (
                  <span
                    key={f.path}
                    className="flex items-center gap-0.5 text-[10px] text-text-muted bg-surface/50 px-1.5 py-0.5 rounded"
                  >
                    <FileCode className="w-2.5 h-2.5" />
                    {f.path.split('/').pop()}
                  </span>
                ))}
                {(entry.changeset.filesAffected as Array<{ path: string }>).length > 3 && (
                  <span className="text-[10px] text-text-muted px-1.5 py-0.5">
                    +{(entry.changeset.filesAffected as Array<{ path: string }>).length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
