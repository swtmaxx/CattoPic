'use client'

import { useRef, useEffect, useState } from 'react'
import { UploadIcon, FolderIcon } from '../ui/icons'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  onFolderSelected?: (files: File[]) => void
  maxUploadCount: number
}

export default function UploadDropzone({ onFilesSelected, onFolderSelected, maxUploadCount }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [isPasteActive, setIsPasteActive] = useState(false)

  // 确保文件夹选择属性真正挂到 DOM（React 可能不会透传 webkitdirectory）
  useEffect(() => {
    const input = folderInputRef.current
    if (input) {
      input.setAttribute('webkitdirectory', '')
      input.setAttribute('directory', '')
    }
  }, [])

  // 监听粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            // 为粘贴的图片生成一个有意义的文件名
            const extension = file.type.split('/')[1] || 'png'
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const newFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
              type: file.type,
            })
            imageFiles.push(newFile)
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        onFilesSelected(imageFiles)

        // 显示粘贴成功的视觉反馈
        setIsPasteActive(true)
        setTimeout(() => setIsPasteActive(false), 500)
      }
    }

    // 添加全局粘贴监听
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [onFilesSelected])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      onFilesSelected(Array.from(files))
    }
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      onFolderSelected?.(Array.from(files))
    }
    // 清空 input，允许再次选择同一文件夹
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onFilesSelected(Array.from(e.dataTransfer.files))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('active')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('active')
  }

  return (
    <div
      className={`drop-zone mb-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        isPasteActive ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-slate-900' : ''
      }`}
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="mb-4 bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
        <UploadIcon className="h-10 w-10 text-green-500" />
      </div>
      <p className="text-lg font-medium mb-2">拖放多张图片到这里</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">点击选择图片或 Ctrl+V 粘贴图片</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">最多可选择 {maxUploadCount} 张图片</p>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        multiple
        onChange={handleFolderSelect}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          className="btn-primary px-4 py-2"
        >
          选择图片
        </button>
        {onFolderSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              folderInputRef.current?.click()
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-1.5"
          >
            <FolderIcon className="h-4 w-4" />
            选择文件夹
          </button>
        )}
      </div>
    </div>
  )
}