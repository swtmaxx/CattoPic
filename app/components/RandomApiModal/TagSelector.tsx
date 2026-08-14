'use client';

import { motion } from 'motion/react';
import { PlusIcon, MinusIcon } from '../ui/icons';

interface TagSelectorProps {
  availableTags: string[];
  includeTags: string[];
  excludeTags: string[];
  onToggleInclude: (tag: string) => void;
  onToggleExclude: (tag: string) => void;
}

export default function TagSelector({
  availableTags,
  includeTags,
  excludeTags,
  onToggleInclude,
  onToggleExclude,
}: TagSelectorProps) {
  const getTagState = (tag: string): 'include' | 'exclude' | 'none' => {
    if (includeTags.includes(tag)) return 'include';
    if (excludeTags.includes(tag)) return 'exclude';
    return 'none';
  };

  return (
    <div className="space-y-4">
      {/* 包含标签 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <PlusIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            包含标签
            {includeTags.length > 0 && (
              <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                已选 {includeTags.length} 个
              </span>
            )}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">暂无可用标签</p>
          ) : (
            availableTags.map((tag) => {
              const state = getTagState(tag);
              const isIncluded = state === 'include';

              return (
                <motion.button
                  key={`include-${tag}`}
                  onClick={() => onToggleInclude(tag)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                    ${isIncluded
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                    ${state === 'exclude' ? 'opacity-40' : ''}
                  `}
                >
                  {tag}
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* 分割线 */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* 排除标签 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <MinusIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            排除标签
            {excludeTags.length > 0 && (
              <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                已排除 {excludeTags.length} 个
              </span>
            )}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">暂无可用标签</p>
          ) : (
            availableTags.map((tag) => {
              const state = getTagState(tag);
              const isExcluded = state === 'exclude';

              return (
                <motion.button
                  key={`exclude-${tag}`}
                  onClick={() => onToggleExclude(tag)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                    ${isExcluded
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                    ${state === 'include' ? 'opacity-40' : ''}
                  `}
                >
                  {tag}
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
