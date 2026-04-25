import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { projectService } from '../services/project.service.js';
import { githubService } from '../services/github.service.js';

const connectSchema = z.object({
  lovableProjectUrl: z.string().url(),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  defaultBranch: z.string().optional(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  // All routes require auth
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── POST /connect ───
  fastify.post('/connect', async (request) => {
    const body = connectSchema.parse(request.body);
    const project = await projectService.connect(
      request.user.userId,
      body.lovableProjectUrl,
      body.githubOwner,
      body.githubRepo,
      body.defaultBranch,
    );
    return { project };
  });

  // ─── GET / ───
  fastify.get('/', async (request) => {
    const list = await projectService.listByUser(request.user.userId);
    return { projects: list };
  });

  // ─── GET /:id ───
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = await projectService.getById(request.params.id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return { project };
  });

  // ─── GET /:id/context ───
  fastify.get<{ Params: { id: string } }>('/:id/context', async (request) => {
    const context = await projectService.getContext(request.params.id, request.user.userId);
    return context;
  });

  // ─── POST /:id/sync ───
  fastify.post<{ Params: { id: string } }>('/:id/sync', async (request) => {
    const files = await projectService.syncFilesCache(request.params.id, request.user.userId);
    return { fileCount: files.length };
  });
  // ─── GET /repos ───
  // ─── GET /repos ───
  fastify.get('/repos', async (request) => {
    const repos = await githubService.listUserRepos(request.user.userId);
    return { repos };
  });

  // ─── POST /ensure-repo ───
  fastify.post('/ensure-repo', async (request) => {
    const schema = z.object({
      repoName: z.string().min(1),
      owner: z.string().min(1),
    });
    const { repoName, owner } = schema.parse(request.body);
    const result = await projectService.ensureRepo(request.user.userId, repoName, owner);
    return result;
  });
}
