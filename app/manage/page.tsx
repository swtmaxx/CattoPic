"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { motion } from "motion/react";
import SelectionArea from "@viselect/vanilla";
import ImageFilters, { ImageFilterValues } from "../components/ImageFilters";
import ImageModal from "../components/ImageModal";
import VirtualImageMasonry from "../components/VirtualImageMasonry";
import ImageListView from "../components/ImageListView";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { ImageFile, StatusMessage } from "../types";
import ToastContainer, { showToast } from "../components/ToastContainer";
import TagManagementModal from "../components/TagManagementModal";
import BatchRemoveTagsModal from "../components/BatchRemoveTagsModal";
import RandomApiModal from "../components/RandomApiModal";
import { ImageIcon, Spinner, TrashIcon, TagIcon, CheckIcon, Cross1Icon, MagnifyingGlassIcon, Cross2Icon, CopyIcon, Link2Icon } from "../components/ui/icons";
import { useInfiniteImages, useDeleteImage, useUpdateImage } from "../hooks/useImages";
import { api } from "../utils/request";
import { queryKeys } from "../lib/queryKeys";
import { copyToClipboard } from "../utils/copyImageUtils";
import { getFullUrl } from "../utils/baseUrl";

export default function Manage() {
  useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, loading } = useSession();

  const [showTagModal, setShowTagModal] = useState(false);
  const [showBatchRemoveTagsModal, setShowBatchRemoveTagsModal] = useState(false);
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
  const suppressNextClickRef = useRef(false);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const selectionAreaRef = useRef<SelectionArea | null>(null);
  const selectionIdsRef = useRef<Set<string>>(new Set());
  const selectionMovedRef = useRef(false);
  const [batchCopyFormat, setBatchCopyFormat] = useState<"original" | "webp" | "avif">("webp");
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const selectionAnchorRef = useRef<number | null>(null);

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

  // Windows 文件资源管理器式选择：单击独选，Ctrl/Cmd 切换，Shift 选择范围。
  const handleImageSelect = useCallback((image: ImageFile, event: MouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    const index = images.findIndex((item) => item.id === image.id);
    if (index < 0) return;
    const additive = event.ctrlKey || event.metaKey;
    const range = event.shiftKey && selectionAnchorRef.current !== null;

    setSelectedIds((previous) => {
      if (range) {
        const anchor = selectionAnchorRef.current ?? index;
        const start = Math.min(anchor, index);
        const end = Math.max(anchor, index);
        const next = additive ? new Set(previous) : new Set<string>();
        for (let i = start; i <= end; i += 1) next.add(images[i].id);
        return next;
      }
      if (additive) {
        const next = new Set(previous);
        if (next.has(image.id)) next.delete(image.id);
        else next.add(image.id);
        return next;
      }
      return new Set([image.id]);
    });
    selectionAnchorRef.current = index;
    listContainerRef.current?.focus({ preventScroll: true });
  }, [images]);

  const toggleSelect = useCallback((id: string, event?: MouseEvent) => {
    const image = images.find((item) => item.id === id);
    if (image && event) {
      handleImageSelect(image, event);
      return;
    }
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [images, handleImageSelect]);

  // 框选交互由 viselect 直接在 DOM 层处理，避免 mousemove 期间触发 React 页面级重渲染。
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container || isLoading || images.length === 0 || !boxSelectMode) {
      selectionAreaRef.current?.destroy();
      selectionAreaRef.current = null;
      return;
    }

    const selection = new SelectionArea({
      selectionAreaClass: "viselect-selection-area",
      container,
      startAreas: [container],
      boundaries: [container],
      selectables: [".image-selectable"],
      behaviour: {
        intersect: "touch",
        overlap: "invert",
        startThreshold: { x: 8, y: 8 },
      },
      features: {
        // 普通点击仍交给图片卡片/列表行处理，框选只响应拖动。
        singleTap: { allow: false, intersect: "native" },
      },
    });

    const clearPreviewClasses = () => {
      container.querySelectorAll<HTMLElement>(".image-selectable.is-box-selected").forEach((element) => {
        element.classList.remove("is-box-selected");
      });
    };

    selection.on("beforestart", ({ event }) => {
      if (!event) return false;
      const target = event.target as Element | null;
      if (target?.closest("button, a, input, select, textarea")) return false;
      return true;
    });

    selection.on("start", ({ event }) => {
      const mouseEvent = event as MouseEvent | null;
      const additive = !!mouseEvent?.ctrlKey || !!mouseEvent?.metaKey;
      selectionMovedRef.current = false;
      selectionIdsRef.current = additive
        ? new Set(selectedIdsRef.current)
        : new Set<string>();

      // 清空库内上一次的内部选择，再将 Ctrl/Cmd 保留的项目导入。
      selection.clearSelection(true, true);
      if (additive && selectionIdsRef.current.size > 0) {
        const retained = selection
          .getSelectables()
          .filter((element) => selectionIdsRef.current.has(element.getAttribute("data-image-id") ?? ""));
        selection.select(retained, true);
      } else if (!additive) {
        clearPreviewClasses();
        setSelectedIds(new Set());
      }
    });

    selection.on("move", ({ store: { changed } }) => {
      selectionMovedRef.current = true;
      for (const element of changed.added) {
        const id = element.getAttribute("data-image-id");
        if (!id) continue;
        selectionIdsRef.current.add(id);
        element.classList.add("is-box-selected");
      }
      for (const element of changed.removed) {
        const id = element.getAttribute("data-image-id");
        if (!id) continue;
        selectionIdsRef.current.delete(id);
        element.classList.remove("is-box-selected");
      }

    });

    selection.on("stop", () => {
      if (selectionMovedRef.current) {
        suppressNextClickRef.current = true;
      }
      setSelectedIds(new Set(selectionIdsRef.current));
      clearPreviewClasses();
      selectionMovedRef.current = false;
    });

    selectionAreaRef.current = selection;
    const observer = new MutationObserver(() => selection.resolveSelectables());
    observer.observe(container, { childList: true, subtree: true });
    selection.resolveSelectables();

    return () => {
      observer.disconnect();
      selection.destroy();
      if (selectionAreaRef.current === selection) selectionAreaRef.current = null;
      clearPreviewClasses();
    };
  }, [boxSelectMode, images.length, isLoading, view]);

  useEffect(() => {
    selectionAreaRef.current?.resolveSelectables();
  }, [images, view, gridColumns]);

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
    selectionAnchorRef.current = images.length > 0 ? 0 : null;
    listContainerRef.current?.focus({ preventScroll: true });
  }, [images]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleImageDoubleClick = useCallback((image: ImageFile) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  }, []);

  const handleListKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setSelectedIds(new Set(images.map((image) => image.id)));
      selectionAnchorRef.current = images.length > 0 ? 0 : null;
    } else if (event.key === "Escape") {
      clearSelection();
      selectionAnchorRef.current = null;
    }
  }, [images, clearSelection]);

  const handleListBackgroundClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest("[data-image-id]")) {
      listContainerRef.current?.focus({ preventScroll: true });
      clearSelection();
      selectionAnchorRef.current = null;
    }
  }, [clearSelection]);

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



  const handleTagModalClose = useCallback(() => {
    setShowTagModal(false);
    if (authenticated) refetch();
  }, [authenticated, refetch]);

  const displayStatus = statusMsg || (queryError ? { type: "error" as const, message: "加载图片列表失败" } : null);

  // Keep the shared admin navigation mounted while the page data loads.
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-center items-center h-64">
          <Spinner className="h-10 w-10 text-indigo-500" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
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
            onClick={() => setShowTagModal(true)}
            className="px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <TagIcon className="h-4 w-4" />
            标签管理
          </button>
          <button
            onClick={() => setShowRandomApiModal(true)}
            className="px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <Link2Icon className="h-4 w-4" />
            随机API
          </button>
          <button
            onClick={() => {
              setBoxSelectMode((enabled) => !enabled);
            }}
            className={`px-4 py-3 text-sm font-medium transition-colors rounded-xl flex items-center gap-1.5 ${
              boxSelectMode
                ? "bg-green-500 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
            }`}
            title="开启后可拖动框选图片"
          >
            <CheckIcon className="h-4 w-4" />
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
            <button onClick={() => setShowBatchRemoveTagsModal(true)} className="px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-lg flex items-center gap-1.5">
              <TagIcon className="h-4 w-4" /> 批量删除标签
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
              <CopyIcon className="h-4 w-4" /> 复制选中链接
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
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            onClick={handleListBackgroundClick}
            className={`image-selection-container relative outline-none ${boxSelectMode ? "box-select-enabled select-none" : ""}`}
          >
          {images.length > 0 ? (
            <>
              {view === "grid" ? (
                <VirtualImageMasonry
                  images={images}
                  layoutKey={`${filters.format}:${filters.orientation}:${filters.tag}:${filters.search}:${filters.sort}:${filters.order}:${statusMsg?.type ?? ""}:${statusMsg?.message ?? ""}`}
                  onImageClick={handleImageSelect}
                  onImageDoubleClick={handleImageDoubleClick}
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
                  onSelect={handleImageSelect}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onView={handleImageDoubleClick}
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

      <BatchRemoveTagsModal
        isOpen={showBatchRemoveTagsModal}
        imageIds={Array.from(selectedIds)}
        onClose={() => setShowBatchRemoveTagsModal(false)}
        onSuccess={() => {
          setShowBatchRemoveTagsModal(false);
          clearSelection();
          queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
        }}
      />

      <RandomApiModal isOpen={showRandomApiModal} onClose={() => setShowRandomApiModal(false)} />
    </div>
  );
}
