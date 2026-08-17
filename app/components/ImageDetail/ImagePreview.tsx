'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { ImageData } from '../../types/image'
import { useImagePreviewSettings } from '../../hooks/useImagePreviewSettings'
import { getImagePreviewUrl } from '../../utils/imagePreview'

interface ImagePreviewProps {
  image: ImageData
}

export function ImagePreview({ image }: ImagePreviewProps) {
  const { useCdnCgiPreview } = useImagePreviewSettings()
  const imageUrl = getImagePreviewUrl(image, { useCdnCgi: useCdnCgiPreview })
  const format = (image.format || '').toLowerCase()
  const useDirectImage = format === 'gif' || format === 'svg' || format === 'avif'

  return (
    <div className="flex w-full items-center p-3 dark:border-slate-700 sm:p-4 md:w-2/5 md:border-r md:border-slate-200">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-full h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height: 'min(400px, 45vh)' }}
      >
        {useDirectImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={image.originalName || ''}
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={imageUrl}
            alt={image.originalName || ''}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-contain"
          />
        )}
      </motion.div>
    </div>
  )
} 
