'use client'

import React, { useState, useEffect } from 'react'
import UploadDropzone from './upload/UploadDropzone'
import TagSelector from './upload/TagSelector'
import { api } from '../utils/request'
import { UploadIcon, ExclamationTriangleIcon, Spinner } from '../components/ui/icons'
import { formatFileSize } from '../utils/imageUtils'

const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'];

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

interface UploadSectionProps {
  onUpload: (files: { id: string, file: File }[], tags: string[]) => Promise<void>
  isUploading: boolean
  maxUploadCount?: number
  onTagsChange?: (tags: string[]) => void
  concurrency?: number
  onConcurrencyChange?: (n: number) => void
}

export default function UploadSection({
  onUpload,
  isUploading,
  maxUploadCount = 50,
  onTagsChange,
  concurrency = 5,
  onConcurrencyChange,
}: UploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileDetails, setFileDetails] = useState<{ id: string, file: File }[]>([])
  const [wasUploading, setWasUploading] = useState(false)
  const [exceedsLimit, setExceedsLimit] = useState(false)
  const [oversizedFiles, setOversizedFiles] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const fetchTags = async () => {
    try {
      const response = await api.get<{ success: boolean; tags: { name: string; count: number }[] }>('/api/tags')
      if (response.success && response.tags && response.tags.length > 0) {
        setAvailableTags(response.tags.map(t => t.name))
      }
    } catch (error) {
      console.error('获取标签失败:', error)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTags()
  }, [])

  // 上传完成后清空本地已选文件
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (wasUploading && !isUploading) {
      setSelectedFiles([])
      setFileDetails([])
      setExceedsLimit(false)
    }
    setWasUploading(isUploading)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isUploading, wasUploading])

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags)
    if (onTagsChange) onTagsChange(tags)
  }

  const addFiles = (files: File[]): { details: { id: string, file: File }[]; oversized: string[]; exceeds: boolean } => {
    const currentDetails = [...fileDetails]
    const existingKeys = new Set(
      currentDetails.map((item) => `${item.file.name}|${item.file.size}|${item.file.lastModified}`)
    )
    const oversized: string[] = []
    const nextDetails = [...currentDetails]

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(`${file.name} (${formatFileSize(file.size)})`)
        continue
      }
      const key = `${file.name}|${file.size}|${file.lastModified}`
      if (existingKeys.has(key)) continue
      existingKeys.add(key)
      nextDetails.push({ id: Math.random().toString(36).substring(2, 11), file })
    }

    const exceeds = nextDetails.length > maxUploadCount
    const details = exceeds ? nextDetails.slice(0, maxUploadCount) : nextDetails
    setSelectedFiles(details.map((item) => item.file))
    setFileDetails(details)
    setExceedsLimit(exceeds)
    setOversizedFiles(oversized)
    return { details, oversized, exceeds }
  }

  const handleFilesSelected = async (files: File[]) => {
    const { details } = addFiles(files)
    if (details.length === 0) return
    // 选择文件后直接上传
    await onUpload(details, selectedTags)
  }

  const handleFolderSelected = async (files: File[]) => {
    const imageFiles = files.filter(isImageFile)
    if (imageFiles.length === 0) {
      setOversizedFiles(['所选文件夹中没有找到支持的图片文件'])
      return
    }
    const { details } = addFiles(imageFiles)
    if (details.length === 0) return
    await onUpload(details, selectedTags)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fileDetails.length === 0) return
    await onUpload(fileDetails, selectedTags)
  }

  return (
    <>
      <div className="card upload-workspace mb-6 p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-[var(--app-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Upload workspace</div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[var(--app-ink)] sm:text-2xl">
              <UploadIcon className="h-5 w-5 text-[var(--accent-600)]" />
              上传图片
            </h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">选择图片后会立即加入上传队列，也可以拖入整个文件夹。</p>
          </div>
          <div className="upload-limit shrink-0">单次最多 {maxUploadCount} 张</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] lg:items-start">
            <div className="min-w-0">
              <UploadDropzone
                onFilesSelected={(files) => void handleFilesSelected(files)}
                onFolderSelected={(files) => void handleFolderSelected(files)}
                maxUploadCount={maxUploadCount}
              />

              {exceedsLimit && (
                <div className="status-panel warning mb-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">超出上传限制</p>
                      <p className="mt-1 text-sm">
                        一次最多只能上传 <span className="font-semibold">{maxUploadCount}</span> 张图片，已自动保留前 {maxUploadCount} 张。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {oversizedFiles.length > 0 && (
                <div className="status-panel error mb-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold">文件过大已跳过</p>
                      <p className="mt-1 text-sm">以下文件超过 70MB 限制：</p>
                      <ul className="mt-2 list-inside list-disc text-sm">
                        {oversizedFiles.map((name, index) => (
                          <li key={index} className="break-words">{name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="selection-summary flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[var(--app-muted)]">
                    已选择 <span className="font-semibold text-[var(--accent-600)]">{selectedFiles.length}</span> 张图片
                  </div>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-primary w-full px-4 py-2 sm:w-auto"
                  >
                    {isUploading ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-4 w-4" />
                        开始上传
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <aside className="upload-options border-t border-[var(--app-border)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="mb-5">
                <label className="form-label" htmlFor="upload-concurrency">上传并发</label>
                <select
                  id="upload-concurrency"
                  value={concurrency}
                  onChange={(e) => onConcurrencyChange?.(Number(e.target.value))}
                  className="input-primary px-3 py-2"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} 个同时上传</option>
                  ))}
                </select>
                <p className="form-hint">数值越高速度越快，但会占用更多网络资源。</p>
              </div>

              <TagSelector
                selectedTags={selectedTags}
                availableTags={availableTags}
                onTagsChange={handleTagsChange}
                onNewTagCreated={fetchTags}
              />

              <div className="upload-note">
                <div className="upload-note-title">支持格式</div>
                <p>JPG、PNG、GIF、WebP、AVIF、SVG 等常见图片格式。</p>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </>
  )
}
