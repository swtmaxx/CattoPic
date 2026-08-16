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
import { ImageFile, StatusMessage } from "../types";
import ToastContainer, { showToast } from "../components/ToastContainer";
import TagManagementModal from "../components/TagManagementModal";
import BatchRemoveTagsModal from "../components/BatchRemoveTagsModal";
import RandomApiModal from "../components/RandomApiModal";
import { ImageIcon, Spinner, TrashIcon, TagIcon, CheckIcon, Cross1Icon, MagnifyingGlassIcon, Cross2Icon, CopyIcon, Link2Icon } from "../components/ui/icons";
import { useInfiniteImages, useDeleteImage, useUpdateImage } from "../hooks/useImages";
import { api } from "../utils/request";
import { queryKeys } from "../lib/queryKeys";
import {
  copyToClipboard,
  getImageLink,
  IMAGE_LINK_FORMATS,
  type ImageLinkFormat,
} from "../utils/copyImageUtils";

export default function Manage() {
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
  const [gridGapless, setGridGapless] = useState(false);
  const [listThumbSize, setListThumbSize] = useState(56);
  const [searchInput, setSearchInput] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boxSelectMode, setBoxSelectMode] = useState(false);
  const suppressNextClickRef = useRef(false);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const selectionAreaRef = useRef<SelectionArea | null>(null);
  const selectionIdsRef = useRef<Set<string>>(new Set());
  const selectionMovedRef = useRef(false);
  const [batchCopyFormat, setBatchCopyFormat] = useState<ImageLinkFormat>("webp");
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const authenticated = status?.authenticated === true;
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

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

  // 图片管理恢复为单击打开详情；批量选择由复选框和框选负责。
  const handleImageSelect = useCallback((image: ImageFile) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    setSelectedImage(image);
    setIsModalOpen(true);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 框选交互由 viselect 直接在 DOM 层处理，避免 mousemove 期间触发 React 页面级重渲染。
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container || isLoading || images.length === 0 || !boxSelectMode || (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches)) {
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
    } else if (event.key === "Escape") {
      clearSelection();
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
    }
  }, [clearSelection]);

  const handleBatchCopyLinks = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const items = images.filter((img) => selectedIds.has(img.id));
    if (items.length === 0) return;
    const urls = items
      .map((img) => getImageLink(img, batchCopyFormat))
      .filter(Boolean);
    if (urls.length === 0) {
      const label = IMAGE_LINK_FORMATS.find((item) => item.value === batchCopyFormat)?.label || batchCopyFormat;
      showToast(`${label}链接不可用`, "error");
      return;
    }

    const ok = await copyToClipboard(urls.join("\n"));
    const label = IMAGE_LINK_FORMATS.find((item) => item.value === batchCopyFormat)?.label || batchCopyFormat;
    if (ok) {
      const skippedCount = items.length - urls.length;
      const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount} 张不可用图片` : "";
      showToast(`已复制 ${urls.length} 条${label}链接${skippedText}`, "success");
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
      <div className="manage-page max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
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
    <div className="manage-page app-page max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
      <ToastContainer />

      <div className="page-heading">
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="page-title">图片管理</h1>
          <p className="page-subtitle">浏览、筛选并处理已上传的图片资源。</p>
        </div>
        <div className="toolbar-count">{totalImages} 张图片</div>
      </div>

      <ImageFilters
        onFilterChange={setFilters}
        search={filters.search}
      />

      {displayStatus && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`status-panel mb-6 ${
            displayStatus.type === "success"
              ? "success"
              : "error"
          }`}
        >
          {displayStatus.message}
        </motion.div>
      )}

      {/* 搜索 + 视图切换 */}
      <div className="manage-toolbar mb-4 sm:mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索文件名..."
            className="input-primary px-4 py-3 pl-10 pr-9 placeholder:text-[var(--app-faint)]"
          />
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="btn-icon absolute right-1 top-1/2 h-9 w-9 min-h-9 min-w-9 -translate-y-1/2"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setShowTagModal(true)}
            className="btn-secondary px-3 py-2.5 sm:px-4"
          >
            <TagIcon className="h-4 w-4" />
            标签管理
          </button>
          <button
            onClick={() => setShowRandomApiModal(true)}
            className="btn-secondary px-3 py-2.5 sm:px-4"
          >
            <Link2Icon className="h-4 w-4" />
            随机API
          </button>
          <button
            onClick={() => {
              setBoxSelectMode((enabled) => !enabled);
            }}
            className={`btn-secondary px-3 py-2.5 sm:px-4 ${
              boxSelectMode
                ? "border-[var(--accent-600)] bg-[var(--accent-600)] text-white hover:bg-[var(--accent-700)]"
                : ""
            }`}
            title={isTouchDevice ? "开启后使用点击和复选框批量选择" : "开启后可拖动框选图片"}
          >
            <CheckIcon className="h-4 w-4" />
            <span className="hidden sm:inline">批量管理</span>
            <span className="sm:hidden">批量选择</span>
          </button>
          <div className="view-switcher flex overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={view === "grid" ? "is-active" : ""}
            >
              网格
            </button>
            <button
              onClick={() => setView("list")}
              className={view === "list" ? "is-active" : ""}
            >
              列表
            </button>
          </div>

          {view === "grid" && (
            <div className="view-switcher flex overflow-hidden" aria-label="网格间距">
              <button
                type="button"
                onClick={() => setGridGapless(false)}
                className={!gridGapless ? "is-active" : ""}
                aria-pressed={!gridGapless}
                title="保留卡片间距"
              >
                有间距
              </button>
              <button
                type="button"
                onClick={() => setGridGapless(true)}
                className={gridGapless ? "is-active" : ""}
                aria-pressed={gridGapless}
                title="移除卡片间距"
              >
                无间距
              </button>
            </div>
          )}

          {/* 大小调节滑块：网格=列数，列表=缩略图尺寸 */}
          <div className="toolbar-control flex min-h-11 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
            <span className="whitespace-nowrap text-sm text-[var(--app-muted)]">
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
              className="w-24 accent-[var(--accent-600)] sm:w-32"
            />
            <span className="w-14 whitespace-nowrap text-right text-sm font-semibold text-[var(--accent-600)]">
              {view === "grid" ? `${gridColumns} 列` : `${listThumbSize}px`}
            </span>
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="batch-toolbar mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--app-ink)]">
            <span className="batch-count inline-flex items-center justify-center">
              {selectedCount}
            </span>
            已选择 {selectedCount} 张
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button onClick={selectAllVisible} className="btn-secondary shrink-0 px-3 py-2">
              <CheckIcon className="h-4 w-4" /> <span className="hidden sm:inline">全选当前</span><span className="sm:hidden">全选</span>
            </button>
            <button onClick={clearSelection} className="btn-secondary shrink-0 px-3 py-2">
              <Cross1Icon className="h-4 w-4" /> <span className="hidden sm:inline">取消选择</span><span className="sm:hidden">取消</span>
            </button>
            <button onClick={handleBatchTag} className="btn-secondary shrink-0 border-[var(--accent-200)] bg-[var(--accent-50)] px-3 py-2 text-[var(--accent-700)] hover:bg-[var(--accent-100)]">
              <TagIcon className="h-4 w-4" /> <span className="hidden sm:inline">批量打标签</span><span className="sm:hidden">加标签</span>
            </button>
            <button onClick={() => setShowBatchRemoveTagsModal(true)} className="btn-secondary shrink-0 px-3 py-2 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30">
              <TagIcon className="h-4 w-4" /> <span className="hidden sm:inline">批量删除标签</span><span className="sm:hidden">删标签</span>
            </button>
            <select
              value={batchCopyFormat}
              onChange={(e) => setBatchCopyFormat(e.target.value as ImageLinkFormat)}
              className="input-primary min-h-11 w-auto shrink-0 px-2 py-2"
              title="选择复制链接的格式"
            >
              <option value="original">原图</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
            </select>
            <button onClick={() => void handleBatchCopyLinks()} className="btn-secondary shrink-0 border-[var(--accent-200)] bg-[var(--accent-50)] px-3 py-2 text-[var(--accent-700)] hover:bg-[var(--accent-100)]">
              <CopyIcon className="h-4 w-4" /> <span className="hidden sm:inline">复制选中链接</span><span className="sm:hidden">复制</span>
            </button>
            <button onClick={handleBatchDelete} className="btn-secondary shrink-0 border-red-200 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <TrashIcon className="h-4 w-4" /> <span className="hidden sm:inline">批量删除</span><span className="sm:hidden">删除</span>
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
                  layoutKey={`${filters.format}:${filters.orientation}:${filters.tag}:${filters.search}:${filters.sort}:${filters.order}:${gridGapless ? "gapless" : "gapped"}:${statusMsg?.type ?? ""}:${statusMsg?.message ?? ""}`}
                  onImageClick={handleImageSelect}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  selectable
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  lanesOverride={gridColumns}
                  gapless={gridGapless}
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
                  <Spinner className="h-8 w-8 text-[var(--accent-600)]" />
                  <span className="ml-2 text-[var(--accent-600)]">加载更多图片...</span>
                </div>
              )}
              {!isLoading && !isFetchingNextPage && images.length > 0 && !hasNextPage && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  已加载全部图片 ({totalImages}张)
                </div>
              )}
            </>
          ) : (
            <div className="card flex h-64 flex-col items-center justify-center p-8 text-[var(--app-muted)]">
              <div className="mb-4 rounded-lg bg-[var(--app-surface-muted)] p-4">
                <ImageIcon className="h-10 w-10 text-[var(--app-faint)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--app-ink)]">暂无图片</p>
              <p className="mt-2 text-sm text-[var(--app-faint)]">请上传图片或调整筛选条件</p>
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
