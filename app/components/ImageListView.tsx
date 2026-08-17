"use client";

import type { MouseEvent } from "react";
import type { ImageFile } from "../types";
import { useImagePreviewSettings } from "../hooks/useImagePreviewSettings";
import { getImagePreviewUrl } from "../utils/imagePreview";
import { getFormatLabel } from "../utils/imageUtils";
import { CheckIcon, TrashIcon, EyeOpenIcon } from "./ui/icons";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function thumbnailSrc(image: ImageFile, useCdnCgiPreview: boolean): string {
  return getImagePreviewUrl(image, {
    useCdnCgi: useCdnCgiPreview,
    width: 128,
    quality: 75,
  });
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

interface ImageListViewProps {
  images: ImageFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, event?: MouseEvent) => void;
  onDelete: (id: string) => void;
  onRename: (image: ImageFile) => void;
  onView?: (image: ImageFile) => void;
  onSelect?: (image: ImageFile, event: MouseEvent) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  /** 缩略图尺寸（px），用于"大小调节"滑块 */
  thumbSize?: number;
}

export default function ImageListView({
  images,
  selectedIds,
  onToggleSelect,
  onDelete,
  onRename,
  onView,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  thumbSize = 56,
}: ImageListViewProps) {
  const { useCdnCgiPreview } = useImagePreviewSettings();

  return (
    <div className="image-list-shell overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-muted)]">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">图片</th>
              <th className="px-4 py-3">格式</th>
              <th className="px-4 py-3">大小</th>
              <th className="px-4 py-3">上传时间</th>
              <th className="px-4 py-3">标签</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image) => {
              const selected = selectedIds.has(image.id);
              return (
                <tr
                  key={image.id}
                  data-image-id={image.id}
                  className={`image-selectable cursor-pointer border-b border-[var(--app-border)] transition-colors hover:bg-[var(--app-surface-muted)] ${
                    selected ? "is-selected" : ""
                  }`}
                  onClick={(event) => onSelect?.(image, event)}
                >
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleSelect(image.id)}
                      className={`selection-checkbox flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-md border-2 transition-colors ${
                        selected ? "border-[var(--accent-500)] bg-[var(--accent-500)]" : "border-[var(--app-border-strong)] bg-[var(--app-surface)]"
                      }`}
                      aria-label={selected ? "取消选择" : "选择图片"}
                    >
                      {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnailSrc(image, useCdnCgiPreview)}
                        alt={image.originalName}
                        className="rounded-lg border border-[var(--app-border)] object-cover"
                        style={{ width: thumbSize, height: thumbSize }}
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="max-w-[240px] truncate font-medium text-[var(--app-ink)]" title={image.originalName}>
                          {image.originalName}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--app-faint)]">{image.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="format-chip rounded-full px-2 py-1 text-xs font-medium">
                      {getFormatLabel(image.format)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--app-muted)]">{formatBytes(image.sizes?.original || 0)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-[var(--app-muted)]">{formatDate(image.uploadTime)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {image.tags.length === 0 ? (
                        <span className="text-xs text-[var(--app-faint)]">-</span>
                      ) : (
                        image.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag-chip px-1.5 py-0.5 text-xs">
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView?.(image)}
                        className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        title="查看图片详情"
                      >
                        <EyeOpenIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRename(image)}
                        className="min-h-11 rounded-lg px-2 py-1 text-xs text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                      >
                        重命名
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(image.id)}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="p-4 text-center">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="min-h-11 rounded-lg bg-green-50 px-5 py-2 text-sm font-medium text-green-600 hover:bg-green-100 disabled:opacity-60 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
          >
            {isFetchingNextPage ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
