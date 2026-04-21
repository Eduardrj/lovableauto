import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { changesetService } from '../services/changeset.service.js';
import { jobService } from '../services/job.service.js';
import { projectService } from '../services/project.service.js';
import { githubService } from '../services/github.service.js';

const commitSchema = z.object({
  message: z.string().optional(),
});

export async function changesRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── GET /plan/:jobId ───
  fastify.get<{ Params: { jobId: string } }>('/plan/:jobId', async (request, reply) => {
    const changeset = await changesetService.getByJobId(request.params.jobId);
    if (!changeset) return reply.status(404).send({ error: 'Changeset not found' });

    const job = await jobService.getJob(request.params.jobId);

    return {
      sessionId: job?.sessionId,
      plan: {
        summary: changeset.summary,
        filesAffected: changeset.filesAffected,
        riskLevel: (job?.outputData as Record<string, unknown>)?.riskLevel ?? 'medium',
        explanation: (job?.outputData as Record<string, unknown>)?.explanation ?? '',
        diffs: JSON.parse(changeset.diffContent || '[]'),
      },
    };
  });

  // ─── POST /apply/:jobId ───
  fastify.post<{ Params: { jobId: string } }>('/apply/:jobId', async (request, reply) => {
    const userId = request.user.userId;
    const changeset = await changesetService.getByJobId(request.params.jobId);
    if (!changeset) return reply.status(404).send({ error: 'Changeset not found' });

    const project = await projectService.getById(changeset.projectId);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const diffs = JSON.parse(changeset.diffContent || '[]') as Array<{
      path: string;
      after: string;
    }>;

    // Apply each file change via GitHub Contents API
    const updatedFiles: string[] = [];
    for (const diff of diffs) {
      await githubService.updateFile(
        userId,
        project.githubOwner,
        project.githubRepo,
        diff.path,
        diff.after,
        `chore: apply change to ${diff.path}`,
        project.defaultBranch,
      );
      updatedFiles.push(diff.path);
    }

    await changesetService.markApplied(changeset.id);

    return {
      changesetId: changeset.id,
      filesUpdated: updatedFiles,
      status: 'applied',
    };
  });

  // ─── POST /commit/:jobId ───
  fastify.post<{ Params: { jobId: string } }>('/commit/:jobId', async (request, reply) => {
    const userId = request.user.userId;
    const body = commitSchema.parse(request.body ?? {});

    const changeset = await changesetService.getByJobId(request.params.jobId);
    if (!changeset) return reply.status(404).send({ error: 'Changeset not found' });

    const project = await projectService.getById(changeset.projectId);
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const diffs = JSON.parse(changeset.diffContent || '[]') as Array<{
      path: string;
      after: string;
    }>;

    const commitMessage = body.message || changeset.commitMessage || 'feat: auto-generated changes';

    // Multi-file atomic commit
    const result = await githubService.commitMultipleFiles(
      userId,
      project.githubOwner,
      project.githubRepo,
      project.defaultBranch,
      diffs.map((d) => ({ path: d.path, content: d.after })),
      commitMessage,
    );

    await changesetService.markCommitted(changeset.id, result.sha);

    return {
      commitSha: result.sha,
      commitUrl: result.url,
      status: 'committed',
    };
  });

  // ─── POST /rollback/:changesetId ───
  fastify.post<{ Params: { changesetId: string } }>(
    '/rollback/:changesetId',
    async (request, reply) => {
      const userId = request.user.userId;
      const changeset = await changesetService.getById(request.params.changesetId);
      if (!changeset) return reply.status(404).send({ error: 'Changeset not found' });

      if (!changeset.commitSha) {
        return reply.status(400).send({ error: 'Changeset has no commit to rollback' });
      }

      const project = await projectService.getById(changeset.projectId);
      if (!project) return reply.status(404).send({ error: 'Project not found' });

      // Revert: apply the "before" content of each file
      const diffs = JSON.parse(changeset.diffContent || '[]') as Array<{
        path: string;
        before: string;
      }>;

      const result = await githubService.commitMultipleFiles(
        userId,
        project.githubOwner,
        project.githubRepo,
        project.defaultBranch,
        diffs.map((d) => ({ path: d.path, content: d.before })),
        `revert: rollback changeset ${changeset.id}`,
      );

      await changesetService.markRolledBack(changeset.id);

      return {
        revertCommitSha: result.sha,
        status: 'rolled_back',
      };
    },
  );
}
