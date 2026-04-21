import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ─── Users ───
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  authProvider: varchar('auth_provider', { length: 20 }).notNull().default('github'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Projects ───
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lovableProjectUrl: text('lovable_project_url').notNull(),
    githubOwner: varchar('github_owner', { length: 100 }).notNull(),
    githubRepo: varchar('github_repo', { length: 100 }).notNull(),
    defaultBranch: varchar('default_branch', { length: 100 }).notNull().default('main'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('projects_user_id_idx').on(table.userId)],
);

// ─── Project Files Cache ───
export const projectFilesCache = pgTable(
  'project_files_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    sha: varchar('sha', { length: 40 }).notNull(),
    contentPreview: text('content_preview'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('files_cache_project_idx').on(table.projectId)],
);

// ─── Prompt Sessions ───
export const promptSessions = pgTable(
  'prompt_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userPrompt: text('user_prompt').notNull(),
    aiResponse: text('ai_response'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_project_idx').on(table.projectId)],
);

// ─── Jobs ───
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => promptSessions.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    inputData: jsonb('input_data'),
    outputData: jsonb('output_data'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('jobs_session_idx').on(table.sessionId)],
);

// ─── Changesets ───
export const changesets = pgTable(
  'changesets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    filesAffected: jsonb('files_affected').notNull().default([]),
    diffContent: text('diff_content').notNull().default(''),
    summary: text('summary').notNull().default(''),
    commitSha: varchar('commit_sha', { length: 40 }),
    commitMessage: text('commit_message'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('changesets_project_idx').on(table.projectId),
    index('changesets_job_idx').on(table.jobId),
  ],
);

// ─── GitHub Tokens ───
export const githubTokens = pgTable(
  'github_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    scope: varchar('scope', { length: 500 }).notNull().default(''),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('github_tokens_user_idx').on(table.userId)],
);
