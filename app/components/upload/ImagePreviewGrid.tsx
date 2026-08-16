'use client'

import { ImageIcon, TrashIcon } from '../ui/icons'
import Image from 'next/image'

interface ImagePreview {
  id: string
  url: string
  file: File
}

interface ImagePreviewGridProps {
  previews: ImagePreview[]
  onRemoveFile: (id: string) => void
  onRemoveAll: () => void
}

export default function ImagePreviewGrid({ previews, onRemoveFile, onRemoveAll }: ImagePreviewGridProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-slate-800 sm:p-6">
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium flex items-center text-gray-800 dark:text-gray-200">
          <ImageIcon className="h-5 w-5 mr-2 text-indigo-500" />
          已选择 <span className="text-indigo-600 dark:text-indigo-400">{previews.length}</span> 张图片
        </h3>
        <button
          type="button"
          onClick={onRemoveAll}
          className="flex min-h-11 items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-600 transition-colors duration-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 sm:w-auto"
        >
          <TrashIcon className="h-4 w-4 mr-1" />
          清除全部
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {previews.map(preview => (
          <div key={preview.id} className="relative group rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-xs hover:shadow-md transition-all duration-200">
            {preview.url ? (
              <div className="aspect-square relative">
                <Image
                  src={preview.url}
                  alt={preview.file.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-200"></div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(preview.id)}
                  className="absolute bottom-2 right-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/90 p-1.5 opacity-100 transition-all duration-200 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800/90 dark:hover:bg-red-900/20 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <div className="p-3 text-xs truncate border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-800">{preview.file.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
