import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AuthService } from './services/auth';
import { corsResponse, unauthorizedResponse } from './utils/response';
import { processPendingDeletionJobs } from './services/deletion';

// Import handlers
import { uploadSingleHandler } from './handlers/upload';
import { imagesHandler, imageDetailHandler, updateImageHandler, deleteImageHandler, batchDeleteImagesHandler } from './handlers/images';
import { randomHandler } from './handlers/random';
import { faviconHandler } from './handlers/favicon';
import { tagsHandler, createTagHandler, renameTagHandler, deleteTagHandler, batchTagsHandler } from './handlers/tags';
import { setupHandler, loginHandler, logoutHandler, sessionHandler, changeAccountHandler } from './handlers/auth';
import { configHandler, updateConfigHandler, statsHandler, cleanupHandler } from './handlers/system';
import { handleQueueBatch } from './handlers/queue';
import type { QueueMessage } from './types/queue';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - echo origin so credentials (cookies) can be used cross-origin
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400,
}));

// Handle preflight requests
app.options('*', () => corsResponse());

// Auth middleware for protected routes (session cookie based)
const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  const service = new AuthService(c.env.DB, c.env.CACHE_KV, c.env.ENVIRONMENT !== 'development');
  const valid = await service.validateSession(c.req.raw);

  if (!valid) {
    return unauthorizedResponse();
  }

  await next();
};

// === Public Routes ===

// Favicon for browser requests hitting API endpoints directly
app.get('/favicon.ico', faviconHandler);
app.get('/favicon.svg', faviconHandler);

// Random image (public, no auth required)
app.get('/api/random', randomHandler);

// Auth (public endpoints; setup only works while no admin exists)
app.post('/api/auth/setup', setupHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', logoutHandler);
app.get('/api/auth/session', sessionHandler);
app.post('/api/auth/account', authMiddleware, changeAccountHandler);

// === Protected Routes ===

// Upload (single file per request - Cloudflare Worker best practice)
app.post('/api/upload/single', authMiddleware, uploadSingleHandler);

// Images CRUD
app.get('/api/images', authMiddleware, imagesHandler);
app.get('/api/images/:id', authMiddleware, imageDetailHandler);
app.put('/api/images/:id', authMiddleware, updateImageHandler);
app.delete('/api/images/:id', authMiddleware, deleteImageHandler);
app.post('/api/images/batch-delete', authMiddleware, batchDeleteImagesHandler);

// Tags CRUD
app.get('/api/tags', authMiddleware, tagsHandler);
app.post('/api/tags', authMiddleware, createTagHandler);
app.put('/api/tags/:name', authMiddleware, renameTagHandler);
app.delete('/api/tags/:name', authMiddleware, deleteTagHandler);
app.post('/api/tags/batch', authMiddleware, batchTagsHandler);

// System
app.get('/api/config', authMiddleware, configHandler);
app.put('/api/config', authMiddleware, updateConfigHandler);
app.get('/api/admin/stats', authMiddleware, statsHandler);
app.post('/api/cleanup', authMiddleware, cleanupHandler);

// 404 handler - ensure CORS headers are included
app.notFound(() => {
  return new Response(
    JSON.stringify({ success: false, error: 'Not found' }),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
});

// Error handler - ensure CORS headers are included
app.onError((err) => {
  console.error('Error:', err);
  return new Response(
    JSON.stringify({ success: false, error: 'Internal server error' }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
});

// Scheduled handler for cron jobs - retry pending R2 deletion jobs
async function scheduledHandler(
  _event: ScheduledEvent,
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ExecutionContext
): Promise<void> {
  console.log('Cron job started: retrying pending R2 deletion jobs');

  try {
    const retriedDeletionJobs = await processPendingDeletionJobs(env);
    console.log(`Cron job completed: retried ${retriedDeletionJobs} pending deletion jobs`);
  } catch (err) {
    console.error('Cron job failed:', err);
  }
}

// Queue handler for async R2 deletion
async function queueHandler(
  batch: MessageBatch<QueueMessage>,
  env: Env
): Promise<void> {
  await handleQueueBatch(batch, env);
}

const handlers = {
  fetch: app.fetch,
  scheduled: scheduledHandler,
  queue: queueHandler,
};

export default handlers;
