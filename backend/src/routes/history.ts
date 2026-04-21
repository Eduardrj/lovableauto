import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { promptSessions, changesets } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function historyRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── GET /:projectId ───
  fastify.get<{
    Params: { projectId: string };
    Querystring: { page?: string; perPage?: string };
  }>('/:projectId', async (request) => {
    const projectId = request.params.projectId;
    const page = parseInt(request.query.page ?? '1', 10);
    const perPage = Math.min(parseInt(request.query.perPage ?? '20', 10), 100);
    const offset = (page - 1) * perPage;

    const sessions = await db
      .select()
      .from(promptSessions)
      .where(eq(promptSessions.projectId, projectId))
      .orderBy(desc(promptSessions.createdAt))
      .limit(perPage)
      .offset(offset);

    // Get changesets for these sessions
    const entries = await Promise.all(
      sessions.map(async (session) => {
        const [changeset] = await db
          .select()
          .from(changesets)
          .where(eq(changesets.projectId, projectId))
          .limit(1);

        return { session, changeset: changeset ?? undefined };
      }),
    );

    return {
      entries,
      total: sessions.length,
      page,
      perPage,
    };
  });
}
