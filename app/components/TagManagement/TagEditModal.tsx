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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-full">
              <Pencil className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              编辑标签
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Cross1Icon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标签名称
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
              autoFocus
              disabled={isProcessing}
            />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isProcessing}
            >
              取消
            </button>
            <motion.button
              type="submit"
              disabled={!newName.trim() || newName.trim() === tag.name || isProcessing}
              className="flex items-center space-x-2 px-4 py-2.5 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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
