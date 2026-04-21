import { db } from '../db/client.js';
import { jobs, promptSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { JobType, JobStatus } from '../../shared/types/models.js';

export class JobService {
  async createSession(projectId: string, userPrompt: string) {
    const [session] = await db
      .insert(promptSessions)
      .values({
        id: uuidv4(),
        projectId,
        userPrompt,
        status: 'pending',
      })
      .returning();

    return session;
  }

  async createJob(sessionId: string, type: JobType, inputData?: Record<string, unknown>) {
    const [job] = await db
      .insert(jobs)
      .values({
        id: uuidv4(),
        sessionId,
        type,
        status: 'queued',
        inputData: inputData ?? null,
      })
      .returning();

    return job;
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    extra?: { outputData?: Record<string, unknown>; errorMessage?: string },
  ) {
    const updates: Record<string, unknown> = { status };

    if (status === 'running') updates.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updates.completedAt = new Date();
    if (extra?.outputData) updates.outputData = extra.outputData;
    if (extra?.errorMessage) updates.errorMessage = extra.errorMessage;

    await db.update(jobs).set(updates).where(eq(jobs.id, jobId));
  }

  async updateSessionStatus(sessionId: string, status: string, aiResponse?: string) {
    const updates: Record<string, unknown> = { status };
    if (aiResponse) updates.aiResponse = aiResponse;

    await db.update(promptSessions).set(updates).where(eq(promptSessions.id, sessionId));
  }

  async getJob(jobId: string) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    return job ?? null;
  }

  async getSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(promptSessions)
      .where(eq(promptSessions.id, sessionId))
      .limit(1);
    return session ?? null;
  }
}

export const jobService = new JobService();
