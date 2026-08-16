'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag } from '../../types';
import { Cross1Icon, Spinner, CheckIcon } from '../ui/icons';
import { Pencil } from 'lucide-react';

interface TagEditModalProps {
  tag: Tag | null;
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (oldName: string, newName: string) => void;
}

function TagEditModalContent({
  tag,
  isProcessing,
  onClose,
  onSubmit,
}: {
  tag: Tag;
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (oldName: string, newName: string) => void;
}) {
  const [newName, setNewName] = useState(tag.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === tag.name) return;
    onSubmit(tag.name, newName.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="modal-dialog w-full max-w-md bg-[var(--app-surface)] p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-[var(--accent-100)] p-2.5 dark:bg-[var(--accent-900)]">
              <Pencil className="h-5 w-5 text-[var(--accent-700)] dark:text-[var(--accent-200)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--app-ink)] sm:text-xl">
              编辑标签
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <Cross1Icon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="form-label mb-2">
              标签名称
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-primary px-4 py-3"
              autoFocus
              disabled={isProcessing}
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 sm:justify-end sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2.5 sm:flex-none"
              disabled={isProcessing}
            >
              取消
            </button>
            <motion.button
              type="submit"
              disabled={!newName.trim() || newName.trim() === tag.name || isProcessing}
              className="btn-primary flex-1 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isProcessing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>保存</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function TagEditModal({ tag, isOpen, isProcessing, onClose, onSubmit }: TagEditModalProps) {
  return (
    <AnimatePresence>
      {isOpen && tag && (
        <TagEditModalContent
          key={tag.name}
          tag={tag}
          isProcessing={isProcessing}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </AnimatePresence>
  );
}
