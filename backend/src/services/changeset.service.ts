import { db } from '../db/client.js';
import { changesets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { FileChange } from '../../shared/types/models.js';

export class ChangesetService {
  async create(
    jobId: string,
    projectId: string,
    data: {
      filesAffected: FileChange[];
      diffContent: string;
      summary: string;
      commitMessage: string;
    },
  ) {
    const [changeset] = await db
      .insert(changesets)
      .values({
        id: uuidv4(),
        jobId,
        projectId,
        filesAffected: data.filesAffected,
        diffContent: data.diffContent,
        summary: data.summary,
        commitMessage: data.commitMessage,
        status: 'draft',
      })
      .returning();

    return changeset;
  }

  async getById(changesetId: string) {
    const [changeset] = await db
      .select()
      .from(changesets)
      .where(eq(changesets.id, changesetId))
      .limit(1);
    return changeset ?? null;
  }

  async getByJobId(jobId: string) {
    const [changeset] = await db
      .select()
      .from(changesets)
      .where(eq(changesets.jobId, jobId))
      .limit(1);
    return changeset ?? null;
  }

  async markApplied(changesetId: string) {
    await db
      .update(changesets)
      .set({ status: 'applied' })
      .where(eq(changesets.id, changesetId));
  }

  async markCommitted(changesetId: string, commitSha: string) {
    await db
      .update(changesets)
      .set({ status: 'committed', commitSha })
      .where(eq(changesets.id, changesetId));
  }

  async markRolledBack(changesetId: string) {
    await db
      .update(changesets)
      .set({ status: 'rolled_back' })
      .where(eq(changesets.id, changesetId));
  }

  async listByProject(projectId: string, limit = 50) {
    return db
      .select()
      .from(changesets)
      .where(eq(changesets.projectId, projectId))
      .limit(limit)
      .orderBy(changesets.createdAt);
  }
}

export const changesetService = new ChangesetService();
