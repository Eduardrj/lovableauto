import type { FastifyInstance } from 'fastify';
import { jobService } from '../services/job.service.js';
import { changesetService } from '../services/changeset.service.js';

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── GET /:id ───
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const job = await jobService.getJob(request.params.id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });

    const changeset = await changesetService.getByJobId(job.id);

    return { job, changeset: changeset ?? undefined };
  });
}
