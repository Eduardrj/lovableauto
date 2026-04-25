const API_URL = 'http://104.131.110.134:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    chrome.storage.local.set({ authToken: token });
  }

  async loadToken() {
    const result = await chrome.storage.local.get('authToken');
    this.token = result.authToken ?? null;
  }

  clearToken() {
    this.token = null;
    chrome.storage.local.remove('authToken');
  }

  get isAuthenticated() {
    return !!this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // ─── Auth ───
  async getAuthUrl() {
    return this.request<{ authUrl: string }>('/auth/github/start');
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // ─── Projects ───
  async connectProject(data: {
    lovableProjectUrl: string;
    githubOwner: string;
    githubRepo: string;
    defaultBranch?: string;
  }) {
    return this.request<{ project: any }>('/projects/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listProjects() {
    return this.request<{ projects: any[] }>('/projects');
  }

  async listRepos() {
    return this.request<{ repos: any[] }>('/projects/repos');
  }

  async ensureRepo(owner: string, repoName: string) {
    return this.request<{ status: string; owner: string; repo: string }>('/projects/ensure-repo', {
      method: 'POST',
      body: JSON.stringify({ owner, repoName }),
    });
  }

  async getProjectContext(projectId: string) {
    return this.request<any>(`/projects/${projectId}/context`);
  }

  async syncProjectFiles(projectId: string) {
    return this.request<{ fileCount: number }>(`/projects/${projectId}/sync`, {
      method: 'POST',
    });
  }

  // ─── Chat ───
  async sendMessage(projectId: string, prompt: string) {
    return this.request<{ sessionId: string; jobId: string; status: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ projectId, prompt }),
    });
  }

  // ─── Changes ───
  async getPlan(jobId: string) {
    return this.request<any>(`/changes/plan/${jobId}`);
  }

  async applyChanges(jobId: string) {
    return this.request<any>(`/changes/apply/${jobId}`, { method: 'POST' });
  }

  async commitChanges(jobId: string, message?: string) {
    return this.request<any>(`/changes/commit/${jobId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async rollback(changesetId: string) {
    return this.request<any>(`/changes/rollback/${changesetId}`, { method: 'POST' });
  }

  // ─── Jobs ───
  async getJobStatus(jobId: string) {
    return this.request<any>(`/jobs/${jobId}`);
  }

  // ─── History ───
  async getHistory(projectId: string, page = 1) {
    return this.request<any>(`/history/${projectId}?page=${page}`);
  }

  // ─── SSE Stream ───
  streamJob(jobId: string, onEvent: (event: any) => void): () => void {
    const eventSource = new EventSource(`${API_URL}/chat/stream/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }
}

export const apiClient = new ApiClient();
