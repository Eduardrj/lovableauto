import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authPlugin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { chatRoutes } from './routes/chat.js';
import { changesRoutes } from './routes/changes.js';
import { jobRoutes } from './routes/jobs.js';
import { historyRoutes } from './routes/history.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function buildServer() {
  // ─── CORS ───
  await fastify.register(cors, {
    origin: [
      'chrome-extension://hlbehalabmpbcgkoimlffngomnmbmjoj',
      env.EXTENSION_ORIGIN ?? '',
      'http://localhost:5173', // Vite dev
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ─── Rate Limiting ───
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Auth (JWT) ───
  await fastify.register(authPlugin);

  // ─── Health & Welcome ───
  fastify.get('/', async () => ({
    message: 'LovableAuto API is running!',
    version: '1.0.0',
    docs: '/health'
  }));

  fastify.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // ─── Routes ───
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(projectRoutes, { prefix: '/projects' });
  await fastify.register(chatRoutes, { prefix: '/chat' });
  await fastify.register(changesRoutes, { prefix: '/changes' });
  await fastify.register(jobRoutes, { prefix: '/jobs' });
  await fastify.register(historyRoutes, { prefix: '/history' });

  // ─── Global Error Handler ───
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    fastify.log.error(error);

    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'InternalServerError',
      message: error.message ?? 'An unexpected error occurred',
    });
  });

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 LovableAuto backend running at http://localhost:${env.PORT}`);
    console.log(`📋 Health check: http://localhost:${env.PORT}/health\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
