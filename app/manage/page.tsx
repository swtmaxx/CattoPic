"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { motion } from "motion/react";
import ImageFilters, { ImageFilterValues } from "../components/ImageFilters";
import ImageModal from "../components/ImageModal";
import VirtualImageMasonry from "../components/VirtualImageMasonry";
import ImageListView from "../components/ImageListView";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { ImageFile, StatusMessage } from "../types";
import Header from "../components/Header";
import ToastContainer, { showToast } from "../components/ToastContainer";
import TagManagementModal from "../components/TagManagementModal";
import RandomApiModal from "../components/RandomApiModal";
import { ImageIcon, Spinner, TrashIcon, TagIcon, CheckIcon, Cross1Icon, MagnifyingGlassIcon, Cross2Icon, CopyIcon } from "../components/ui/icons";
import { useInfiniteImages, useDeleteImage, useUpdateImage } from "../hooks/useImages";
import { api } from "../utils/request";
import { queryKeys } from "../lib/queryKeys";
import { copyToClipboard, buildMarkdownLink } from "../utils/copyImageUtils";
import { getFullUrl } from "../utils/baseUrl";

export default function Manage() {
  useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, loading, logout } = useSession();

  const [showTagModal, setShowTagModal] = useState(false);
  const [showRandomApiModal, setShowRandomApiModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null);
  const [filters, setFilters] = useState<ImageFilterValues>({
    format: "all",
    orientation: "all",
    tag: "",
    search: "",
    sort: "upload_time",
    order: "desc",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState(4);
  const [listThumbSize, setListThumbSize] = useState(56);
  const [searchInput, setSearchInput] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boxSelectMode, setBoxSelectMode] = useState(false);
  const [batchCopyFormat, setBatchCopyFormat] = useState<"original" | "webp" | "avif">("webp");
  const [dragRect, setDragRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; active: boolean } | null>(null);
  const dragRectRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const authenticated = status?.authenticated === true;

  // TanStack Query hooks
  const {
    images,
    total: totalImages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: queryError,
  } = useInfiniteImages({
    tag: filters.tag || undefined,
    orientation: filters.orientation === "all" ? undefined : filters.orientation,
    format: filters.format,
    search: filters.search || undefined,
    sort: filters.sort,
    order: filters.order,
    limit: 60,
    enabled: authenticated,
  });

  const deleteImageMutation = useDeleteImage();
  const updateImageMutation = useUpdateImage();

  // 登录守卫
  useEffect(() => {
    if (loading) return;
    if (status?.needsSetup) {
      router.replace("/admin/setup");
      return;
    }
    if (!status?.authenticated) {
      router.replace("/admin/login");
    }
  }, [status, loading, router]);

  // 切换选择
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value.trim() }));
    }, 350);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }, [images]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCopyAllMarkdown = useCallback(async () => {
    if (images.length === 0) {
      showToast("暂无图片可复制", "error");
      return;
    }

    const markdown = images
      .map((image) => {
        const url = getFullUrl(image.urls?.webp || image.urls?.original || "");
        return buildMarkdownLink(url, image.originalName);
      })
      .join("\n");

    const success = await copyToClipboard(markdown);
    if (success) {
      showToast(`已复制 ${images.length} 张图片的 Markdown 链接`, "success");
    } else {
      showToast("复制失败", "error");
    }
  }, [images]);

  const handleCopyAllUrls = useCallback(async () => {
    if (images.length === 0) {
      showToast("暂无图片可复制", "error");
      return;
    }

    const urls = images
      .map((image) => getFullUrl(image.urls?.webp || image.urls?.original || ""))
      .join("\n");

    const success = await copyToClipboard(urls);
    if (success) {
      showToast(`已复制 ${images.length} 条链接`, "success");
    } else {
      showToast("复制失败", "error");
    }
  }, [images]);

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (!boxSelectMode && target.closest("[data-image-id]")) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, active: true };
    e.preventDefault();
    const rect = { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY };
    dragRectRef.current = rect;
    setDragRect(rect);
  }, [boxSelectMode]);

  const handleDragMouseMove = useCallback((e: React.MouseEvent) => {
    const state = dragStateRef.current;
    if (!state?.active) return;
    const rect = { x1: state.startX, y1: state.startY, x2: e.clientX, y2: e.clientY };
    dragRectRef.current = rect;
    setDragRect(rect);
  }, []);

  const handleDragMouseUp = useCallback(() => {
    const state = dragStateRef.current;
    if (!state?.active) return;
    state.active = false;
    const rect = dragRectRef.current;
    setDragRect(null);
    if (!rect) return;
    const moved = Math.abs(rect.x2 - rect.x1) > 5 || Math.abs(rect.y2 - rect.y1) > 5;
    if (!moved) return;

    suppressNextClickRef.current = true;
    const container = listContainerRef.current;
    if (!container) return;
    const els = container.querySelectorAll<HTMLElement>("[data-image-id]");
    const selected = new Set<string>();
    const rx1 = Math.min(rect.x1, rect.x2);
    const rx2 = Math.max(rect.x1, rect.x2);
    const ry1 = Math.min(rect.y1, rect.y2);
    const ry2 = Math.max(rect.y1, rect.y2);
    els.forEach((el) => {
      const id = el.getAttribute("data-image-id");
      if (!id) return;
      const r = el.getBoundingClientRect();
      if (r.left < rx2 && r.right > rx1 && r.top < ry2 && r.bottom > ry1) {
        selected.add(id);
      }
    });
    if (selected.size > 0) {
      setSelectedIds(selected);
    }
  }, []);

  const handleDragMouseLeave = useCallback(() => {
    if (dragStateRef.current?.active) {
      dragStateRef.current.active = false;
      dragRectRef.current = null;
      setDragRect(null);
    }
  }, []);

  const handleImageClick = useCallback((image: ImageFile) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (boxSelectMode) {
      toggleSelect(image.id);
      return;
    }
    setSelectedImage(image);
    setIsModalOpen(true);
  }, [boxSelectMode, toggleSelect]);

  const handleBatchCopyLinks = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const items = images.filter((img) => selectedIds.has(img.id));
    if (items.length === 0) return;
    const urls = items.map((img) => {
      const url =
        batchCopyFormat === "original"
          ? img.urls?.original
          : batchCopyFormat === "webp"
          ? img.urls?.webp
          : img.urls?.avif;
      return getFullUrl(url || img.urls?.original || "");
    });
    const ok = await copyToClipboard(urls.join("\n"));
    const label = batchCopyFormat === "original" ? "原图" : batchCopyFormat === "webp" ? "WebP" : "AVIF";
    if (ok) {
      showToast(`已复制 ${items.length} 条${label}链接`, "success");
    } else {
      showToast("复制失败", "error");
    }
  }, [selectedIds, images, batchCopyFormat]);

  const removeSelectedFromCache = useCallback(() => {
    queryClient.setQueryData<ImageFile[]>(queryKeys.images.recentUploads(), (old) => {
      if (!Array.isArray(old)) return old;
      return old.filter((img) => !selectedIds.has(img.id));
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.list() });
    setSelectedIds(new Set());
  }, [queryClient, selectedIds]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!window.confirm(`确定删除选中的 ${ids.length} 张图片吗？此操作不可恢复。`)) return;
    try {
      const res = await api.post<{ success: boolean; deletedCount: number; message?: string }>("/api/images/batch-delete", { ids });
      if (!res.success) throw new Error(res.message || "批量删除失败");
      showToast(`已删除 ${res.deletedCount} 张图片`, "success");
      removeSelectedFromCache();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "批量删除失败", "error");
    }
  }, [selectedIds, removeSelectedFromCache]);

  // 批量打标签
  const handleBatchTag = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const input = window.prompt("输入要添加的标签（多个用逗号分隔）：");
    if (input === null) return;
    const tags = input.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    try {
      const res = await api.post<{ success: boolean; updatedCount?: number }>("/api/tags/batch", {
        imageIds: Array.from(selectedIds),
        addTags: tags,
        removeTags: [],
      });
      if (!res.success) throw new Error("批量打标签失败");
      showToast(`已为 ${res.updatedCount ?? selectedIds.size} 张图片添加标签`, "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "批量打标签失败", "error");
    }
  }, [selectedIds, queryClient]);

  // 单张删除
  const handleDelete = useCallback(async (id: string) => {
    deleteImageMutation.mutate(id, {
      onError: () => {
        setStatusMsg({ type: "error", message: "删除失败，已恢复" });
      },
    });
  }, [deleteImageMutation]);

  // 重命名
  const handleRename = useCallback((image: ImageFile) => {
    const name = window.prompt("输入新的文件名：", image.originalName);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === image.originalName) return;
    updateImageMutation.mutate(
      { id: image.id, data: { originalName: trimmed } },
      {
        onSuccess: () => showToast("重命名成功", "success"),
        onError: () => showToast("重命名失败", "error"),
      }
    );
  }, [updateImageMutation]);


  const handleLogout = useCallback(async () => {
    await logout();
    queryClient.clear();
    router.replace("/admin/login");
  }, [logout, queryClient, router]);

  const handleTagModalClose = useCallback(() => {
    setShowTagModal(false);
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  const displayStatus = statusMsg || (queryError ? { type: "error" as const, message: "加载图片列表失败" } : null);

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-10 w-10 text-indigo-500" />
      </div>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Header
        onTagManageClick={() => setShowTagModal(true)}
        onRandomApiClick={() => setShowRandomApiModal(true)}
        onLogoutClick={handleLogout}
        title="CattoPic"
        authenticated
      />

      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin" className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
          返回后台
        </Link>
        <Link href="/" className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
          上传页
        </Link>
      </div>
      <ToastContainer />

      {displayStatus && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-8 p-4 rounded-xl ${
            displayStatus.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {displayStatus.message}
        </motion.div>
      )}

      {/* 搜索 + 视图切换 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索文件名..."
            className="w-full px-4 py-3 pl-10 pr-9 rounded-xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
          />
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => void handleCopyAllUrls()}
            disabled={images.length === 0}
            className="px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
            title="复制当前列表全部图片的链接"
          >
            <CopyIcon className="h-4 w-4" />
            复制全部链接
          </button>
          <button
            onClick={() => void handleCopyAllMarkdown()}
            disabled={images.length === 0}
            className="px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
            title="复制当前列表全部图片的 Markdown 链接"
          >
            <CopyIcon className="h-4 w-4" />
            复制全部 Markdown
          </button>
          <button
            onClick={() => setBoxSelectMode((v) => !v)}
            className={`px-4 py-3 text-sm font-medium transition-colors rounded-xl ${
              boxSelectMode
                ? "bg-green-500 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
            }`}
            title="开启批量管理模式：拖拽框选，点击图片切换选择"
          >
            批量管理
          </button>
          <div className="flex rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm">
            <button
              onClick={() => setView("grid")}
              className={`px-4 py-3 text-sm font-medium transition-colors ${view === "grid" ? "bg-indigo-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >
              网格
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-3 text-sm font-medium transition-colors ${view === "list" ? "bg-indigo-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >
              列表
            </button>
          </div>

          {/* 大小调节滑块：网格=列数，列表=缩略图尺寸 */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200/80 dark:border-gray-700 px-4 py-2.5 shadow-sm">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {view === "grid" ? "卡片大小" : "缩略图"}
            </span>
            <input
              type="range"
              min={view === "grid" ? 1 : 40}
              max={view === "grid" ? 6 : 120}
              step={view === "grid" ? 1 : 8}
              value={view === "grid" ? gridColumns : listThumbSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (view === "grid") setGridColumns(v);
                else setListThumbSize(v);
              }}
              className="w-32 accent-indigo-500"
            />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300 w-14 text-right whitespace-nowrap">
              {view === "grid" ? `${gridColumns} 列` : `${listThumbSize}px`}
            </span>
          </div>
        </div>
      </div>

      <ImageFilters
        onFilterChange={setFilters}
        search={filters.search}
        onSearchChange={(v) => setFilters((prev) => ({ ...prev, search: v }))}
      />

      {/* 批量操作栏 */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
              {selectedCount}
            </span>
            已选择 {selectedCount} 张
          </div>
          <div className="flex items-center gap-2">
            <button onClick={selectAllVisible} className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4" /> 全选当前
            </button>
            <button onClick={clearSelection} className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-1.5">
              <Cross1Icon className="h-4 w-4" /> 取消选择
            </button>
            <button onClick={handleBatchTag} className="px-3 py-2 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg flex items-center gap-1.5">
              <TagIcon className="h-4 w-4" /> 批量打标签
            </button>
            <select
              value={batchCopyFormat}
              onChange={(e) => setBatchCopyFormat(e.target.value as "original" | "webp" | "avif")}
              className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
              title="选择复制链接的格式"
            >
              <option value="original">原图</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
            </select>
            <button onClick={() => void handleBatchCopyLinks()} className="px-3 py-2 text-sm bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-300 rounded-lg flex items-center gap-1.5">
              <CopyIcon className="h-4 w-4" /> 复制链接
            </button>
            <button onClick={handleBatchDelete} className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1.5">
              <TrashIcon className="h-4 w-4" /> 批量删除
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner className="h-12 w-12 text-indigo-500" />
        </div>
      ) : (
        <>
          <div
            ref={listContainerRef}
            onMouseDown={handleDragMouseDown}
            onMouseMove={handleDragMouseMove}
            onMouseUp={handleDragMouseUp}
            onMouseLeave={handleDragMouseLeave}
            className="relative select-none"
          >
          {images.length > 0 ? (
            <>
              {view === "grid" ? (
                <VirtualImageMasonry
                  images={images}
                  layoutKey={`${filters.format}:${filters.orientation}:${filters.tag}:${filters.search}:${filters.sort}:${filters.order}:${statusMsg?.type ?? ""}:${statusMsg?.message ?? ""}`}
                  onImageClick={handleImageClick}
                  onDelete={handleDelete}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  selectable
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  lanesOverride={gridColumns}
                />
              ) : (
                <ImageListView
                  images={images}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onView={handleImageClick}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  thumbSize={listThumbSize}
                />
              )}
              {isFetchingNextPage && (
                <div className="flex justify-center items-center py-8">
                  <Spinner className="h-8 w-8 text-indigo-500" />
                  <span className="ml-2 text-indigo-500">加载更多图片...</span>
                </div>
              )}
              {!isLoading && !isFetchingNextPage && images.length > 0 && !hasNextPage && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  已加载全部图片 ({totalImages}张)
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.08),0_4px_24px_-8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_12px_-3px_rgba(0,0,0,0.3)] p-8 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
              <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">暂无图片</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">请上传图片或调整筛选条件</p>
            </div>
          )}
          {dragRect && (
            <div
              className="fixed z-50 pointer-events-none border-2 border-green-500 bg-green-500/20"
              style={{
                left: Math.min(dragRect.x1, dragRect.x2),
                top: Math.min(dragRect.y1, dragRect.y2),
                width: Math.abs(dragRect.x2 - dragRect.x1),
                height: Math.abs(dragRect.y2 - dragRect.y1),
              }}
            />
          )}
          </div>
        </>
      )}

      <ImageModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={() => {
          setSelectedImage(null);
          setIsModalOpen(false);
        }}
        onDelete={handleDelete}
        onRename={(image) => handleRename(image as ImageFile)}
      />

      <TagManagementModal isOpen={showTagModal} onClose={handleTagModalClose} />

      <RandomApiModal isOpen={showRandomApiModal} onClose={() => setShowRandomApiModal(false)} />
    </div>
  );
}
