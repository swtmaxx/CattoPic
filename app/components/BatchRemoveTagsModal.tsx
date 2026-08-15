'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTags } from '../hooks/useTags'
import { api } from '../utils/request'
import { showToast } from './ToastContainer'
import { CheckIcon, Cross1Icon, TagIcon } from './ui/icons'

interface BatchRemoveTagsModalProps {
  isOpen: boolean
  imageIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function BatchRemoveTagsModal({
  isOpen,
  imageIds,
  onClose,
  onSuccess,
}: BatchRemoveTagsModalProps) {
  const { tags, isLoading } = useTags()
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggleTag = (name: string) => {
    setSelectedTags((previous) => {
      const next = new Set(previous)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const close = () => {
    if (saving) return
    setSelectedTags(new Set())
    onClose()
  }

  const handleSubmit = async () => {
    if (imageIds.length === 0 || selectedTags.size === 0) return
    setSaving(true)
    try {
      const response = await api.post<{ success: boolean; updatedCount?: number; message?: string }>(
        '/api/tags/batch',
        {
          imageIds,
          addTags: [],
          removeTags: Array.from(selectedTags),
        },
      )
      if (!response.success) throw new Error(response.message || '批量删除标签失败')
      showToast(`已从 ${response.updatedCount ?? imageIds.length} 张图片删除标签`, 'success')
      setSelectedTags(new Set())
      onSuccess()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '批量删除标签失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/30">
                  <TagIcon className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">批量删除标签</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">从已选择的 {imageIds.length} 张图片移除标签</p>
                </div>
              </div>
              <button onClick={close} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="关闭">
                <Cross1Icon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-5">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">正在加载标签...</p>
              ) : tags.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">暂无可删除的标签</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {tags.map((tag) => {
                    const selected = selectedTags.has(tag.name)
                    return (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                            : 'border-gray-200 text-gray-700 hover:border-amber-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-amber-700'
                        }`}
                      >
                        <span className="truncate">{tag.name}</span>
                        <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-gray-400">
                          {tag.count} 张
                          {selected && <CheckIcon className="h-4 w-4 text-amber-600 dark:text-amber-300" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 p-5 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">已选 {selectedTags.size} 个标签</span>
              <div className="flex gap-2">
                <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700">
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving || selectedTags.size === 0 || imageIds.length === 0}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? '处理中...' : '删除标签'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
