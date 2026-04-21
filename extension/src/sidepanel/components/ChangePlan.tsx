import React, { useState } from 'react';
import type { ChangePlan as ChangePlanType } from '../../shared/types';
import { useChatStore } from '../stores/chatStore';
import {
  FileCode,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Play,
  GitCommit,
} from 'lucide-react';

interface Props {
  plan: ChangePlanType;
  jobId: string;
}

const riskConfig = {
  low: { icon: Shield, label: 'Baixo risco', color: 'text-success', bg: 'bg-success/10' },
  medium: { icon: ShieldAlert, label: 'Risco médio', color: 'text-warning', bg: 'bg-warning/10' },
  high: { icon: AlertTriangle, label: 'Alto risco', color: 'text-danger', bg: 'bg-danger/10' },
};

const actionIcons = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

export const ChangePlan: React.FC<Props> = ({ plan, jobId }) => {
  const [expanded, setExpanded] = useState(false);
  const { applyChanges, commitChanges, isLoading } = useChatStore();
  const risk = riskConfig[plan.riskLevel];
  const RiskIcon = risk.icon;

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-surface-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-text-primary">📋 Plano de Mudanças</span>
          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${risk.bg} ${risk.color}`}>
            <RiskIcon className="w-3 h-3" />
            {risk.label}
          </span>
        </div>
        <p className="text-xs text-text-secondary">{plan.summary}</p>
      </div>

      {/* Files Affected */}
      <div className="px-3.5 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors w-full"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {plan.filesAffected.length} arquivo(s) afetado(s)
        </button>

        {expanded && (
          <div className="mt-2 space-y-1">
            {plan.filesAffected.map((file) => {
              const ActionIcon = actionIcons[file.action];
              return (
                <div
                  key={file.path}
                  className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md bg-surface/50"
                >
                  <FileCode className="w-3 h-3 text-text-muted flex-shrink-0" />
                  <span className="font-mono text-text-secondary truncate flex-1">
                    {file.path}
                  </span>
                  <ActionIcon className="w-3 h-3 text-text-muted flex-shrink-0" />
                  <span className="text-success text-[10px]">+{file.additions}</span>
                  <span className="text-danger text-[10px]">-{file.deletions}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-surface-border bg-surface/30">
        <button
          onClick={() => applyChanges(jobId)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3 h-3" />
          Aplicar
        </button>
        <button
          onClick={() => commitChanges(jobId)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-overlay text-text-primary border border-surface-border hover:bg-surface-border/50 disabled:opacity-50 transition-colors"
        >
          <GitCommit className="w-3 h-3" />
          Commitar
        </button>
      </div>
    </div>
  );
};
