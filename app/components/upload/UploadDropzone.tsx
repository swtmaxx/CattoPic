'use client'

import { useRef, useEffect, useState } from 'react'
import { UploadIcon, FolderIcon } from '../ui/icons'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  onFolderSelected?: (files: File[]) => void
  maxUploadCount: number
}

type DirectoryFileEntry = {
  kind: 'file'
  getFile: () => Promise<File>
}

type DirectoryEntry = {
  kind: 'directory'
  values: () => AsyncIterable<DirectoryEntry | DirectoryFileEntry>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryEntry>
}

async function readDirectoryFiles(entry: DirectoryEntry): Promise<File[]> {
  const files: File[] = []
  for await (const child of entry.values()) {
    if (child.kind === 'file') {
      files.push(await child.getFile())
    } else {
      files.push(...(await readDirectoryFiles(child)))
    }
  }
  return files
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

  const handleFolderPicker = async () => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker
    if (!picker) {
      folderInputRef.current?.click()
      return
    }

    try {
      const directory = await picker()
      const files = await readDirectoryFiles(directory)
      onFolderSelected?.(files)
    } catch (error) {
      // AbortError means the user cancelled the picker; do not show an error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      folderInputRef.current?.click()
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
      className={`drop-zone upload-dropzone mb-6 flex cursor-pointer flex-col items-center justify-center ${
        isPasteActive ? 'drop-zone--paste' : ''
      }`}
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="upload-dropzone-icon mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
        <UploadIcon className="h-6 w-6 text-[var(--accent-600)]" />
      </div>
      <p className="mb-2 text-lg font-semibold text-[var(--app-ink)]">拖放多张图片到这里</p>
      <p className="mb-2 text-sm text-[var(--app-muted)]">点击选择图片，或直接粘贴图片</p>
      <p className="mb-5 text-xs text-[var(--app-faint)]">单次最多 {maxUploadCount} 张</p>
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
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          className="btn-primary w-full px-4 py-2 sm:w-auto"
        >
          选择图片
        </button>
        {onFolderSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void handleFolderPicker()
            }}
            className="btn-secondary w-full px-4 py-2 sm:w-auto"
          >
            <FolderIcon className="h-4 w-4" />
            选择文件夹
          </button>
        )}
      </div>
    </div>
  )
}
