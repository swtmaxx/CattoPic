"use client";

import Image from "next/image";
import React, { useState, useCallback, useMemo } from "react";
import { motion } from 'motion/react';
import { ImageFile } from "../types";
import { getFullUrl } from "../utils/baseUrl";
import { toCdnCgiImageUrl } from "../utils/cdnImage";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  CheckIcon,
} from './ui/icons';

// 根据方向确定兜底比例（优先使用元数据 width/height）
const getFallbackAspectRatio = (orientation: string): string => {
  switch (orientation.toLowerCase()) {
    case "portrait":
      return "3 / 4";
    case "landscape":
      return "4 / 3";
    case "square":
      return "1 / 1";
    default:
      return "4 / 3";
  }
};

interface ImageCardProps {
  image: ImageFile;
  onClick: (image: ImageFile, event: React.MouseEvent) => void;
  displayWidth: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string, event?: React.MouseEvent) => void;
}

const ImageCard = React.memo(function ImageCard({
  image,
  onClick,
  displayWidth,
  selectable = false,
  selected = false,
  onToggleSelect,
}: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);

  // 使用 useMemo 缓存计算结果
  const isGif = useMemo(() => image.format.toLowerCase() === "gif", [image.format]);
  const isSvg = useMemo(() => image.format.toLowerCase() === "svg", [image.format]);
  const isAvif = useMemo(() => image.format.toLowerCase() === "avif", [image.format]);
  const aspectRatio = useMemo(() => {
    if (image.width > 0 && image.height > 0) {
      return `${image.width} / ${image.height}`;
    }
    return getFallbackAspectRatio(image.orientation);
  }, [image.width, image.height, image.orientation]);

  const imageSrc = useMemo(() => {
    const base = getFullUrl(image.urls?.webp || image.urls?.original || '');
    if (!base || isGif || isSvg || isAvif) return base;

    // Request a resized thumbnail for smoother scrolling (less decode + bandwidth).
    // Use 2x to keep it crisp on high-DPI displays.
    const requestWidth = Math.max(1, Math.ceil(displayWidth * 2));
    return toCdnCgiImageUrl(base, { width: requestWidth, quality: 75, format: 'auto', fit: 'scale-down' });
  }, [displayWidth, image.urls, isGif, isSvg, isAvif]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <>
      <motion.div
        initial={false}
        whileHover={{ y: -3, transition: { duration: 0.16 } }}
        className={`image-card group h-full cursor-pointer overflow-hidden ${selected ? "is-selected" : ""}`}
        onClick={(event) => onClick(image, event)}
      >
        <div
          className="relative w-full overflow-hidden bg-[var(--app-surface-muted)]"
          style={{ aspectRatio }}
        >
          {isGif || isSvg || isAvif ? (
            // Use img tag for GIF/SVG/AVIF (animation, SVG, and formats that cdn-cgi cannot transform)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={image.originalName}
              onLoad={handleImageLoad}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isLoading ? "opacity-0" : "opacity-100 group-hover:scale-105"
              }`}
            />
          ) : (
            // Use Next.js Image for non-GIF images with optimizations
            <Image
              src={imageSrc}
              alt={image.originalName}
              fill
              loading="lazy"
              onLoad={handleImageLoad}
              className={`object-cover w-full h-full transition-all duration-500 ${
                isLoading ? "opacity-0" : "opacity-100 group-hover:scale-105"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={75}
            />
          )}

          {isLoading && <LoadingSpinner />}

          {selectable && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelect?.(image.id, event);
              }}
              className={`selection-checkbox absolute left-3 top-3 z-10 flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors ${
                selected
                  ? "border-[var(--accent-500)] bg-[var(--accent-500)]"
                  : "border-white/90 bg-black/20 text-transparent shadow-black/30 backdrop-blur-sm"
              }`}
              title={selected ? "取消选择" : "选择"}
              aria-label={selected ? "取消选择" : "选择图片"}
            >
              {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
});

export default ImageCard;
