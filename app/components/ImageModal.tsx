"use client";

import { useState } from "react";
import { AnimatePresence, motion } from 'motion/react';
import { ImageFile } from "../types";
import { ImageData } from "../types/image";
import { ImageInfo } from "./ImageInfo";
import { ImageUrls } from "./ImageUrls";
import { DeleteConfirm } from "./DeleteConfirm";
import { Cross1Icon, TrashIcon } from "./ui/icons";

// 统一的图片类型，可以接受管理界面和上传界面的两种不同图片对象
type ImageType = ImageFile | (ImageData & { status: 'success' });

interface ImageModalProps {
  image: ImageType | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onRename?: (image: ImageType) => void;
}

export default function ImageModal({ image, isOpen, onClose, onDelete, onRename }: ImageModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    onClose();
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
