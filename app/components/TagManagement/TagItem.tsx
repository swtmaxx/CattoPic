'use client';

import { Tag } from '../../types';
import { CheckIcon, TrashIcon } from '../ui/icons';
import { Pencil } from 'lucide-react';

interface TagItemProps {
  tag: Tag;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TagItem({
  tag,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: TagItemProps) {
  return (
    <div
      className={`flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
      }`}
    >
      {/* 选择框 */}
      <button
        onClick={onToggleSelect}
        className={`flex items-center justify-center w-5 h-5 rounded border transition-colors mr-4 ${
          isSelected
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
        }`}
      >
        {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
      </button>

      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
        {/* 标签名称 */}
        <div className="col-span-6 flex items-center space-x-2">
          <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {tag.name}
          </span>
        </div>

        {/* 使用数量 */}
        <div className="col-span-3 text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {tag.count} 张图片
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="col-span-3 flex items-center justify-end space-x-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            title="编辑"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="删除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
