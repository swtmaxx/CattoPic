'use client'

import React, { useState, useEffect, useLayoutEffect } from 'react'
import UploadDropzone from './upload/UploadDropzone'
import TagSelector from './upload/TagSelector'
import { api } from '../utils/request'
import { UploadIcon, ExclamationTriangleIcon, ImageIcon, Spinner } from '../components/ui/icons'
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
  onFilesSelected?: (files: { id: string, file: File }[]) => void
  onTogglePreview?: () => void
  isPreviewOpen?: boolean
  fileCount?: number
  existingFiles?: { id: string, file: File }[]
  onTagsChange?: (tags: string[]) => void
  concurrency?: number
  onConcurrencyChange?: (n: number) => void
}

export default function UploadSection({
  onUpload,
  isUploading,
  maxUploadCount = 50,
  onFilesSelected,
  onTogglePreview,
  isPreviewOpen,
  fileCount = 0,
  existingFiles = [],
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

  // 获取可用标签列表
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

  // 首次加载时获取标签
  useEffect(() => {
    fetchTags()
  }, [])

  // 监听上传状态变化，当上传完成时清空选择的文件
  useEffect(() => {
    if (wasUploading && !isUploading) {
      setSelectedFiles([])
      setFileDetails([])
      setExceedsLimit(false)
    }
    setWasUploading(isUploading)
  }, [isUploading, wasUploading])

  // 如果fileCount从外部变为0，清空本地状态
  useEffect(() => {
    if (fileCount === 0 && selectedFiles.length > 0) {
      setSelectedFiles([])
      setFileDetails([])
      setExceedsLimit(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileCount])

  // 同步现有文件列表 (useLayoutEffect 用于同步 props 到 state)
  useLayoutEffect(() => {
    if (existingFiles.length > 0) {
      // 更新本地状态以反映外部文件列表
      const filesArray = existingFiles.map(item => item.file);
      setSelectedFiles(filesArray);
      setFileDetails(existingFiles);
    }
  }, [existingFiles]);

  // 处理标签变化
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);

    // 通知父组件
    if (onTagsChange) {
      onTagsChange(tags);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    // 获取当前的文件列表
    const currentFiles = [...selectedFiles];
    const currentDetails = [...fileDetails];

    // 创建新的文件列表
    const newFiles = [...currentFiles];
    const newDetails = [...currentDetails];

    // 记录超大文件
    const oversized: string[] = [];

    // 添加新选择的文件
    for (const file of files) {
      // 检查文件大小是否超过限制
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(`${file.name} (${formatFileSize(file.size)})`);
        continue;
      }

      // 检查文件是否已经存在于列表中
      const isDuplicate = currentFiles.some(existingFile =>
        existingFile.name === file.name &&
        existingFile.size === file.size &&
        existingFile.lastModified === file.lastModified
      );

      // 只添加不重复的文件
      if (!isDuplicate) {
        newFiles.push(file);
        newDetails.push({
          id: Math.random().toString(36).substring(2, 11),
          file
        });
      }
    }

    // 更新超大文件提示
    setOversizedFiles(oversized);

    // 检查是否超过最大上传限制
    if (newFiles.length > maxUploadCount) {
      // 如果超过限制，只保留前 maxUploadCount 张图片
      const allowedFiles = newFiles.slice(0, maxUploadCount);
      const allowedDetails = newDetails.slice(0, maxUploadCount);

      setSelectedFiles(allowedFiles);
      setFileDetails(allowedDetails);
      setExceedsLimit(true);

      // 通知父组件
      if (onFilesSelected) {
        onFilesSelected(allowedDetails);
      }
    } else {
      setSelectedFiles(newFiles);
      setFileDetails(newDetails);
      setExceedsLimit(false);

      // 通知父组件
      if (onFilesSelected) {
        onFilesSelected(newDetails);
      }
    }
  }

  // 文件夹上传：过滤图片并自动上传
  const handleFolderSelected = async (files: File[]) => {
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
      setOversizedFiles(['所选文件夹中没有找到支持的图片文件']);
      return;
    }

    // 过滤超大文件
    const oversized: string[] = [];
    const validFiles = imageFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(`${file.name} (${formatFileSize(file.size)})`);
        return false;
      }
      return true;
    });
    if (oversized.length > 0) {
      setOversizedFiles(oversized);
    }

    if (validFiles.length === 0) return;

    // 与已选文件合并去重
    const currentDetails = [...fileDetails];
    const existingKeys = new Set(
      currentDetails.map((item) => `${item.file.name}|${item.file.size}|${item.file.lastModified}`)
    );
    const newDetails = [...currentDetails];
    for (const file of validFiles) {
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      newDetails.push({ id: Math.random().toString(36).substring(2, 11), file });
    }

    if (newDetails.length > maxUploadCount) {
      newDetails.splice(maxUploadCount);
      setExceedsLimit(true);
    } else {
      setExceedsLimit(false);
    }

    setSelectedFiles(newDetails.map((item) => item.file));
    setFileDetails(newDetails);
    onFilesSelected?.(newDetails);

    // 自动上传文件夹中的全部图片
    await onUpload(newDetails, selectedTags);
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
          <UploadIcon className="h-6 w-6 mr-2 text-green-500" />
          上传图片
        </h2>

        <form onSubmit={handleSubmit}>
          <UploadDropzone
            onFilesSelected={handleFilesSelected}
            onFolderSelected={(files) => void handleFolderSelected(files)}
            maxUploadCount={maxUploadCount}
          />

          {/* 上传并发设置 */}
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">上传并发：</span>
            </div>
            <div className="flex-1">
              <select
                value={concurrency}
                onChange={(e) => onConcurrencyChange?.(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 text-sm shadow-xs"
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
            <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 shadow-xs">
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
            <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 shadow-xs">
              <div className="flex items-start">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3 shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300 mb-1">文件过大已跳过</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                    以下文件超过 70MB 限制，已自动跳过：
                  </p>
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
                已选择 <span className="font-medium text-green-600 dark:text-green-400">{selectedFiles.length}</span> 张图片
              </div>
              <div className="flex items-center gap-2">
                {onTogglePreview && (
                  <button
                    type="button"
                    onClick={onTogglePreview}
                    className="px-4 py-2 text-sm bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors duration-200 flex items-center font-medium"
                  >
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    {isPreviewOpen ? '隐藏文件列表' : '查看文件列表'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          )}
        </form>
      </div>
    </>
  )
}