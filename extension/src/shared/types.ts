export interface LovableProjectInfo {
  projectUrl: string;
  projectId: string;
  githubOwner?: string;
  githubRepo?: string;
  branch?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  jobId?: string;
  status?: string;
  plan?: ChangePlan;
}

export interface ChangePlan {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
  filesAffected: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
    additions: number;
    deletions: number;
  }>;
  diffs: Array<{
    path: string;
    before: string;
    after: string;
    diff: string;
  }>;
  commitMessage: string;
}

export type AppView = 'chat' | 'history' | 'settings';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
