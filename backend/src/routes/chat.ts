import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { jobService } from '../services/job.service.js';
import { projectService } from '../services/project.service.js';
import { githubService } from '../services/github.service.js';
import { llmService } from '../services/llm.service.js';
import { changesetService } from '../services/changeset.service.js';

const messageSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1).max(10_000),
});

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── POST /message ───
  fastify.post('/message', async (request) => {
    const { projectId, prompt } = messageSchema.parse(request.body);
    const userId = request.user.userId;

    // Create session + job
    const session = await jobService.createSession(projectId, prompt);
    const job = await jobService.createJob(session.id, 'analyze', { prompt, projectId });

    // Process async (in v1, we do it inline; later move to BullMQ)
    processAnalyzeJob(job.id, session.id, projectId, userId, prompt).catch((err) => {
      console.error(`Job ${job.id} failed:`, err);
    });

    return {
      sessionId: session.id,
      jobId: job.id,
      status: 'queued',
    };
  });

  // ─── GET /stream/:jobId (SSE) ───
  fastify.get<{ Params: { jobId: string } }>('/stream/:jobId', async (request, reply) => {
    const jobId = request.params.jobId;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Poll job status and stream updates
    const interval = setInterval(async () => {
      const job = await jobService.getJob(jobId);
      if (!job) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'job:failed', error: 'Job not found' })}\n\n`);
        clearInterval(interval);
        reply.raw.end();
        return;
      }

      reply.raw.write(`data: ${JSON.stringify({ type: `job:${job.status}`, jobId, data: job.outputData })}\n\n`);

      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
}

/**
 * Inline job processor (v1). Will migrate to BullMQ worker later.
 */
async function processAnalyzeJob(
  jobId: string,
  sessionId: string,
  projectId: string,
  userId: string,
  prompt: string,
) {
  try {
    await jobService.updateJobStatus(jobId, 'running');
    await jobService.updateSessionStatus(sessionId, 'analyzing');

    // 1. Get project context
    const project = await projectService.getById(projectId);
    if (!project) throw new Error('Project not found');

    // 2. List repo files
    const allFiles = await githubService.listRepoFiles(
      userId,
      project.githubOwner,
      project.githubRepo,
      project.defaultBranch,
    );

    const codeFiles = allFiles.filter((f) => f.type === 'file');

    // 3. Ask LLM which files are relevant
    const relevantPaths = await llmService.identifyRelevantFiles(prompt, codeFiles);

    // 4. Read relevant files
    const fileContents = await githubService.getMultipleFiles(
      userId,
      project.githubOwner,
      project.githubRepo,
      relevantPaths,
      project.defaultBranch,
    );

    const filesForLlm = Array.from(fileContents.entries()).map(([path, data]) => ({
      path,
      content: data.content,
    }));

    // 5. Generate plan
    const plan = await llmService.generatePlan({
      prompt,
      files: filesForLlm,
    });

    // 6. Save changeset
    await changesetService.create(jobId, projectId, {
      filesAffected: plan.filesAffected,
      diffContent: JSON.stringify(plan.diffs),
      summary: plan.summary,
      commitMessage: plan.commitMessage,
    });

    // 7. Update status
    await jobService.updateJobStatus(jobId, 'completed', {
      outputData: {
        summary: plan.summary,
        riskLevel: plan.riskLevel,
        explanation: plan.explanation,
        filesAffected: plan.filesAffected,
        commitMessage: plan.commitMessage,
      },
    });
    await jobService.updateSessionStatus(sessionId, 'plan_ready', plan.explanation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await jobService.updateJobStatus(jobId, 'failed', { errorMessage: message });
    await jobService.updateSessionStatus(sessionId, 'failed');
  }
}
