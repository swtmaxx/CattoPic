import type { Context } from 'hono';
import type { Env } from '../types';
import { MetadataService } from '../services/metadata';
import { CacheService, CacheKeys, CACHE_TTL } from '../services/cache';
import { dispatchImageDeletions, toDeletionTarget } from '../services/deletion';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response';
import { parseNumber, validateOrientation, validateImageListFormat, validateOriginalImageFormat, parseTags, sanitizeTagName, isValidUUID } from '../utils/validation';
import { buildImageUrls } from '../utils/imageTransform';

const MAX_IMAGES_PAGE_SIZE = 100;
const MAX_BATCH_IMAGE_IDS = 500;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

// GET /api/images - List images with pagination and filters
export async function imagesHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const url = new URL(c.req.url);
    const page = Math.max(1, parseNumber(url.searchParams.get('page'), 1));
    const limit = clampInt(parseNumber(url.searchParams.get('limit'), 12), 1, MAX_IMAGES_PAGE_SIZE);
    const rawTag = url.searchParams.get('tag');
    const tag = rawTag ? sanitizeTagName(rawTag) || undefined : undefined;
    const orientation = validateOrientation(url.searchParams.get('orientation'));
    const format = validateImageListFormat(url.searchParams.get('format')) || 'all';
    const originalFormat = validateOriginalImageFormat(url.searchParams.get('originalFormat')) || 'all';
    const search = url.searchParams.get('search')?.trim() || undefined;
    const sortRaw = url.searchParams.get('sort');
    const sort = sortRaw === 'name' || sortRaw === 'size' ? sortRaw : 'upload_time';
    const orderRaw = url.searchParams.get('order');
    const order = orderRaw === 'asc' ? 'asc' : 'desc';

    const cache = new CacheService(c.env.CACHE_KV);
    const cacheKey = CacheKeys.imagesList(page, limit, tag, orientation, format, originalFormat, search, sort, order);

    // Try to get from cache - cache stores the response data object, not the Response
    interface ImagesListCache {
      images: Array<Record<string, unknown>>;
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
    const cached = await cache.get<ImagesListCache>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const metadata = new MetadataService(c.env.DB);
    const { images, total } = await metadata.getImages({ page, limit, tag, orientation, format, originalFormat, search, sort, order });

    const baseUrl = c.env.R2_PUBLIC_URL;

    // Add full URLs to images
    const imagesWithUrls = images.map(img => ({
      ...img,
      urls: {
        ...buildImageUrls({
          baseUrl,
          image: img,
          options: {
            generateWebp: !!img.paths.webp,
            generateAvif: !!img.paths.avif,
          },
        }),
      }
    }));

    const responseData = {
      images: imagesWithUrls,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    // Store in cache
    await cache.set(cacheKey, responseData, CACHE_TTL.IMAGES_LIST);

    return successResponse(responseData);

  } catch (err) {
    console.error('Images handler error:', err);
    return errorResponse('获取图片列表失败');
  }
}

// GET /api/images/:id - Get single image details
export async function imageDetailHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const id = c.req.param('id');

    if (!id || !isValidUUID(id)) {
      return errorResponse('无效的图片ID');
    }

    const cache = new CacheService(c.env.CACHE_KV);
    const cacheKey = CacheKeys.imageDetail(id);

    // Try to get from cache - cache stores the response data object
    interface ImageDetailCache {
      image: Record<string, unknown>;
    }
    const cached = await cache.get<ImageDetailCache>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const metadata = new MetadataService(c.env.DB);
    const image = await metadata.getImage(id);

    if (!image) {
      return notFoundResponse('图片不存在');
    }

    const baseUrl = c.env.R2_PUBLIC_URL;

    const responseData = {
      image: {
        ...image,
        urls: {
          ...buildImageUrls({
            baseUrl,
            image,
            options: {
              generateWebp: !!image.paths.webp,
              generateAvif: !!image.paths.avif,
            },
          }),
        }
      }
    };

    // Store in cache
    await cache.set(cacheKey, responseData, CACHE_TTL.IMAGE_DETAIL);

    return successResponse(responseData);

  } catch (err) {
    console.error('Image detail handler error:', err);
    return errorResponse('获取图片详情失败');
  }
}

