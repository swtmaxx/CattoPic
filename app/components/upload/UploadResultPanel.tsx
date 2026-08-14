'use client'

import { useMemo, useState } from 'react'
import { CheckIcon, CopyIcon, ImageIcon, Cross1Icon } from '../ui/icons'
import { getFullUrl } from '../../utils/baseUrl'
import { copyToClipboard, buildMarkdownLink } from '../../utils/copyImageUtils'
import { showToast } from '../ToastContainer'
import type { UploadResult } from '../../types'

type LinkFormat = 'original' | 'webp' | 'avif' | 'markdown'

const FORMAT_LABELS: Record<LinkFormat, string> = {
  original: '原图',
  webp: 'WebP',
  avif: 'AVIF',
  markdown: 'Markdown',
}

interface UploadResultPanelProps {
  results: UploadResult[]
  onClear?: () => void
}

export default function UploadResultPanel({ results, onClear }: UploadResultPanelProps) {
  const [format, setFormat] = useState<LinkFormat>('webp')

  const successResults = useMemo(() => results.filter((r) => r.status === 'success'), [results])
  const failedCount = results.length - successResults.length

  const resolveUrl = (result: UploadResult): string => {
    const urls = result.urls || { original: '', webp: '', avif: '' }
    if (format === 'original') return getFullUrl(urls.original || '')
    const target = format === 'webp' ? urls.webp : urls.avif
    return getFullUrl(target || urls.original || '')
  }

  const handleCopyAll = async () => {
    if (successResults.length === 0) {
      showToast('暂无成功图片可复制', 'error')
      return
    }
    const links = successResults
      .map((result) => {
        if (format === 'markdown') {
          const url = getFullUrl(result.urls?.webp || result.urls?.original || '')
          return buildMarkdownLink(url, result.originalName || '')
        }
        return resolveUrl(result)
      })
      .join('\n')
    const ok = await copyToClipboard(links)
    if (ok) {
      showToast(`已复制 ${successResults.length} 条${FORMAT_LABELS[format]}链接`, 'success')
    } else {
      showToast('复制失败', 'error')
    }
  }

  if (results.length === 0) return null

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 dark:bg-green-900/50 p-2.5 rounded-full">
            <CheckIcon className="h-5 w-5 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold">上传结果</h3>
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            成功 {successResults.length} 张{failedCount > 0 ? `，失败 ${failedCount} 张` : ''}
          </span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="清空上传结果"
          >
            <Cross1Icon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">链接格式：</span>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['original', 'webp', 'avif', 'markdown'] as LinkFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-2 text-sm transition-colors ${
                format === f
                  ? 'bg-green-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => void handleCopyAll()}
          disabled={successResults.length === 0}
          className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CopyIcon className="h-4 w-4" />
          复制全部链接
        </button>
      </div>
    </div>
  )
}