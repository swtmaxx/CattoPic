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
      <div className="card p-8 mb-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <UploadIcon className="h-6 w-6 mr-2 text-indigo-500" />
          上传图片
        </h2>

        <form onSubmit={handleSubmit}>
          <UploadDropzone
            onFilesSelected={(files) => void handleFilesSelected(files)}
            onFolderSelected={(files) => void handleFolderSelected(files)}
            maxUploadCount={maxUploadCount}
          />

          <div className="mb-6 flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">上传并发：</span>
            </div>
            <div className="flex-1">
              <select
                value={concurrency}
                onChange={(e) => onConcurrencyChange?.(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 text-sm shadow-xs"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n} 个同时上传</option>
                ))}
              </select>
            </div>
          </div>

          <TagSelector
            selectedTags={selectedTags}
            availableTags={availableTags}
            onTagsChange={handleTagsChange}
            onNewTagCreated={fetchTags}
          />

          {exceedsLimit && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-xs">
              <div className="flex items-start">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3 shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">超出上传限制</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    一次最多只能上传 <span className="font-medium">{maxUploadCount}</span> 张图片。已自动选择前 {maxUploadCount} 张。
                  </p>
                </div>
              </div>
            </div>
          )}

          {oversizedFiles.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-xs">
              <div className="flex items-start">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3 shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300 mb-1">文件过大已跳过</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">以下文件超过 70MB 限制，已自动跳过：</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                    {oversizedFiles.map((name, index) => (
                      <li key={index}>{name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                已选择 <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedFiles.length}</span> 张图片
              </div>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors duration-200 flex items-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1.5" />
                    上传中...
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-1.5" />
                    开始上传
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  )
}