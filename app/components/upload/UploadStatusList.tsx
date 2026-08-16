'use client'

import { useState } from 'react'
import { UploadPhase, UploadFileItem } from '../../types/upload'
import { ImageData } from '../../types/image'
import { UploadResult } from '../../types'
import UploadStatusIndicator, { getStatusText, getStatusColorClass } from './UploadStatusIndicator'
import { TrashIcon, RotateCcwIcon, CopyIcon, EyeOpenIcon } from '../ui/icons'
import {
  copyToClipboard,
  getImageLink,
  IMAGE_LINK_FORMATS,
  type ImageLinkFormat,
} from '../../utils/copyImageUtils'
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
  const [copyFormat, setCopyFormat] = useState<ImageLinkFormat>('webp')
  const uploading = phase === 'uploading' || phase === 'processing'
  const hasFiles = files.length > 0

  if (!hasFiles) return null

  const progress = files.length > 0 ? Math.round(((completedCount + errorCount) / files.length) * 100) : 0
  const successfulResults = files
    .filter((item) => item.status === 'success' && item.result)
    .map((item) => item.result as UploadResult)

  const getFormatLabel = (format: ImageLinkFormat) =>
    IMAGE_LINK_FORMATS.find((item) => item.value === format)?.label || format

  const copySingle = async (result: UploadResult, format: ImageLinkFormat) => {
    const label = getFormatLabel(format)
    const url = getImageLink(result, format)
    if (!url) {
      showToast(`${label}链接不可用`, 'error')
      return
    }

    const ok = await copyToClipboard(url)
    showToast(ok ? `${label}链接已复制` : '复制失败', ok ? 'success' : 'error')
  }

  const copyAll = async () => {
    if (successfulResults.length === 0) {
      showToast('暂无成功图片可复制', 'error')
      return
    }

    const availableUrls = successfulResults
      .map((result) => getImageLink(result, copyFormat))
      .filter(Boolean)

    if (availableUrls.length === 0) {
      showToast(`${getFormatLabel(copyFormat)}链接不可用`, 'error')
      return
    }

    const ok = await copyToClipboard(availableUrls.join('\n'))
    if (!ok) {
      showToast('复制失败', 'error')
      return
    }

    const skippedCount = successfulResults.length - availableUrls.length
    const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount} 张不可用图片` : ''
    showToast(`已复制 ${availableUrls.length} 条${getFormatLabel(copyFormat)}链接${skippedText}`, 'success')
  }

  return (
    <>
      <div className="card mb-6 p-4 sm:p-6">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="section-title">上传队列</h3>
            <span className="text-xs text-[var(--app-muted)] sm:text-sm">
              {completedCount} 成功 · {errorCount} 失败 · 共 {files.length} 张
            </span>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {errorCount > 0 && !uploading && (
              <button
                onClick={onRetryFailed}
                className="btn-primary w-full px-3 py-2 sm:w-auto"
              >
                <RotateCcwIcon className="h-4 w-4" />
                重试失败项
              </button>
            )}
            {!uploading && (
              <button
                onClick={onClear}
                className="btn-secondary w-full px-3 py-2 sm:w-auto"
              >
                <TrashIcon className="h-4 w-4" />
                清空列表
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-col items-stretch gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--app-ink)]">
            <CopyIcon className="h-4 w-4 text-[var(--accent-600)]" />
            复制全部
          </div>
          <select
            value={copyFormat}
            onChange={(event) => setCopyFormat(event.target.value as ImageLinkFormat)}
            className="input-primary min-h-10 px-2 py-2 text-sm sm:w-auto"
            title="选择批量复制格式"
          >
            {IMAGE_LINK_FORMATS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void copyAll()}
            disabled={successfulResults.length === 0}
            className="btn-primary min-h-10 w-full px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <CopyIcon className="h-4 w-4" />
            复制全部链接
          </button>
        </div>

        {uploading && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-[var(--app-muted)]">总进度</span>
              <span className="font-semibold text-[var(--app-ink)]">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-border)]">
              <div className="h-full rounded-full bg-[var(--accent-600)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {files.map((item) => {
            const succeeded = item.status === 'success' && !!item.result?.urls?.original

            return (
              <div
                key={item.id}
                className={`upload-item flex items-start gap-3 ${
                  item.status === 'error'
                    ? 'is-error'
                    : item.status === 'success'
                    ? 'is-success'
                    : ''
                }`}
              >
                {succeeded ? (
                  <button
                    onClick={() => setPreview(toPreview(item.result!))}
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]"
                    title="预览图片"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.result?.urls?.original}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <div className="shrink-0">
                    <UploadStatusIndicator status={item.status} size="sm" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--app-ink)]">{item.file.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-[var(--app-faint)]">{formatFileSize(item.file.size)}</span>
                    <span className="text-[var(--app-border-strong)]">|</span>
                    <span className={getStatusColorClass(item.status)}>{getStatusText(item.status)}</span>
                    {item.error && <span className="truncate text-red-500">· {item.error}</span>}
                  </div>

                  {succeeded && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {IMAGE_LINK_FORMATS.map(({ value, label }) => {
                        const available = Boolean(getImageLink(item.result!, value))
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => void copySingle(item.result!, value)}
                            disabled={!available}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--app-border)] px-2 py-1 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                            title={available ? `复制${label}链接` : `${label}链接不可用`}
                          >
                            <CopyIcon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {succeeded && (
                  <button
                    type="button"
                    onClick={() => setPreview(toPreview(item.result!))}
                    className="btn-icon h-10 w-10 min-h-10 min-w-10 shrink-0"
                    title="预览"
                  >
                    <EyeOpenIcon className="h-4 w-4" />
                  </button>
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