// PUT /api/images/:id - Update image metadata
export async function updateImageHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const id = c.req.param('id');

    if (!id || !isValidUUID(id)) {
      return errorResponse('无效的图片ID');
    }

    const body = await c.req.json();
    const metadata = new MetadataService(c.env.DB);

    // Build updates object
    const updates: { tags?: string[]; originalName?: string } = {};

    if (body.tags !== undefined) {
      if (body.tags === null) {
        updates.tags = [];
      } else if (Array.isArray(body.tags)) {
        const normalized = body.tags
          .map((tag: unknown) => sanitizeTagName(typeof tag === 'string' ? tag : String(tag)))
          .filter((tag: string) => tag.length > 0);
        updates.tags = Array.from(new Set(normalized));
      } else if (typeof body.tags === 'string') {
        updates.tags = Array.from(new Set(parseTags(body.tags)));
      } else {
        return errorResponse('tags must be a string, string[], or null');
      }
    }


    if (body.originalName !== undefined) {
      if (typeof body.originalName !== 'string' || body.originalName.trim().length === 0 || body.originalName.trim().length > 255) {
        return errorResponse('originalName must be a non-empty string (max 255 chars)');
      }
      updates.originalName = body.originalName.trim();
    }

    const updated = await metadata.updateImage(id, updates);

    if (!updated) {
      return notFoundResponse('图片不存在');
    }

    // Invalidate caches - always invalidate image list as any update may affect display
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.invalidateImageDetail(id);
    await cache.invalidateImagesList();
    // If tags changed, also invalidate tags list cache
    if (body.tags !== undefined) {
      await cache.invalidateTagsList();
    }

    const baseUrl = c.env.R2_PUBLIC_URL;

    return successResponse({
      image: {
        ...updated,
        urls: {
          ...buildImageUrls({
            baseUrl,
            image: updated,
            options: {
              generateWebp: !!updated.paths.webp,
              generateAvif: !!updated.paths.avif,
            },
          }),
        }
      }
    });

  } catch (err) {
    console.error('Update image handler error:', err);
    return errorResponse('更新图片失败');
  }
}

// DELETE /api/images/:id - Delete image
// D1 删除和缓存失效是同步的，R2 文件删除根据 USE_QUEUE 配置走 Queue 异步或同步处理
export async function deleteImageHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const id = c.req.param('id');

    if (!id || !isValidUUID(id)) {
      return errorResponse('无效的图片ID');
    }

    const metadataService = new MetadataService(c.env.DB);
    const image = await metadataService.getImage(id);

    if (!image) {
      return notFoundResponse('图片不存在');
    }

    const deletionTarget = toDeletionTarget(id, {
      original: image.paths.original,
      webp: image.paths.webp || undefined,
      avif: image.paths.avif || undefined,
    });

    // 1. 同步删除 D1 元数据并持久化 R2 删除任务，保证失败后可重试
    const deletedCount = await metadataService.deleteImagesWithDeletionJobs([deletionTarget]);
    if (deletedCount === 0) {
      return notFoundResponse('图片不存在');
    }

    // 2. 同步失效 KV 缓存（保证其他用户也不会看到已删除的图片）
    const cache = new CacheService(c.env.CACHE_KV);
    await Promise.all([
      cache.invalidateAfterImageChange(id),
      cache.invalidateTagsList(),
    ]);

    // 3. R2 文件删除放到后台；失败会保留 deletion_jobs 供 cron/cleanup 重试
    c.executionCtx.waitUntil(
      dispatchImageDeletions(c.env, [deletionTarget], id)
        .catch((err) => console.error('Background R2 deletion failed:', id, err))
    );

    return successResponse({ message: '图片已删除' });

  } catch (err) {
    console.error('Delete image handler error:', err);
    return errorResponse('删除图片失败');
  }
}


// POST /api/images/batch-delete - Batch delete images
export async function batchDeleteImagesHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json().catch(() => null);
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse('图片ID列表不能为空');
    }

    const stringIds = ids.filter((id: unknown): id is string => typeof id === 'string');
    if (stringIds.length !== ids.length || !stringIds.every(isValidUUID)) {
      return errorResponse('图片ID格式无效');
    }

    const normalizedIds = Array.from(new Set(stringIds));
    if (normalizedIds.length > MAX_BATCH_IMAGE_IDS) {
      return errorResponse(`一次最多删除 ${MAX_BATCH_IMAGE_IDS} 张图片`, 413);
    }

    const metadataService = new MetadataService(c.env.DB);
    const rows = await metadataService.getImagePathsByIds(normalizedIds);
    const targets = rows.map((row) => toDeletionTarget(row.id, {
      original: row.paths.original,
      webp: row.paths.webp || undefined,
      avif: row.paths.avif || undefined,
    }));

    if (targets.length === 0) {
      return successResponse({ deletedCount: 0, message: '没有找到要删除的图片' });
    }

    // 1. 同步删除 D1 元数据并持久化 R2 删除任务
    const deletedCount = await metadataService.deleteImagesWithDeletionJobs(targets);

    // 2. 同步失效 KV 缓存
    const cache = new CacheService(c.env.CACHE_KV);
    await Promise.all([
      cache.invalidateImagesList(),
      cache.invalidateTagsList(),
      cache.invalidateImageDetails(targets.map((t) => t.id)),
    ]);

    // 3. R2 文件删除放到后台；失败会保留 deletion_jobs 供 cron/cleanup 重试
    if (targets.length > 0) {
      c.executionCtx.waitUntil(
        dispatchImageDeletions(c.env, targets, 'batch')
          .catch((err) => console.error('Background batch R2 deletion failed:', err))
      );
    }

    return successResponse({ deletedCount, message: `已删除 ${deletedCount} 张图片` });
  } catch (err) {
    console.error('Batch delete error:', err);
    return errorResponse('批量删除失败');
  }
}
