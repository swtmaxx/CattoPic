'use client';

import { motion } from 'motion/react';
import TagItem from './TagItem';
import { Tag } from '../../types';
import { TagIcon, CheckIcon } from '../ui/icons';

interface TagListProps {
  tags: Tag[];
  selectedTags: Set<string>;
  onToggleSelect: (name: string) => void;
  onSelectAll: () => void;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

export default function TagList({
  tags,
  selectedTags,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
}: TagListProps) {
  const allSelected = tags.length > 0 && selectedTags.size === tags.length;

  if (tags.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-[var(--app-muted)] shadow-[var(--app-shadow)]">
        <TagIcon className="mb-4 h-12 w-12 text-[var(--app-faint)]" />
        <p className="text-base font-medium">暂无标签</p>
        <p className="mt-2 text-sm text-[var(--app-faint)]">请创建您的第一个标签</p>
      </div>
    );
  }

  return (
    <div className="image-list-shell overflow-hidden">
      {/* 表头 */}
      <div className="flex items-center border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3">
        <button
          onClick={onSelectAll}
          className={`flex items-center justify-center w-5 h-5 rounded border transition-colors mr-4 ${
            allSelected
              ? 'border-[var(--accent-600)] bg-[var(--accent-600)]'
              : 'border-[var(--app-border-strong)] hover:border-[var(--accent-500)]'
          }`}
        >
          {allSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
        </button>
        <div className="flex-1 text-sm font-medium text-[var(--app-muted)]">
          <div className="flex items-center justify-between sm:hidden">
            <span>标签名称</span>
            <span>操作</span>
          </div>
          <div className="hidden grid-cols-12 gap-4 sm:grid">
            <span className="col-span-6">标签名称</span>
            <span className="col-span-3 text-center">使用数量</span>
            <span className="col-span-3 text-right">操作</span>
          </div>
        </div>
      </div>

      {/* 标签项列表 */}
      <div className="divide-y divide-[var(--app-border)]">
        {tags.map((tag, index) => (
          <motion.div
            key={tag.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <TagItem
              tag={tag}
              isSelected={selectedTags.has(tag.name)}
              onToggleSelect={() => onToggleSelect(tag.name)}
              onEdit={() => onEdit(tag)}
              onDelete={() => onDelete(tag)}
            />
          </motion.div>
        ))}
      </div>

      {/* 总计 */}
      <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-muted)]">
        共 {tags.length} 个标签
      </div>
    </div>
  );
}
