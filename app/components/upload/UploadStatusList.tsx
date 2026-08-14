'use client'

import { UploadPhase, UploadFileItem } from '../../types/upload'
import UploadStatusIndicator, { getStatusText, getStatusColorClass } from './UploadStatusIndicator'
import { TrashIcon, RotateCcwIcon } from '../ui/icons'

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

interface UploadStatusListProps {
  files: UploadFileItem[]
  phase: UploadPhase
  completedCount: number
  errorCount: number
  onRetryFailed: () => void
  onClear: () => void
}

export default function UploadStatusList({
  files,
  phase,
  completedCount,
  errorCount,
  onRetryFailed,
  onClear,
}: UploadStatusListProps) {
  const uploading = phase === 'uploading' || phase === 'processing'
  const hasFiles = files.length > 0
  if (!hasFiles) return null

  const progress = files.length > 0 ? Math.round(((completedCount + errorCount) / files.length) * 100) : 0

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">上传队列</h3>
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {completedCount} 成功 · {errorCount} 失败 · 共 {files.length} 张
          </span>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && !uploading && (
            <button
              onClick={onRetryFailed}
              className="px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium"
            >
              <RotateCcwIcon className="h-4 w-4" />
              重试失败项
            </button>
          )}
          {!uploading && (
            <button
              onClick={onClear}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              清空列表
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-light-text-secondary dark:text-dark-text-secondary">总进度</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {files.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              item.status === 'error'
                ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30'
                : item.status === 'success'
                ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200/50 dark:border-green-800/30'
                : 'bg-gray-50/60 dark:bg-slate-800/50 border-gray-200/60 dark:border-slate-700/50'
            }`}
          >
            <div className="shrink-0">
              <UploadStatusIndicator status={item.status} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{item.file.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">{formatFileSize(item.file.size)}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className={getStatusColorClass(item.status)}>{getStatusText(item.status)}</span>
                {item.error && <span className="text-red-500 truncate">· {item.error}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}