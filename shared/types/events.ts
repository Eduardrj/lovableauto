// ──────────────────────────────────────────
// SSE / WebSocket event shapes
// ──────────────────────────────────────────

export type StreamEventType =
  | 'job:queued'
  | 'job:started'
  | 'job:progress'
  | 'job:plan_ready'
  | 'job:applying'
  | 'job:applied'
  | 'job:committing'
  | 'job:committed'
  | 'job:failed'
  | 'job:done';

export interface StreamEvent<T = unknown> {
  type: StreamEventType;
  jobId: string;
  timestamp: string;
  data: T;
}

export interface ProgressData {
  step: string;
  detail?: string;
  progress?: number; // 0-100
}

export interface PlanReadyData {
  summary: string;
  filesAffected: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
  }>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AppliedData {
  filesUpdated: string[];
}

export interface CommittedData {
  commitSha: string;
  commitUrl: string;
}

export interface FailedData {
  error: string;
  retryable: boolean;
}
