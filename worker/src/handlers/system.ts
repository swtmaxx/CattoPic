import type { Context } from 'hono';
import type { Env, Config, AdminStats, CompressionOptions, ThemeConfig } from '../types';
import { MetadataService } from '../services/metadata';
import { buildImageUrls } from '../utils/imageTransform';
import { CacheService, CacheKeys, CACHE_TTL } from '../services/cache';
import { processPendingDeletionJobs } from '../services/deletion';
import { successResponse, errorResponse } from '../utils/response';

// Default compression options (global defaults used by the upload handler)
const DEFAULT_THEME: ThemeConfig = {
  accent: 'green',
  mode: 'system',
};

const DEFAULT_COMPRESSION: Required<CompressionOptions> = {
  quality: 90,
  maxWidth: 0,
  maxHeight: 0,
  preserveAnimation: true,
  generateWebp: true,
  generateAvif: true,
};

// Default configuration
export const DEFAULT_MAX_FILE_SIZE = 70 * 1024 * 1024;

const DEFAULT_CONFIG: Config = {
  maxUploadCount: 50,
  maxFileSize: DEFAULT_MAX_FILE_SIZE, // 70MB
  supportedFormats: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif', 'svg'],
  imageQuality: 80,
  compression: DEFAULT_COMPRESSION,
  theme: DEFAULT_THEME,
};

// Load effective config (D1 config table merged with defaults).
export async function getEffectiveConfig(db: D1Database): Promise<Config> {
  const configResult = await db.prepare(`
    SELECT key, value FROM config
  `).all<{ key: string; value: string }>();

  if (!configResult.results || configResult.results.length === 0) {
    return { ...DEFAULT_CONFIG };
  }

  const config: Record<string, unknown> = { ...DEFAULT_CONFIG };
  for (const row of configResult.results) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }

  // Normalize the configurable upload limit so legacy or malformed D1 values
  // always fall back to the documented default.
  const configuredMaxFileSize = Number(config.maxFileSize);
  config.maxFileSize = Number.isFinite(configuredMaxFileSize) && configuredMaxFileSize > 0
    ? Math.max(1, Math.min(500 * 1024 * 1024, Math.trunc(configuredMaxFileSize)))
    : DEFAULT_MAX_FILE_SIZE;

  // Merge compression defaults so partial configs stay valid
  const compression = config.compression as Partial<CompressionOptions> | undefined;
  config.compression = { ...DEFAULT_COMPRESSION, ...(compression || {}) };

  // Merge theme defaults so partial configs stay valid
  const theme = config.theme as Partial<ThemeConfig> | undefined;
  config.theme = { ...DEFAULT_THEME, ...(theme || {}) };

  return config as unknown as Config;
}

function sanitizeTheme(input: unknown): ThemeConfig | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const accents = ['green', 'blue', 'violet', 'red', 'orange'];
  const modes = ['system', 'light', 'dark'];
  if (typeof raw.accent !== 'string' || !accents.includes(raw.accent)) return null;
  if (typeof raw.mode !== 'string' || !modes.includes(raw.mode)) return null;
  return { accent: raw.accent as ThemeConfig['accent'], mode: raw.mode as ThemeConfig['mode'] };
}

function sanitizeCompression(input: unknown): Required<CompressionOptions> | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const clampInt = (v: unknown, min: number, max: number, def: number): number => {
    const num = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (!Number.isFinite(num)) return def;
    return Math.max(min, Math.min(max, Math.trunc(num)));
  };

  return {
    quality: clampInt(raw.quality, 1, 100, DEFAULT_COMPRESSION.quality),
    maxWidth: clampInt(raw.maxWidth, 0, 10000, DEFAULT_COMPRESSION.maxWidth),
    maxHeight: clampInt(raw.maxHeight, 0, 10000, DEFAULT_COMPRESSION.maxHeight),
    preserveAnimation: typeof raw.preserveAnimation === 'boolean'
      ? raw.preserveAnimation
      : DEFAULT_COMPRESSION.preserveAnimation,
    generateWebp: typeof raw.generateWebp === 'boolean'
      ? raw.generateWebp
      : DEFAULT_COMPRESSION.generateWebp,
    generateAvif: typeof raw.generateAvif === 'boolean'
      ? raw.generateAvif
      : DEFAULT_COMPRESSION.generateAvif,
  };
}

