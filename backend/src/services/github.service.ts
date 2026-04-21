import { Octokit } from 'octokit';
import { db } from '../db/client.js';
import { githubTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../middleware/auth.js';

interface RepoFile {
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;
}

interface CommitResult {
  sha: string;
  url: string;
}

export class GithubService {
  private async getOctokit(userId: string): Promise<Octokit> {
    const [token] = await db
      .select()
      .from(githubTokens)
      .where(eq(githubTokens.userId, userId))
      .limit(1);

    if (!token) {
      throw new Error('GitHub token not found. Please reconnect your GitHub account.');
    }

    const accessToken = decrypt(token.accessTokenEncrypted);
    return new Octokit({ auth: accessToken });
  }

  /**
   * List all files in a repository recursively.
   */
  async listRepoFiles(
    userId: string,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<RepoFile[]> {
    const octokit = await this.getOctokit(userId);

    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true',
    });

    return data.tree
      .filter((item) => item.type === 'blob' || item.type === 'tree')
      .map((item) => ({
        path: item.path!,
        sha: item.sha!,
        size: item.size ?? 0,
        type: item.type === 'blob' ? 'file' : 'dir',
      }));
  }

  /**
   * Read the content of a single file.
   */
  async getFileContent(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    branch: string,
  ): Promise<{ content: string; sha: string }> {
    const octokit = await this.getOctokit(userId);

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`Path "${path}" is not a file.`);
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content, sha: data.sha };
  }

  /**
   * Read multiple files in parallel.
   */
  async getMultipleFiles(
    userId: string,
    owner: string,
    repo: string,
    paths: string[],
    branch: string,
  ): Promise<Map<string, { content: string; sha: string }>> {
    const results = new Map<string, { content: string; sha: string }>();

    const settled = await Promise.allSettled(
      paths.map(async (path) => {
        const result = await this.getFileContent(userId, owner, repo, path, branch);
        return { path, ...result };
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.path, {
          content: result.value.content,
          sha: result.value.sha,
        });
      }
    }

    return results;
  }

  /**
   * Create or update a single file via GitHub Contents API.
   */
  async updateFile(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    existingSha?: string,
  ): Promise<CommitResult> {
    const octokit = await this.getOctokit(userId);

    // Get existing SHA if not provided
    let sha = existingSha;
    if (!sha) {
      try {
        const existing = await this.getFileContent(userId, owner, repo, path, branch);
        sha = existing.sha;
      } catch {
        // File doesn't exist yet — creating new file
      }
    }

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    });

    return {
      sha: data.commit.sha!,
      url: data.commit.html_url!,
    };
  }

  /**
   * Multi-file commit using Git Tree API (atomic).
   */
  async commitMultipleFiles(
    userId: string,
    owner: string,
    repo: string,
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string,
  ): Promise<CommitResult> {
    const octokit = await this.getOctokit(userId);

    // 1. Get the latest commit on the branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const latestCommitSha = ref.object.sha;

    // 2. Get the tree of the latest commit
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = latestCommit.tree.sha;

    // 3. Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });

        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      }),
    );

    // 4. Create new tree
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // 5. Create commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // 6. Update branch reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return {
      sha: newCommit.sha,
      url: newCommit.html_url,
    };
  }

  /**
   * Get the latest commit SHA for a branch.
   */
  async getLatestCommitSha(
    userId: string,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<string> {
    const octokit = await this.getOctokit(userId);

    const { data } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });

    return data.commit.sha;
  }
}

export const githubService = new GithubService();
