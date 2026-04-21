// ──────────────────────────────────────────
// API request / response shapes
// ──────────────────────────────────────────

import type {
  Project,
  PromptSession,
  Job,
  Changeset,
  User,
  FileChange,
  SessionStatus,
  JobStatus,
} from './models';

// ─── Auth ───

export interface AuthStartResponse {
  authUrl: string;
}

export interface AuthMeResponse {
  user: User;
}

// ─── Projects ───

export interface ConnectProjectRequest {
  lovableProjectUrl: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch?: string;
}

export interface ConnectProjectResponse {
  project: Project;
}

export interface ProjectContextResponse {
  project: Project;
  files: Array<{
    path: string;
    sha: string;
    size: number;
    type: 'file' | 'dir';
  }>;
  branch: string;
  lastCommitSha: string;
}

// ─── Chat ───

export interface ChatMessageRequest {
  projectId: string;
  prompt: string;
}

export interface ChatMessageResponse {
  sessionId: string;
  jobId: string;
  status: SessionStatus;
}

// ─── Changes ───

export interface ChangePlanResponse {
  sessionId: string;
  plan: {
    summary: string;
    filesAffected: FileChange[];
    riskLevel: 'low' | 'medium' | 'high';
    explanation: string;
    diffs: Array<{
      path: string;
      before: string;
      after: string;
      diff: string;
    }>;
  };
}

export interface ApplyChangesResponse {
  changesetId: string;
  filesUpdated: string[];
  status: 'applied';
}

export interface CommitChangesRequest {
  message?: string;
}

export interface CommitChangesResponse {
  commitSha: string;
  commitUrl: string;
  status: 'committed';
}

export interface RollbackResponse {
  revertCommitSha: string;
  status: 'rolled_back';
}

// ─── Jobs ───

export interface JobStatusResponse {
  job: Job;
  changeset?: Changeset;
}

// ─── History ───

export interface HistoryEntry {
  session: PromptSession;
  changeset?: Changeset;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  page: number;
  perPage: number;
}

// ─── Generic ───

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}