// GET /api/config - Get configuration
export async function configHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const cache = new CacheService(c.env.CACHE_KV);
    const cacheKey = CacheKeys.config();

    // Try to get from cache
    const cached = await cache.get<{ config: Config }>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const config = await getEffectiveConfig(c.env.DB);
    const responseData = { config };

    // Store in cache
    await cache.set(cacheKey, responseData, CACHE_TTL.CONFIG);

    return successResponse(responseData);
  } catch (err) {
    console.error('Config handler error:', err);
    return successResponse({ config: DEFAULT_CONFIG });
  }
}

// PUT /api/config - Update configuration (admin only)
export async function updateConfigHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return errorResponse('请求体无效');
    }

    const statements: D1PreparedStatement[] = [];

    if (body.theme !== undefined) {
      const theme = sanitizeTheme(body.theme);
      if (!theme) return errorResponse('theme 配置无效');
      statements.push(
        c.env.DB.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('theme', ?)`)
          .bind(JSON.stringify(theme))
      );
    }

    if (body.compression !== undefined) {
      const compression = sanitizeCompression(body.compression);
      if (!compression) return errorResponse('compression 配置无效');
      statements.push(
        c.env.DB.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('compression', ?)`)
          .bind(JSON.stringify(compression))
      );
    }

    if (body.maxUploadCount !== undefined) {
      const value = Math.max(1, Math.min(1000, Math.trunc(Number(body.maxUploadCount))));
      if (!Number.isFinite(value)) return errorResponse('maxUploadCount 无效');
      statements.push(
        c.env.DB.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('maxUploadCount', ?)`)
          .bind(String(value))
      );
    }

    if (body.imageQuality !== undefined) {
      const value = Math.max(1, Math.min(100, Math.trunc(Number(body.imageQuality))));
      if (!Number.isFinite(value)) return errorResponse('imageQuality 无效');
      statements.push(
        c.env.DB.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('imageQuality', ?)`)
          .bind(String(value))
      );
    }

    if (body.maxFileSize !== undefined) {
      const value = Math.max(1, Math.min(500 * 1024 * 1024, Math.trunc(Number(body.maxFileSize))));
      if (!Number.isFinite(value)) return errorResponse('maxFileSize 无效');
      statements.push(
        c.env.DB.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('maxFileSize', ?)`)
          .bind(String(value))
      );
    }

    if (statements.length === 0) {
      return errorResponse('没有可更新的配置项');
    }

    await c.env.DB.batch(statements);

    // Invalidate config cache
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.delete(CacheKeys.config());

    const config = await getEffectiveConfig(c.env.DB);
    return successResponse({ message: '配置已更新', config });
  } catch (err) {
    console.error('Update config error:', err);
    return errorResponse('更新配置失败');
  }
}

// GET /api/admin/stats - Admin dashboard statistics
export async function statsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const metadata = new MetadataService(c.env.DB);
    const stats: AdminStats = await metadata.getAdminStats();
    const baseUrl = c.env.R2_PUBLIC_URL;
    stats.recentUploads = stats.recentUploads.map((img) => ({
      ...img,
      urls: buildImageUrls({
        baseUrl,
        image: img,
        options: {
          generateWebp: !!img.paths.webp,
          generateAvif: !!img.paths.avif,
        },
      }),
    }));
    return successResponse({ stats });
  } catch (err) {
    console.error('Stats handler error:', err);
    return errorResponse('获取统计失败');
  }
}

// POST /api/cleanup - Retry pending R2 deletion jobs
export async function cleanupHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    c.executionCtx.waitUntil(
      processPendingDeletionJobs(c.env)
        .catch((err) => console.error('Pending deletion retry failed:', err))
    );

    return successResponse({ deletedCount: 0 });
  } catch (err) {
    console.error('Cleanup handler error:', err);
    return errorResponse('Cleanup failed');
  }
}
