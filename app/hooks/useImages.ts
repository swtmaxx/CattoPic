'use client';

import { useCallback, useMemo } from 'react';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { api } from '../utils/request';
import { ImageFile, ImageListResponse } from '../types';
import { queryKeys } from '../lib/queryKeys';

interface ImageDetailResponse {
  success: boolean;
  image: ImageFile;
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

interface UpdateResponse {
  success: boolean;
  image: ImageFile;
}

interface UseImagesOptions {
  tag?: string;
  orientation?: string;
  format?: string;
  search?: string;
  sort?: "upload_time" | "name" | "size";
  order?: "asc" | "desc";
  limit?: number;
  enabled?: boolean;
}

function matchesFilters(image: ImageFile, tag: string, orientation: string, format: string): boolean {
  const tagOk = !tag || image.tags.includes(tag);
  const orientationOk = !orientation || image.orientation === orientation;
  if (!tagOk || !orientationOk) return false;

  const urls = image.urls || { original: '', webp: '', avif: '' };
  const formatFilter = (format || 'all').toLowerCase();

  switch (formatFilter) {
    case 'all':
      return true;
    case 'gif':
      return (image.format || '').toLowerCase() === 'gif';
    case 'webp':
      return !!urls.webp;
    case 'avif':
      return !!urls.avif;
    case 'original':
      return !!urls.original && !urls.webp && !urls.avif;
    default:
      return true;
  }
}

function mergeFirstPageImages(
  existing: ImageFile[],
  additions: ImageFile[],
  limit: number
): { images: ImageFile[]; addedCount: number } {
  const seen = new Set<string>();
  const merged: ImageFile[] = [];

  for (const img of [...additions, ...existing]) {
    if (!img.id || seen.has(img.id)) continue;
    seen.add(img.id);
    merged.push(img);
    if (merged.length >= limit) break;
  }

  const existingIds = new Set(existing.map((i) => i.id));
  const addedCount = additions.filter((i) => i.id && !existingIds.has(i.id)).length;

  return { images: merged, addedCount };
}

// Hook for infinite scrolling image list
export function useInfiniteImages(options: UseImagesOptions = {}) {
  const { tag = '', orientation = '', format = 'all', search = '', sort = 'upload_time', order = 'desc', limit = 24, enabled = true } = options;
  const queryClient = useQueryClient();

  const recentUploads = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
  const recentMatches = recentUploads.filter((img) => matchesFilters(img, tag, orientation, format)).slice(0, limit);

  const placeholder = recentMatches.length > 0 ? ({
    pageParams: [1],
    pages: [
      {
        images: recentMatches,
        page: 1,
        total: recentMatches.length,
        totalPages: 1,
      },
    ],
  } satisfies InfiniteData<ImageListResponse>) : null;

  const query = useInfiniteQuery({
    queryKey: queryKeys.images.list({ tag, orientation, format, search, sort, order, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string> = {
        page: String(pageParam),
        limit: String(limit),
      };
      if (tag) params.tag = tag;
      if (orientation) params.orientation = orientation;
      if (format && format !== 'all') params.format = format;
      if (search) params.search = search;
      if (sort !== 'upload_time') params.sort = sort;
      if (order !== 'desc') params.order = order;

      const response = await api.get<ImageListResponse>('/api/images', params);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    ...(placeholder ? { placeholderData: placeholder } : {}),
    select: (data) => {
      const latestRecent = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
      const candidates = latestRecent.filter((img) => matchesFilters(img, tag, orientation, format));
      if (candidates.length === 0 || data.pages.length === 0) return data;

      const pending = new Set<string>();
      for (const candidate of candidates) {
        if (candidate.id) pending.add(candidate.id);
      }

      for (const page of data.pages) {
        if (pending.size === 0) break;
        for (const img of page.images) {
          if (pending.size === 0) break;
          if (img.id && pending.has(img.id)) pending.delete(img.id);
        }
      }

      const missingCount = pending.size;
      if (missingCount === 0) return data;

      const firstPage = data.pages[0];
      const total = Math.max(firstPage.total || 0, (firstPage.total || 0) + missingCount);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const { images: mergedFirst } = mergeFirstPageImages(firstPage.images, candidates, limit);

      return {
        ...data,
        pages: data.pages.map((p, idx) => idx === 0
          ? { ...p, images: mergedFirst, total, totalPages }
          : { ...p, total, totalPages }
        ),
      };
    },
  });

  // Flatten all pages into a single array
  const images = useMemo(
    () => query.data?.pages.flatMap((page) => page.images) || [],
    [query.data]
  );
  const total = query.data?.pages[0]?.total || 0;

  // Refetch all pages
  const refetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
  }, [queryClient]);

  return {
    images,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: refetchAll,
    error: query.error,
  };
}

// Hook for paginated image list (non-infinite)
export function useImages(options: UseImagesOptions & { page?: number } = {}) {
  const { page = 1, tag = '', orientation = '', format = 'all', search = '', sort = 'upload_time', order = 'desc', limit = 24, enabled = true } = options;
  const queryClient = useQueryClient();

  const recentUploads = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
  const recentMatches = page === 1
    ? recentUploads.filter((img) => matchesFilters(img, tag, orientation, format)).slice(0, limit)
    : [];
  const placeholder = recentMatches.length > 0 ? ({
    images: recentMatches,
    page: 1,
    total: recentMatches.length,
    totalPages: 1,
  } satisfies ImageListResponse) : null;

  const query = useQuery({
    queryKey: queryKeys.images.list({ page, tag, orientation, format, search, sort, order, limit }),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (tag) params.tag = tag;
      if (orientation) params.orientation = orientation;
      if (format && format !== 'all') params.format = format;

      return api.get<ImageListResponse>('/api/images', params);
    },
    staleTime: 5 * 60 * 1000,
    enabled,
    ...(placeholder ? { placeholderData: placeholder } : {}),
    select: (data) => {
      if (page !== 1) return data;
      const latestRecent = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
      const candidates = latestRecent.filter((img) => matchesFilters(img, tag, orientation, format));
      if (candidates.length === 0) return data;

      const existingIds = new Set(data.images.map((i) => i.id));
      const missingCount = candidates.reduce((acc, img) => {
        if (!img.id) return acc;
        return existingIds.has(img.id) ? acc : acc + 1;
      }, 0);
      if (missingCount === 0) return data;

      const total = Math.max(data.total || 0, (data.total || 0) + missingCount);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const { images: merged } = mergeFirstPageImages(data.images, candidates, limit);

      return { ...data, images: merged, total, totalPages };
    },
  });

