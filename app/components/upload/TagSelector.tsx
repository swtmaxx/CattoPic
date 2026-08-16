'use client'

import { useState } from 'react'
import { TagIcon, PlusIcon, Cross1Icon } from '../ui/icons'

interface TagSelectorProps {
  selectedTags: string[]
  availableTags: string[]
  onTagsChange: (tags: string[]) => void
  onNewTagCreated?: () => void
}

export default function TagSelector({ selectedTags, availableTags, onTagsChange, onNewTagCreated }: TagSelectorProps) {
  const [inputTag, setInputTag] = useState('')

  // 处理标签选择变更
  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tag = e.target.value
    if (tag && !selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag])
    }
    // 重置选择框
    e.target.value = ''
  }

  // 处理标签移除
  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag))
  }

  // 处理自定义标签输入
  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTag(e.target.value)
  }

  // 添加自定义标签
  const handleAddTag = () => {
    if (inputTag.trim() && !selectedTags.includes(inputTag.trim())) {
      onTagsChange([...selectedTags, inputTag.trim()])
      setInputTag('')
      // 通知父组件有新标签被创建
      if (onNewTagCreated) {
        onNewTagCreated()
      }
    }
  }

  // 处理回车键添加标签
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="mb-5">
      <div className="mb-2 flex flex-col items-stretch gap-2">
        <div className="flex items-center">
          <TagIcon className="mr-2 h-4 w-4 text-[var(--accent-600)]" />
          <span className="form-label mb-0">标签</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <select
            onChange={handleTagChange}
            value=""
            aria-label="选择已有标签"
            className="input-primary w-full px-3 py-2"
          >
            <option value="">选择标签...</option>
            {availableTags
              .filter(tag => !selectedTags.includes(tag))
              .map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
          </select>

          <div className="flex min-w-0 w-full">
            <input
              type="text"
              value={inputTag}
              onChange={handleTagInput}
              onKeyDown={handleKeyDown}
              placeholder="自定义标签"
              className="input-primary min-w-0 flex-1 rounded-r-none px-3 py-2"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-primary min-h-11 min-w-11 rounded-l-none px-3 py-2"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map(tag => (
            <div
              key={tag}
              className="tag-chip flex items-center px-2.5 py-1 text-xs font-semibold"
            >
              <span className="min-w-0 break-words">{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 rounded-full p-0.5 hover:bg-white/20 transition-colors"
              >
                <Cross1Icon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
