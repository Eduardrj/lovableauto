import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { apiClient } from '../../shared/api-client';
import { Github, Search, Plus, ExternalLink, Loader2, Check } from 'lucide-react';

export const ProjectSelector: React.FC = () => {
  const { lovableInfo, connectProject, connectManual, currentProject } = useProjectStore();
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualOwner, setManualOwner] = useState('');
  const [manualRepo, setManualRepo] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const { repos } = await apiClient.listRepos();
      setRepos(repos);
    } catch (err) {
      console.error('Failed to load repos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectRepo = async (repo: any) => {
    if (!lovableInfo) {
      alert('Informação do projeto Lovable não detectada. Tente abrir o Lovable.dev primeiro.');
      return;
    }

    try {
      await connectProject({
        ...lovableInfo,
        githubOwner: repo.owner,
        githubRepo: repo.name,
        branch: repo.defaultBranch
      });
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleManualConnect = async () => {
    if (!lovableInfo) return;
    await connectManual(lovableInfo.projectId, lovableInfo.projectUrl, manualOwner, manualRepo);
  };

  if (currentProject) return null;

  return (
    <div className="flex-1 flex flex-col p-4 bg-surface-raised overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Github className="w-4 h-4" />
          Conectar Projeto GitHub
        </h2>
        <button 
          onClick={() => setManualMode(!manualMode)}
          className="text-[10px] text-brand-500 hover:underline"
        >
          {manualMode ? 'Ver meus repos' : 'Entrada manual'}
        </button>
      </div>

      {manualMode ? (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">Dono do Repositório</label>
            <input 
              type="text"
              value={manualOwner}
              onChange={(e) => setManualOwner(e.target.value)}
              placeholder="ex: google"
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-surface-border focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">Nome do Repositório</label>
            <input 
              type="text"
              value={manualRepo}
              onChange={(e) => setManualRepo(e.target.value)}
              placeholder="ex: gson"
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-surface-border focus:border-brand-500 outline-none"
            />
          </div>
          <button
            onClick={handleManualConnect}
            disabled={!manualOwner || !manualRepo}
            className="w-full py-2 rounded-lg bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-3 h-3" />
            Conectar Manualmente
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar repositórios..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-surface-border focus:border-brand-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Loader2 className="w-5 h-5 animate-spin mb-2" />
                <span className="text-[10px]">Carregando repositórios...</span>
              </div>
            ) : filteredRepos.length > 0 ? (
              filteredRepos.map(repo => (
                <button
                  key={repo.fullName}
                  onClick={() => handleSelectRepo(repo)}
                  className="w-full p-2.5 rounded-lg border border-surface-border bg-surface hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-primary group-hover:text-brand-500 truncate pr-2">
                      {repo.name}
                    </span>
                    <span className="text-[9px] text-text-muted font-mono">{repo.owner}</span>
                  </div>
                  {repo.description && (
                    <p className="text-[10px] text-text-muted truncate mt-1 leading-tight">
                      {repo.description}
                    </p>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-[11px] text-text-muted">Nenhum repositório encontrado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-surface-border">
        <p className="text-[10px] text-text-muted leading-relaxed">
          O LovableAuto usará este repositório para aplicar as mudanças de código via commits automáticos.
        </p>
      </div>
    </div>
  );
};
