"use client";

import Image from "next/image";
import React, { useState, useCallback, useMemo } from "react";
import { motion } from 'motion/react';
import { ImageFile } from "../types";
import { getFullUrl } from "../utils/baseUrl";
import { toCdnCgiImageUrl } from "../utils/cdnImage";
import { LoadingSpinner } from "./LoadingSpinner";
import { getFormatLabel } from "../utils/imageUtils";
import {
  copyToClipboard,
  getPreferredImageLink,
} from "../utils/copyImageUtils";
import {
  CheckIcon,
  Cross1Icon,
  CopyIcon,
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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isHovered, setIsHovered] = useState(false);
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

  // 鼠标事件处理
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // 快捷复制按钮
  const handleQuickCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { url } = getPreferredImageLink(image);
    const success = await copyToClipboard(url);
    setCopyStatus(success ? "copied" : "error");
    window.setTimeout(() => setCopyStatus("idle"), 2000);
  }, [image]);

  return (
    <>
      <motion.div
        initial={false}
        whileHover={{ y: -3, transition: { duration: 0.16 } }}
        className={`image-card group h-full cursor-pointer overflow-hidden ${selected ? "is-selected" : ""}`}
        onClick={(event) => onClick(image, event)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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

          {/* Image info overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-3 flex justify-between items-center bg-black/40 text-white transition-opacity duration-300 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex space-x-1 items-center">
              {selectable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(image.id, e);
                  }}
                  className={`selection-checkbox flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-md border-2 transition-colors ${
                    selected ? "border-[var(--accent-500)] bg-[var(--accent-500)]" : "border-white bg-white/70"
                  }`}
                  title={selected ? "取消选择" : "选择"}
                >
                  {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                </button>
              )}
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isGif ? "bg-green-500/70" : "bg-blue-500/70"
                }`}
              >
                {getFormatLabel(image.format)}
              </span>
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              onClick={handleQuickCopy}
              className="touch-action-button min-h-11 min-w-11 rounded-full bg-white/20 p-1.5 transition-colors hover:bg-white/40"
              title="复制URL"
            >
              {copyStatus === "idle" && (
                <CopyIcon className="h-4 w-4" />
              )}
              {copyStatus === "copied" && (
                <CheckIcon className="h-4 w-4 text-green-400" />
              )}
              {copyStatus === "error" && (
                <Cross1Icon className="h-4 w-4 text-red-400" />
              )}
            </motion.button>
            </div>
          </div>
      </motion.div>
    </>
  );
});

export default ImageCard;
