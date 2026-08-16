import { getFullUrl } from "./baseUrl";

export type ImageLinkFormat = "original" | "avif" | "webp";

export type ImageLinkSource = {
  urls?: Partial<Record<ImageLinkFormat, string>> | null;
};

export const IMAGE_LINK_FORMATS: Array<{ value: ImageLinkFormat; label: string }> = [
  { value: "original", label: "原图" },
  { value: "avif", label: "AVIF" },
  { value: "webp", label: "WebP" },
];

/**
 * Copy text with a Clipboard API first and a document.execCommand fallback.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Clipboard API 复制失败:", err);
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.left = "-999px";
    textArea.style.top = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("兼容复制失败:", err);
    return false;
  }
};

export function getImageLink(image: ImageLinkSource, format: ImageLinkFormat): string {
  const rawUrl = image.urls?.[format] || "";
  return rawUrl ? getFullUrl(rawUrl) : "";
}

export function getPreferredImageLink(image: ImageLinkSource): {
  format: ImageLinkFormat;
  url: string;
} {
  for (const format of ["webp", "avif", "original"] as ImageLinkFormat[]) {
    const url = getImageLink(image, format);
    if (url) return { format, url };
  }

  return { format: "original", url: "" };
}

export async function copyImageLink(image: ImageLinkSource, format: ImageLinkFormat): Promise<boolean> {
  return copyToClipboard(getImageLink(image, format));
}

export const copyOriginalUrl = (image: ImageLinkSource): Promise<boolean> =>
  copyImageLink(image, "original");

export const copyWebpUrl = (image: ImageLinkSource): Promise<boolean> =>
  copyImageLink(image, "webp");

export const copyAvifUrl = (image: ImageLinkSource): Promise<boolean> =>
  copyImageLink(image, "avif");
