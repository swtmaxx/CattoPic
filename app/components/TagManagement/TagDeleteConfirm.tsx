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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
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
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isProcessing}
              >
                取消
              </button>
              <motion.button
                onClick={onConfirm}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
