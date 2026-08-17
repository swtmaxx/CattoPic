"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from 'motion/react';
import { ImageFile } from "../types";
import { ImageData } from "../types/image";
import { api } from "../utils/request";
import { ImageInfo } from "./ImageInfo";
import { ImageUrls } from "./ImageUrls";
import { DeleteConfirm } from "./DeleteConfirm";
import { CheckIcon, Cross1Icon, PlusIcon, Spinner, TagIcon, TrashIcon } from "./ui/icons";

// 统一的图片类型，可以接受管理界面和上传界面的两种不同图片对象
type ImageType = ImageFile | (ImageData & { status: 'success' });
const EMPTY_TAGS: string[] = [];

interface ImageModalProps {
  image: ImageType | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onRename?: (image: ImageType) => void;
  onUpdateTags?: (id: string, tags: string[]) => Promise<ImageType | void>;
}

export default function ImageModal({ image, isOpen, onClose, onDelete, onRename, onUpdateTags }: ImageModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const imageId = image?.id ?? null;
  const imageTags = image?.tags ?? EMPTY_TAGS;

  useEffect(() => {
    if (!isOpen || !imageId) return;
    setEditingTags(imageTags);
    setIsEditingTags(false);
    setTagInput("");
    setTagError(null);
  }, [isOpen, imageId, imageTags]);

  useEffect(() => {
    if (!isEditingTags || !onUpdateTags) return;

    let cancelled = false;
    setIsLoadingTags(true);
    void api.get<{ success: boolean; tags?: { name: string }[]; error?: string }>("/api/tags")
      .then((response) => {
        if (cancelled) return;
        if (!response.success) {
          setTagError(response.error || "获取标签列表失败");
          return;
        }
        setAvailableTags((response.tags || []).map((tag) => tag.name));
      })
      .catch((error) => {
        if (!cancelled) {
          setTagError(error instanceof Error ? error.message : "获取标签列表失败");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTags(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditingTags, onUpdateTags]);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    setIsEditingTags(false);
    setTagInput("");
    setTagError(null);
    onClose();
  };

  const addTag = (rawTag: string) => {
    const tag = rawTag.trim();
    if (!tag) return;

    setEditingTags((current) => (
      current.some((item) => item.toLowerCase() === tag.toLowerCase())
        ? current
        : [...current, tag]
    ));
    setTagInput("");
    setTagError(null);
  };

  const removeTag = (tag: string) => {
    setEditingTags((current) => current.filter((item) => item !== tag));
    setTagError(null);
  };

  const handleSaveTags = async () => {
    if (!image?.id || !onUpdateTags) return;

    const nextTags = Array.from(new Set(editingTags.map((tag) => tag.trim()).filter(Boolean)));
    setIsSavingTags(true);
    setTagError(null);

    try {
      const updated = await onUpdateTags(image.id, nextTags);
      setEditingTags(updated?.tags ?? nextTags);
      setIsEditingTags(false);
    } catch (error) {
      setTagError(error instanceof Error ? error.message : "保存标签失败");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleDelete = () => {
    if (!image || !onDelete || !image.id) return;

    // 立即关闭弹窗，乐观更新会处理 UI
    setShowDeleteConfirm(false);
    handleClose();

    // 触发删除，不等待结果
    onDelete(image.id).catch((err) => {
      console.error("删除失败:", err);
    });
  };

  if (!image) return null;

  // 判断是否有可删除的功能
  const canDelete = onDelete && image.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="modal-dialog relative max-h-[85vh] w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-4">
                  <h3 className="truncate text-lg font-semibold leading-tight text-[var(--app-ink)]">
                    {image.originalName}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">图片详情</p>
                </div>
                <button
                  className="btn-icon h-10 w-10 min-h-10 min-w-10 shrink-0"
                  onClick={handleClose}
                  aria-label="关闭图片详情"
                >
                  <Cross1Icon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="modal-scroll max-h-[calc(85vh-10rem)] overflow-y-auto">
              {/* 图片元信息 - 紧凑区域 */}
              <div className="border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 sm:px-6">
                <ImageInfo image={image} />
              </div>

              {/* 标签区域 */}
              <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 sm:px-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-[var(--accent-600)]" />
                    <h4 className="text-sm font-semibold text-[var(--app-ink)]">标签</h4>
                  </div>
                  {onUpdateTags && !isEditingTags && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTags(imageTags);
                        setIsEditingTags(true);
                        setTagError(null);
                      }}
                      className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                    >
                      编辑标签
                    </button>
                  )}
                </div>

                {!isEditingTags ? (
                  <div className="flex flex-wrap gap-2">
                    {imageTags.length > 0 ? imageTags.map((tag) => (
                      <span key={tag} className="tag-chip inline-flex max-w-full px-2.5 py-1 text-xs font-semibold">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-sm text-[var(--app-faint)]">暂无标签</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value=""
                      onChange={(event) => addTag(event.target.value)}
                      disabled={isSavingTags}
                      aria-label="选择已有标签"
                      className="input-primary w-full px-3 py-2"
                    >
                      <option value="">选择已有标签...</option>
                      {availableTags
                        .filter((tag) => !editingTags.some((item) => item.toLowerCase() === tag.toLowerCase()))
                        .map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>

                    <div className="flex min-w-0">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addTag(tagInput);
                          }
                        }}
                        disabled={isSavingTags}
                        placeholder="输入新标签"
                        className="input-primary min-w-0 flex-1 rounded-r-none px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        disabled={!tagInput.trim() || isSavingTags}
                        className="btn-primary min-h-11 min-w-11 rounded-l-none px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="添加标签"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {isLoadingTags && (
                      <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                        <Spinner className="h-3.5 w-3.5" />
                        正在加载已有标签...
                      </div>
                    )}

                    {tagError && <p className="text-xs text-red-600 dark:text-red-400">{tagError}</p>}

                    <div className="flex flex-wrap gap-2">
                      {editingTags.length > 0 ? editingTags.map((tag) => (
                        <span key={tag} className="tag-chip inline-flex max-w-full items-center gap-1 px-2.5 py-1 text-xs font-semibold">
                          <span className="min-w-0 break-words">{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            disabled={isSavingTags}
                            className="rounded-full p-0.5 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`删除标签 ${tag}`}
                          >
                            <Cross1Icon className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )) : (
                        <span className="text-sm text-[var(--app-faint)]">暂无标签</span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTags(imageTags);
                          setIsEditingTags(false);
                          setTagInput("");
                          setTagError(null);
                        }}
                        disabled={isSavingTags}
                        className="btn-secondary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveTags()}
                        disabled={isSavingTags}
                        className="btn-primary min-h-10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingTags ? <Spinner className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                        {isSavingTags ? "保存中..." : "保存标签"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 链接区域 - 主要内容 */}
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-1 rounded-full bg-[var(--accent-500)]" />
                  <h4 className="text-sm font-semibold text-[var(--app-ink)]">快速复制</h4>
                </div>
                <ImageUrls image={image} />
              </div>
            </div>

            {/* 底部操作区域 */}
            <div className="modal-footer flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 sm:px-6">
              {canDelete && !showDeleteConfirm && (
                <div className="flex items-center gap-2 flex-wrap">
                  {onRename && (
                    <button
                      onClick={() => onRename(image)}
                      className="btn-secondary min-h-11 border-transparent bg-transparent px-4 py-2 text-sm text-[var(--accent-700)] hover:bg-[var(--accent-50)]"
                    >
                      重命名
                    </button>
                  )}

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-secondary group min-h-11 border-transparent bg-transparent px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    删除图片
                  </button>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="flex gap-2">
                  <DeleteConfirm
                    isDeleting={isDeleting}
                    onCancel={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                  />
                </div>
              )}

              {(!canDelete || !showDeleteConfirm) && <div />}

              <button
                onClick={handleClose}
                className="btn-secondary min-h-11 px-5 py-2 text-sm"
              >
                关闭
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
