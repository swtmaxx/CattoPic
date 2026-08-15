'use client'

import { useState } from 'react'
import { UploadPhase, UploadFileItem } from '../../types/upload'
import { ImageData } from '../../types/image'
import { UploadResult } from '../../types'
import UploadStatusIndicator, { getStatusText, getStatusColorClass } from './UploadStatusIndicator'
import { TrashIcon, RotateCcwIcon, CopyIcon, EyeOpenIcon } from '../ui/icons'
import { getFullUrl } from '../../utils/baseUrl'
import { copyToClipboard } from '../../utils/copyImageUtils'
import { showToast } from '../ToastContainer'
import ImageModal from '../ImageModal'

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function toPreview(result: UploadResult): ImageData & { status: 'success' } {
  return {
    id: result.id || '',
    status: 'success',
    originalName: result.originalName,
    format: result.format,
    orientation: result.orientation || 'landscape',
    expiryTime: result.expiryTime,
    tags: result.tags || [],
    urls: {
      original: result.urls?.original || '',
      webp: result.urls?.webp || '',
      avif: result.urls?.avif || '',
    },
    sizes: {
      original: result.sizes?.original || 0,
      webp: result.sizes?.webp || 0,
      avif: result.sizes?.avif || 0,
    },
  }
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
  const [preview, setPreview] = useState<ImageData & { status: 'success' } | null>(null)
  const uploading = phase === 'uploading' || phase === 'processing'
  const hasFiles = files.length > 0
  if (!hasFiles) return null

  const progress = files.length > 0 ? Math.round(((completedCount + errorCount) / files.length) * 100) : 0

  const copyLink = async (result: UploadResult) => {
    const url = getFullUrl(result.urls?.webp || result.urls?.original || '')
    const ok = await copyToClipboard(url)
    if (ok) showToast('链接已复制', 'success')
    else showToast('复制失败', 'error')
  }

  return (
    <>
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

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((item) => {
            const succeeded = item.status === 'success' && !!item.result?.urls?.original
            return (
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
                {succeeded ? (
                  <button
                    onClick={() => setPreview(toPreview(item.result!))}
                    className="shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700"
                    title="预览图片"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getFullUrl(item.result!.urls!.original)}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="shrink-0">
                    <UploadStatusIndicator status={item.status} size="sm" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{item.file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{formatFileSize(item.file.size)}</span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className={getStatusColorClass(item.status)}>{getStatusText(item.status)}</span>
                    {item.error && <span className="text-red-500 truncate">· {item.error}</span>}
                  </div>
                </div>
                {succeeded && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreview(toPreview(item.result!))}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors"
                      title="预览"
                    >
                      <EyeOpenIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void copyLink(item.result!)}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors"
                      title="复制链接"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ImageModal
        image={preview}
        isOpen={!!preview}
        onClose={() => setPreview(null)}
      />
    </>
  )
}