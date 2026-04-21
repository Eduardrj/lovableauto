// ──────────────────────────────────────────
// Shared domain models — mirrored by Drizzle schema
// ──────────────────────────────────────────

export type Plan = 'free' | 'pro' | 'team';
export type AuthProvider = 'github';

export interface User {
  id: string;
  email: string;
  plan: Plan;
  authProvider: AuthProvider;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'disconnected' | 'error';

export interface Project {
  id: string;
  userId: string;
  lovableProjectUrl: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFileCache {
  id: string;
  projectId: string;
  path: string;
  sha: string;
  contentPreview?: string;
  lastSeenAt: string;
}

export type SessionStatus = 'pending' | 'analyzing' | 'plan_ready' | 'applying' | 'applied' | 'committed' | 'failed';

export interface PromptSession {
  id: string;
  projectId: string;
  userPrompt: string;
  aiResponse?: string;
  status: SessionStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type JobType = 'analyze' | 'patch' | 'commit';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  sessionId: string;
  type: JobType;
  status: JobStatus;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type ChangesetStatus = 'draft' | 'applied' | 'committed' | 'rolled_back';

export interface Changeset {
  id: string;
  jobId: string;
  projectId: string;
  filesAffected: FileChange[];
  diffContent: string;
  summary: string;
  commitSha?: string;
  commitMessage?: string;
  status: ChangesetStatus;
  createdAt: string;
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  additions: number;
  deletions: number;
}

export interface GithubToken {
  id: string;
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  scope: string;
  expiresAt?: string;
  createdAt: string;
}
