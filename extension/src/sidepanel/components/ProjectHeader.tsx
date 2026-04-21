import React from 'react';
import { useProjectStore } from '../stores/projectStore';
import { Zap, Settings, LogOut } from 'lucide-react';

export const ProjectHeader: React.FC = () => {
  const { currentProject, user, isAuthenticated, logout } = useProjectStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-raised">
      {/* Logo + Title */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center glow">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary leading-tight">LovableAuto</h1>
          {currentProject && (
            <p className="text-[11px] text-text-muted truncate max-w-[160px]">
              {currentProject.githubOwner}/{currentProject.githubRepo}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isAuthenticated && (
          <>
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="w-6 h-6 rounded-full border border-surface-border object-cover"
                style={{ width: '24px', height: '24px', minWidth: '24px' }}
              />
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
