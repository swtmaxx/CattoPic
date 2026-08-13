"use client";

import type { ImageFile } from "../types";
import { getFullUrl } from "../utils/baseUrl";
import { getFormatLabel, getOrientationLabel } from "../utils/imageUtils";
import { CheckIcon, TrashIcon } from "./ui/icons";

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
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (image: ImageFile) => void;
  onExpiry: (image: ImageFile) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

export default function ImageListView({
  images,
  selectedIds,
  onToggleSelect,
  onDelete,
  onRename,
  onExpiry,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ImageListViewProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">图片</th>
              <th className="px-4 py-3">格式</th>
              <th className="px-4 py-3">方向</th>
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
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${
                    selected ? "bg-indigo-50/60 dark:bg-indigo-900/20" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onToggleSelect(image.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selected ? "bg-indigo-500 border-indigo-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getFullUrl(image.urls?.original || "")}
                        alt={image.originalName}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[240px]" title={image.originalName}>
                          {image.originalName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{image.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      {getFormatLabel(image.format)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{getOrientationLabel(image.orientation)}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{formatBytes(image.sizes?.original || 0)}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(image.uploadTime)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {image.tags.length === 0 ? (
                        <span className="text-xs text-gray-400">-</span>
                      ) : (
                        image.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRename(image)}
                        className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        重命名
                      </button>
                      <button
                        onClick={() => onExpiry(image)}
                        className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        过期
                      </button>
                      <button
                        onClick={() => onDelete(image.id)}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
            className="px-5 py-2 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg font-medium disabled:opacity-60"
          >
            {isFetchingNextPage ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
