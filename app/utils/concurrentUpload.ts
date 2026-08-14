import { request } from './request'
import { UploadResult } from '../types'
import { FileUploadStatus } from '../types/upload'

interface SingleUploadResponse {
  success: boolean
  result: UploadResult
  error?: string
}

export interface ConcurrentUploadOptions {
  files: { id: string; file: File }[]
  concurrency?: number
  tags: string[]
  quality?: number
  maxWidth?: number
  preserveAnimation?: boolean
  outputFormat?: 'webp' | 'avif' | 'both'
  onFileStatusChange: (fileId: string, status: FileUploadStatus, result?: UploadResult) => void
  signal?: AbortSignal
}

/**
 * Upload files concurrently with controlled parallelism
 * Each file is uploaded as a separate request for individual progress tracking
 */
export async function concurrentUpload(options: ConcurrentUploadOptions): Promise<UploadResult[]> {
  const {
    files,
    concurrency = 5,
    tags,
    quality = 90,
    maxWidth = 0,
    preserveAnimation = true,
    outputFormat = 'both',
    onFileStatusChange,
    signal,
  } = options

  const results: UploadResult[] = []
  const queue = [...files]
  const active: Promise<void>[] = []

  async function uploadOne(item: { id: string; file: File }): Promise<void> {
    // Check if cancelled
    if (signal?.aborted) {
      return
    }

    // Update status to uploading
    onFileStatusChange(item.id, 'uploading')

    try {
      // Build FormData for single file
      const formData = new FormData()
      formData.append('image', item.file)
      formData.append('tags', tags.join(','))
      formData.append('quality', quality.toString())
      formData.append('maxWidth', maxWidth.toString())
      formData.append('maxHeight', maxWidth.toString())
      formData.append('preserveAnimation', preserveAnimation.toString())
      formData.append('generateWebp', (outputFormat === 'webp' || outputFormat === 'both').toString())
      formData.append('generateAvif', (outputFormat === 'avif' || outputFormat === 'both').toString())

      // Update to processing (after upload starts, before compression completes)
      onFileStatusChange(item.id, 'processing')

      const response = await request<SingleUploadResponse>('/api/upload/single', {
        method: 'POST',
        body: formData,
        signal,
      })

      if (response.success && response.result) {
        const decoratedResult: UploadResult = {
          ...response.result,
          originalName: item.file.name,
          clientFileId: item.id,
        }
        onFileStatusChange(item.id, 'success', decoratedResult)
        results.push(decoratedResult)
      } else {
        const errorResult: UploadResult = {
          id: '',
          status: 'error',
          error: response.error || 'Upload failed',
          originalName: item.file.name,
          clientFileId: item.id,
        }
        onFileStatusChange(item.id, 'error', errorResult)
        results.push(errorResult)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Upload was cancelled
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      const errorResult: UploadResult = {
        id: '',
        status: 'error',
        error: errorMessage,
        originalName: item.file.name,
        clientFileId: item.id,
      }
      onFileStatusChange(item.id, 'error', errorResult)
      results.push(errorResult)
    }
  }

  // Concurrent upload with controlled parallelism
  while (queue.length > 0 || active.length > 0) {
    // Check if cancelled
    if (signal?.aborted) {
      break
    }

    // Fill up to concurrency limit
    while (active.length < concurrency && queue.length > 0) {
      const item = queue.shift()!
      const promise = uploadOne(item).finally(() => {
        const index = active.indexOf(promise)
        if (index > -1) {
          active.splice(index, 1)
        }
      })
      active.push(promise)
    }

    // Wait for any one to complete
    if (active.length > 0) {
      await Promise.race(active)
    }
  }

  return results
}
