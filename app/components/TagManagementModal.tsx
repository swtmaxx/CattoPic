'use client';

import { motion, AnimatePresence } from 'motion/react';
import { TagIcon, Cross1Icon } from './ui/icons';
import TagManagement from './TagManagement';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TagManagementModal({ isOpen, onClose }: TagManagementModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="modal-dialog w-full max-w-2xl overflow-hidden bg-[var(--app-surface)]"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] p-4 sm:p-6">
              <div className="flex items-center">
                <div className="mr-2 shrink-0 rounded-full bg-[var(--accent-100)] p-2.5 dark:bg-[var(--accent-900)] sm:mr-4 sm:p-3">
                  <TagIcon className="h-5 w-5 text-[var(--accent-700)] dark:text-[var(--accent-200)] sm:h-6 sm:w-6" />
                </div>
                  <h2 className="text-lg font-semibold text-[var(--app-ink)] sm:text-xl">标签管理</h2>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <Cross1Icon className="h-5 w-5" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="modal-scroll max-h-[60vh] overflow-y-auto p-4 sm:p-6">
              <TagManagement />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
