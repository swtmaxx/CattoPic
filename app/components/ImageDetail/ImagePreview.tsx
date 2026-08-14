'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { ImageData } from '../../types/image'
import { getFullUrl } from '../../utils/baseUrl'

interface ImagePreviewProps {
  image: ImageData
}

export function ImagePreview({ image }: ImagePreviewProps) {
  const originalUrl = getFullUrl(image.urls?.webp || image.urls?.original || '')
  const format = (image.format || '').toLowerCase()
  const useDirectImage = format === 'gif' || format === 'svg' || format === 'avif'

  return (
    <div className="w-full md:w-2/5 p-4 md:border-r border-slate-200 dark:border-slate-700 flex items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-full h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height: '400px' }}
      >
        {useDirectImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={originalUrl}
            alt={image.originalName || ''}
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={originalUrl}
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