  return {
    images: query.data?.images || [],
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 0,
    currentPage: query.data?.page || page,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook for single image detail
export function useImageDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.images.detail(id!),
    queryFn: async () => {
      const response = await api.get<ImageDetailResponse>(`/api/images/${id}`);
      return response.image;
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for deleting an image with optimistic update
export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<DeleteResponse>(`/api/images/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete image');
      }
      return { id, message: response.message };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.images.lists() });

      const previousLists = queryClient.getQueriesData({
        queryKey: queryKeys.images.lists(),
      });
      const previousRecentUploads = queryClient.getQueryData<ImageFile[]>(
        queryKeys.images.recentUploads()
      );

      queryClient.setQueryData<ImageFile[]>(queryKeys.images.recentUploads(), (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((img) => img.id !== id);
      });

      const isInfiniteImageList = (value: unknown): value is InfiniteData<ImageListResponse> => {
        return !!value
          && typeof value === 'object'
          && 'pages' in value
          && Array.isArray((value as { pages: unknown }).pages)
          && 'pageParams' in value
          && Array.isArray((value as { pageParams: unknown }).pageParams);
      };

      const isImageListResponse = (value: unknown): value is ImageListResponse => {
        return !!value
          && typeof value === 'object'
          && 'images' in value
          && Array.isArray((value as { images: unknown }).images)
          && 'page' in value
          && 'total' in value
          && 'totalPages' in value;
      };

      for (const [queryKey, data] of previousLists) {
        if (!data || !Array.isArray(queryKey) || queryKey.length < 3) continue;

        const filters = queryKey[2] as { limit?: number } | undefined;
        const limit = typeof filters?.limit === 'number' ? filters.limit : undefined;

        if (isInfiniteImageList(data)) {
          const hadImage = data.pages.some((p) => p.images.some((img) => img.id === id));
          if (!hadImage) continue;

          const firstPage = data.pages[0];
          const nextTotal = Math.max(0, (firstPage.total || 0) - 1);
          const nextTotalPages = limit ? Math.max(1, Math.ceil(nextTotal / limit)) : firstPage.totalPages;

          queryClient.setQueryData<InfiniteData<ImageListResponse>>(queryKey, {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              images: p.images.filter((img) => img.id !== id),
              total: nextTotal,
              totalPages: nextTotalPages,
            })),
          });
          continue;
        }

        if (isImageListResponse(data)) {
          const hadImage = data.images.some((img) => img.id === id);
          if (!hadImage) continue;

          const nextTotal = Math.max(0, (data.total || 0) - 1);
          const nextTotalPages = limit ? Math.max(1, Math.ceil(nextTotal / limit)) : data.totalPages;

          queryClient.setQueryData<ImageListResponse>(queryKey, {
            ...data,
            images: data.images.filter((img) => img.id !== id),
            total: nextTotal,
            totalPages: nextTotalPages,
          });
        }
      }

      queryClient.removeQueries({ queryKey: queryKeys.images.detail(id) });

      return { previousLists, previousRecentUploads };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      if (context?.previousRecentUploads !== undefined) {
        queryClient.setQueryData(queryKeys.images.recentUploads(), context.previousRecentUploads);
      }
    },
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.images.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list() });
    },
  });
}

// Hook for updating an image
export function useUpdateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { tags?: string[]; originalName?: string };
    }) => {
      const response = await api.put<UpdateResponse>(`/api/images/${id}`, data);
      if (!response.success) {
        throw new Error('Failed to update image');
      }
      return response.image;
    },
    onSuccess: (image) => {
      // Update detail cache
      queryClient.setQueryData(queryKeys.images.detail(image.id), image);
      // Invalidate lists (tags may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
      // Invalidate tags list
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list() });
    },
  });
}

// Hook for invalidating image caches after upload
export function useInvalidateImages() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
  }, [queryClient]);
}
