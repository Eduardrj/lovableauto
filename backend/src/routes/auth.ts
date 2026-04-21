import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users, githubTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export async function authRoutes(fastify: FastifyInstance) {
  // ─── GET /github/start ───
  fastify.get('/github/start', async (_request, reply) => {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: 'repo user:email',
      state: crypto.randomUUID(),
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return reply.send({ authUrl });
  });

  // ─── GET /github/callback ───
  fastify.get<{
    Querystring: { code: string; state: string };
  }>('/github/callback', async (request, reply) => {
    const { code } = request.query;

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
    };

    if (!tokenData.access_token) {
      return reply.status(400).send({ error: 'Failed to get access token from GitHub' });
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const ghUser = (await userResponse.json()) as {
      id: number;
      email: string | null;
      login: string;
      avatar_url: string;
    };

    // Get email if not public
    let email = ghUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
      }>;
      email = emails.find((e) => e.primary)?.email ?? `${ghUser.login}@users.noreply.github.com`;
    }

    // Upsert user
    const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let user;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      await db
        .update(users)
        .set({ avatarUrl: ghUser.avatar_url, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          id: uuidv4(),
          email,
          plan: 'free',
          authProvider: 'github',
          avatarUrl: ghUser.avatar_url,
        })
        .returning();
      user = newUser;
    }

    // Store encrypted token
    const encryptedToken = encrypt(tokenData.access_token);

    // Upsert token
    const existingTokens = await db
      .select()
      .from(githubTokens)
      .where(eq(githubTokens.userId, user.id))
      .limit(1);

    if (existingTokens.length > 0) {
      await db
        .update(githubTokens)
        .set({
          accessTokenEncrypted: encryptedToken,
          scope: tokenData.scope,
        })
        .where(eq(githubTokens.userId, user.id));
    } else {
      await db.insert(githubTokens).values({
        id: uuidv4(),
        userId: user.id,
        accessTokenEncrypted: encryptedToken,
        scope: tokenData.scope,
      });
    }

    // Generate JWT
    const jwt = fastify.jwt.sign({ userId: user.id, email: user.email });

    // Return JWT (extension will capture this)
    return reply.send({
      token: jwt,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        avatarUrl: user.avatarUrl,
      },
    });
  });

  // ─── GET /me ───
  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.user.userId))
        .limit(1);

      if (!user) {
        throw { statusCode: 404, message: 'User not found' };
      }

      return { user };
    },
  );

  // ─── POST /logout ───
  fastify.post(
    '/logout',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      // JWT is stateless; client just discards the token.
      // Could add token blacklist via Redis in production.
      return reply.send({ ok: true });
    },
  );
}
