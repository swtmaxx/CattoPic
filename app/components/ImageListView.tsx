"use client";

import type { MouseEvent } from "react";
import type { ImageFile } from "../types";
import { getFullUrl } from "../utils/baseUrl";
import { toCdnCgiImageUrl } from "../utils/cdnImage";
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

function thumbnailSrc(image: ImageFile): string {
  const base = getFullUrl(image.urls?.webp || image.urls?.original || "");
  if (!base) return "";
  const fmt = (image.format || "").toLowerCase();
  if (fmt === "gif" || fmt === "svg" || fmt === "avif") return base;
  return toCdnCgiImageUrl(base, { width: 128, quality: 75, format: "auto", fit: "scale-down" });
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

function MobileImageListCard({
  image,
  selected,
  onToggleSelect,
  onDelete,
  onRename,
  onView,
  thumbSize,
}: {
  image: ImageFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (image: ImageFile) => void;
  onView?: (image: ImageFile) => void;
  thumbSize: number;
}) {
  const previewHeight = Math.min(220, Math.max(112, thumbSize * 2));

  const stopAndRun = (event: MouseEvent, callback: () => void) => {
    event.stopPropagation();
    callback();
  };

  return (
    <article
      data-image-id={image.id}
      tabIndex={onView ? 0 : undefined}
      role={onView ? "button" : undefined}
      aria-label={onView ? `预览 ${image.originalName}` : image.originalName}
      onClick={() => onView?.(image)}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && onView) {
          event.preventDefault();
          onView(image);
        }
      }}
      className={`image-selectable image-list-card overflow-hidden ${
        selected
          ? "is-selected"
          : ""
      }`}
    >
      <div className="relative overflow-hidden bg-[var(--app-surface-muted)]" style={{ height: previewHeight }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailSrc(image)}
          alt={image.originalName}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/40 p-2">
          <button
            type="button"
            onClick={(event) => stopAndRun(event, () => onToggleSelect(image.id))}
            className={`selection-checkbox flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-md border-2 transition-colors ${
              selected ? "border-[var(--accent-500)] bg-[var(--accent-500)]" : "border-white bg-black/20"
            }`}
            aria-label={selected ? "取消选择" : "选择图片"}
          >
            {selected && <CheckIcon className="h-5 w-5 text-white" />}
          </button>
          <span className="rounded-full bg-slate-900/70 px-2 py-1 text-xs font-medium text-white">
            {getFormatLabel(image.format)}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-[var(--app-ink)]">{image.originalName}</h3>
            <p className="mt-1 truncate text-xs text-[var(--app-faint)]" title={image.id}>{image.id}</p>
          </div>
          <span className="format-chip shrink-0 px-2 py-1 text-xs font-medium">
            {getFormatLabel(image.format)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
          <span>{formatBytes(image.sizes?.original || 0)}</span>
          <span>{formatDate(image.uploadTime)}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {image.tags.length === 0 ? (
            <span className="text-xs text-[var(--app-faint)]">暂无标签</span>
          ) : (
            image.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="tag-chip max-w-full truncate px-1.5 py-0.5 text-xs">
                {tag}
              </span>
            ))
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--app-border)] pt-3">
          <button
            type="button"
            onClick={(event) => stopAndRun(event, () => onView?.(image))}
            className="btn-secondary min-h-11 px-2 text-xs"
            title="查看图片详情"
          >
            <EyeOpenIcon className="h-4 w-4" />
            <span>预览</span>
          </button>
          <button
            type="button"
            onClick={(event) => stopAndRun(event, () => onRename(image))}
            className="btn-secondary min-h-11 border-[var(--accent-200)] bg-[var(--accent-50)] px-2 text-xs text-[var(--accent-700)] hover:bg-[var(--accent-100)]"
          >
            重命名
          </button>
          <button
            type="button"
            onClick={(event) => stopAndRun(event, () => onDelete(image.id))}
            className="btn-secondary min-h-11 border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
            <span>删除</span>
          </button>
        </div>
      </div>
    </article>
  );
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
  return (
    <div className="image-list-shell overflow-hidden">
      <div className="space-y-3 p-3 sm:hidden">
        {images.map((image) => (
          <MobileImageListCard
            key={image.id}
            image={image}
            selected={selectedIds.has(image.id)}
            onToggleSelect={(id) => onToggleSelect(id)}
            onDelete={onDelete}
            onRename={onRename}
            onView={onView}
            thumbSize={thumbSize}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
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
                        src={thumbnailSrc(image)}
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
