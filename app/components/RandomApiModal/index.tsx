'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cross1Icon, Link2Icon } from '../ui/icons';
import { useTags } from '../../hooks/useTags';
import TagSelector from './TagSelector';
import OrientationSelector from './OrientationSelector';
import FormatSelector from './FormatSelector';
import LinkOutput from './LinkOutput';

interface RandomApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type Orientation = 'auto' | 'landscape' | 'portrait';
export type Format = 'auto' | 'original' | 'webp' | 'avif';

export default function RandomApiModal({ isOpen, onClose }: RandomApiModalProps) {
  const { tags, isLoading } = useTags();

  // 状态管理
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [format, setFormat] = useState<Format>('auto');
  const [baseUrl, setBaseUrl] = useState<string>(
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    ''
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (!res.ok) return;
        const config = await res.json() as { apiUrl?: string };
        if (!cancelled && config.apiUrl) {
          setBaseUrl(config.apiUrl);
        }
      } catch {
      }
    };

    void fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // 构建 URL
  const generatedUrl = useMemo(() => {
    const resolvedBase = baseUrl || 'https://your-worker.workers.dev';
    const url = new URL('/api/random', resolvedBase);

    if (includeTags.length > 0) {
      url.searchParams.set('tags', includeTags.join(','));
    }
    if (excludeTags.length > 0) {
      url.searchParams.set('exclude', excludeTags.join(','));
    }
    if (orientation !== 'auto') {
      url.searchParams.set('orientation', orientation);
    }
    if (format !== 'auto') {
      url.searchParams.set('format', format);
    }

    return url.toString();
  }, [baseUrl, includeTags, excludeTags, orientation, format]);

  // 切换包含标签
  const toggleIncludeTag = (tagName: string) => {
    setIncludeTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      }
      // 如果在排除列表中，先移除
      setExcludeTags(ex => ex.filter(t => t !== tagName));
      return [...prev, tagName];
    });
  };

  // 切换排除标签
  const toggleExcludeTag = (tagName: string) => {
    setExcludeTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      }
      // 如果在包含列表中，先移除
      setIncludeTags(inc => inc.filter(t => t !== tagName));
      return [...prev, tagName];
    });
  };

  // 重置所有选项
  const resetAll = () => {
    setIncludeTags([]);
    setExcludeTags([]);
    setOrientation('auto');
    setFormat('auto');
  };

  if (!isOpen) return null;

  const tagNames = tags.map(t => t.name);

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
                <div className="mr-2 shrink-0 rounded-full bg-[var(--accent-600)] p-2.5 sm:mr-4 sm:p-3">
                  <Link2Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--app-ink)] sm:text-xl">随机图 API 生成器</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAll}
                  className="btn-secondary border-transparent bg-transparent px-3 py-1.5 text-sm"
                >
                  重置
                </button>
                <button
                  onClick={onClose}
                  className="btn-icon"
                >
                  <Cross1Icon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="modal-scroll max-h-[70vh] space-y-6 overflow-y-auto p-4 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-500)] border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* 标签选择器 */}
                  <TagSelector
                    availableTags={tagNames}
                    includeTags={includeTags}
                    excludeTags={excludeTags}
                    onToggleInclude={toggleIncludeTag}
                    onToggleExclude={toggleExcludeTag}
                  />

                  {/* 方向选择器 */}
                  <OrientationSelector
                    value={orientation}
                    onChange={setOrientation}
                  />

                  {/* 格式选择器 */}
                  <FormatSelector
                    value={format}
                    onChange={setFormat}
                  />

                  {/* 链接输出 */}
                  <LinkOutput url={generatedUrl} />
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
