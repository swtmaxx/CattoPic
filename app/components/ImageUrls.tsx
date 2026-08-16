"use client";

import { useState } from "react";
import { ImageFile } from "../types";
import { ImageData } from "../types/image";
import {
  copyImageLink,
  getImageLink,
  IMAGE_LINK_FORMATS,
  type ImageLinkFormat,
} from "../utils/copyImageUtils";
import { showToast } from "./ToastContainer";
import { CheckIcon, CopyIcon, FileIcon, ImageIcon } from "./ui/icons";

type ImageType = ImageFile | (ImageData & { status: "success" });

interface ImageUrlsProps {
  image: ImageType;
}

export const ImageUrls = ({ image }: ImageUrlsProps) => {
  const [copiedFormat, setCopiedFormat] = useState<ImageLinkFormat | null>(null);

  const handleCopy = async (format: ImageLinkFormat) => {
    const url = getImageLink(image, format);
    const label = IMAGE_LINK_FORMATS.find((item) => item.value === format)?.label || format;

    if (!url) {
      showToast(`${label}链接不可用`, "error");
      return;
    }

    const success = await copyImageLink(image, format);
    if (!success) {
      showToast("复制失败", "error");
      return;
    }

    setCopiedFormat(format);
    showToast("链接已复制", "success");
    window.setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="space-y-2">
      {IMAGE_LINK_FORMATS.map(({ value, label }) => {
        const url = getImageLink(image, value);
        const available = Boolean(url);
        const Icon = value === "original" ? ImageIcon : FileIcon;

        return (
          <div
            key={value}
            className={`grid min-w-0 gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center ${!available ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--app-ink)]">
              <Icon className="h-4 w-4 text-[var(--accent-600)]" />
              {label}
            </div>
            <code className="min-w-0 break-all font-mono text-[11px] leading-relaxed text-[var(--app-muted)]">
              {url || "该格式不可用"}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy(value)}
              disabled={!available}
              className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-2 py-2 text-xs font-medium text-[var(--app-ink)] transition-colors hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
              title={available ? `复制${label}链接` : `${label}链接不可用`}
            >
              {copiedFormat === value ? <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
              {copiedFormat === value ? "已复制" : "复制链接"}
            </button>
          </div>
        );
      })}
    </div>
  );
};
