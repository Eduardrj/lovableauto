import { db } from '../db/client.js';
import { projects, projectFilesCache } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { githubService } from './github.service.js';
import { v4 as uuidv4 } from 'uuid';

export class ProjectService {
  async connect(
    userId: string,
    lovableProjectUrl: string,
    githubOwner: string,
    githubRepo: string,
    defaultBranch = 'main',
  ) {
    const [project] = await db
      .insert(projects)
      .values({
        id: uuidv4(),
        userId,
        lovableProjectUrl,
        githubOwner,
        githubRepo,
        defaultBranch,
        status: 'active',
      })
      .returning();

    return project;
  }

  async getById(projectId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return project ?? null;
  }

  async listByUser(userId: string) {
    return db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getContext(projectId: string, userId: string) {
    const project = await this.getById(projectId);
    if (!project) throw new Error('Project not found');

    const files = await githubService.listRepoFiles(
      userId,
      project.githubOwner,
      project.githubRepo,
      project.defaultBranch,
    );

    const latestSha = await githubService.getLatestCommitSha(
      userId,
      project.githubOwner,
      project.githubRepo,
      project.defaultBranch,
    );

    return {
      project,
      files,
      branch: project.defaultBranch,
      lastCommitSha: latestSha,
    };
  }

  async syncFilesCache(projectId: string, userId: string) {
    const project = await this.getById(projectId);
    if (!project) throw new Error('Project not found');

    const files = await githubService.listRepoFiles(
      userId,
      project.githubOwner,
      project.githubRepo,
      project.defaultBranch,
    );

    // Clear old cache
    await db
      .delete(projectFilesCache)
      .where(eq(projectFilesCache.projectId, projectId));

    // Insert new cache
    if (files.length > 0) {
      await db.insert(projectFilesCache).values(
        files
          .filter((f) => f.type === 'file')
          .map((f) => ({
            id: uuidv4(),
            projectId,
            path: f.path,
            sha: f.sha,
          })),
      );
    }

    return files;
  }
}

export const projectService = new ProjectService();
