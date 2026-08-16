import Image from "next/image";
import { ImageFile } from "../types";
import { ImageData } from "../types/image";
import { getFullUrl } from "../utils/baseUrl";
import { useState, useEffect, useCallback } from "react";
import { imageQueue } from "../utils/imageQueue";
import { LoadingSpinner } from "./LoadingSpinner";
import { DownloadIcon } from "./ui/icons";

type ImageType = ImageFile | (ImageData & { status: 'success' });

interface ImagePreviewProps {
  image: ImageType;
  priority?: boolean;
  onLoad?: () => void;
  quality?: number;
}

export const ImagePreview = ({ 
  image, 
  priority = false, 
  onLoad,
  quality = 20 
}: ImagePreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 判断图片类型并获取适当的URL
  const isImageFile = 'urls' in image && 'sizes' in image;
  const imageUrl = getFullUrl(
    image.urls?.webp || image.urls?.original || ''
  );
  
  // 获取格式
  const format = isImageFile 
    ? (image as ImageFile).format?.toLowerCase() 
    : (image as ImageData).format?.toLowerCase() || '';
  const isGif = format === "gif";
  const isSvg = format === "svg";
  const isAvif = format === "avif";

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const loadImage = async () => {
      try {
        // Add to queue with priority flag
        if (!imageQueue.isPreloaded(imageUrl)) {
          imageQueue.add(imageUrl, priority);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load image");
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, priority]);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        <span>Failed to load image</span>
      </div>
    );
  }

  if (isGif || isSvg || isAvif) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={image.originalName}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          loading={priority ? "eager" : "lazy"}
          onLoad={handleLoadComplete}
          onError={() => setError("Failed to load GIF")}
        />
        <a
          href={imageUrl}
          download={image.originalName}
          className="absolute bottom-4 right-4 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-indigo-500 p-2 text-white shadow-lg transition-colors duration-300 hover:bg-indigo-600"
          onClick={(e) => e.stopPropagation()}
          title="下载图片"
        >
          <DownloadIcon className="h-5 w-5" />
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={imageUrl}
        alt={image.originalName || ''}
        fill
        className={`object-contain transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        quality={quality}
        onLoadingComplete={handleLoadComplete}
        onError={() => setError("Failed to load image")}
      />
      {isLoading && <LoadingSpinner />}
    </div>
  );
};
