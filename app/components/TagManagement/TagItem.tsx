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
        className={`flex items-start px-4 py-3 transition-colors hover:bg-[var(--app-surface-muted)] sm:items-center ${
        isSelected ? 'bg-[var(--accent-50)]' : ''
      }`}
    >
      {/* 选择框 */}
      <button
        onClick={onToggleSelect}
        className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded border transition-colors mr-2 sm:mr-4 ${
          isSelected
            ? 'border-[var(--accent-600)] bg-[var(--accent-600)]'
            : 'border-[var(--app-border-strong)] hover:border-[var(--accent-500)]'
        }`}
      >
        {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
        {/* 标签名称 */}
        <div className="flex min-w-0 items-center space-x-2 sm:col-span-6">
          <span className="tag-chip inline-flex max-w-full truncate px-3 py-1 text-sm font-medium">
            {tag.name}
          </span>
        </div>

        {/* 使用数量 */}
        <div className="text-left sm:col-span-3 sm:text-center">
          <span className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--app-muted)]">
            {tag.count} 张图片
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end space-x-2 sm:col-span-3">
          <button
            onClick={onEdit}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-[var(--app-muted)] transition-colors hover:bg-[var(--accent-50)] hover:text-[var(--accent-700)]"
            title="编辑"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-[var(--app-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="删除"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
