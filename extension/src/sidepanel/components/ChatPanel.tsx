import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useProjectStore } from '../stores/projectStore';
import { Send, Loader2 } from 'lucide-react';
import { ChangePlan } from './ChangePlan';

export const ChatPanel: React.FC = () => {
  const { messages, isLoading, sendMessage } = useChatStore();
  const { currentProject } = useProjectStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !currentProject) return;
    sendMessage(currentProject.id, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 border border-brand-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Pronto para editar
            </h3>
            <p className="text-xs text-text-muted leading-relaxed mb-6">
              Descreva a mudança que você quer fazer no projeto.
              <br />
              Ex: "Mude a cor principal para azul"
            </p>

            {useProjectStore.getState().lovableInfo && !currentProject && (
              <div className="w-full px-4 py-4 rounded-xl bg-brand-500/10 border border-brand-500/20 animate-fade-in">
                <p className="text-[11px] text-brand-300 font-medium mb-3">
                  Configuração de Projeto
                </p>
                
                {!useProjectStore.getState().lovableInfo?.githubOwner ? (
                  <div className="space-y-3">
                    <p className="text-[10px] text-text-muted text-left">
                      Não conseguimos ler o repositório. Digite abaixo (ex: Eduardrj/caring-crafters):
                    </p>
                    <input 
                      id="manual-repo"
                      type="text" 
                      placeholder="usuario/repositorio"
                      className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-xs text-text-primary focus:border-brand-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById('manual-repo') as HTMLInputElement).value;
                        const [owner, repo] = val.split('/');
                        if (owner && repo) {
                          const info = useProjectStore.getState().lovableInfo!;
                          useProjectStore.getState().connectManual(info.projectId, info.projectUrl, owner, repo);
                        } else {
                          alert('Formato inválido. Use usuario/repositorio');
                        }
                      }}
                      className="w-full py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-all"
                    >
                      Conectar Manualmente
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => useProjectStore.getState().connectProject(useProjectStore.getState().lovableInfo!)}
                    className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-all shadow-lg"
                  >
                    Conectar este Projeto
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-slide-up ${
              msg.role === 'user' ? 'flex justify-end' : ''
            }`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-brand-600 text-white text-sm">
                {msg.content}
              </div>
            ) : msg.role === 'system' ? (
              <div className="glass-card px-3.5 py-2.5 text-xs text-text-secondary whitespace-pre-line">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="glass-card px-3.5 py-2.5 text-sm text-text-primary leading-relaxed">
                  {msg.status === 'analyzing' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                      <span className="text-text-secondary">{msg.content}</span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.plan && <ChangePlan plan={msg.plan} jobId={msg.jobId!} />}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1">
        <div className="relative glass-card overflow-hidden">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentProject
                ? 'Descreva a mudança...'
                : 'Conecte um projeto primeiro...'
            }
            disabled={!currentProject || isLoading}
            rows={1}
            className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted px-4 py-3 pr-12 resize-none outline-none disabled:opacity-50"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !currentProject}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
