'use client';

import { motion, AnimatePresence } from 'motion/react';
import { TrashIcon, Spinner, ExclamationTriangleIcon } from '../ui/icons';

interface TagDeleteConfirmProps {
  isOpen: boolean;
  tagName: string;
  tagCount?: number;
  isBatch?: boolean;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TagDeleteConfirm({
  isOpen,
  tagName,
  tagCount = 0,
  isBatch = false,
  isProcessing,
  onCancel,
  onConfirm,
}: TagDeleteConfirmProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="modal-dialog w-full max-w-md bg-[var(--app-surface)] p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 警告图标 */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* 标题和描述 */}
            <div className="text-center mb-6">
              <h3 className="mb-2 text-lg font-semibold text-[var(--app-ink)]">
                确认删除
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isBatch ? (
                  <>确定要删除选中的 <span className="font-semibold text-red-600 dark:text-red-400">{tagName}</span> 吗？</>
                ) : (
                  <>
                    确定要删除标签 <span className="font-semibold text-red-600 dark:text-red-400">&quot;{tagName}&quot;</span> 吗？
                    {tagCount > 0 && (
                      <span className="block mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                        将同时删除 {tagCount} 张关联图片！
                      </span>
                    )}
                  </>
                )}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                此操作不可撤销，图片和文件将被永久删除
              </p>
            </div>

            {/* 按钮 */}
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="btn-secondary flex-1 px-4 py-2.5"
                disabled={isProcessing}
              >
                取消
              </button>
              <motion.button
                onClick={onConfirm}
                disabled={isProcessing}
                className="flex min-h-11 flex-1 items-center justify-center space-x-2 rounded-lg bg-red-500 px-4 py-2.5 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isProcessing ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>删除中...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    <span>确认删除</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
