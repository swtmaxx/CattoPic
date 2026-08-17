import type { ImageData } from '../types/image';
import type { ImageFile } from '../types';
import { getFullUrl } from './baseUrl';
import { toCdnCgiImageUrl } from './cdnImage';

type PreviewImage = Pick<ImageFile, 'format' | 'urls'> | Pick<ImageData, 'format' | 'urls'>;

interface PreviewUrlOptions {
  useCdnCgi: boolean;
  width?: number;
  quality?: number;
}

function isCdnCgiUrl(value: string): boolean {
  try {
    return new URL(value, 'http://preview.local').pathname.startsWith('/cdn-cgi/image/');
  } catch {
    return value.includes('/cdn-cgi/image/');
  }
}

function isDirectPreviewFormat(format: string): boolean {
  return format === 'gif' || format === 'svg' || format === 'avif';
}

function getDirectPreviewSource(image: PreviewImage): string {
  const candidates = [image.urls?.avif, image.urls?.webp, image.urls?.original];
  const directUrl = candidates.find((url) => !!url && !isCdnCgiUrl(url));
  return getFullUrl(directUrl || '');
}

export function getImagePreviewUrl(
  image: PreviewImage,
  options: PreviewUrlOptions,
): string {
  const format = (image.format || '').toLowerCase();

  if (!options.useCdnCgi) {
    return getDirectPreviewSource(image);
  }

  const base = getFullUrl(image.urls?.webp || image.urls?.original || '');
  if (!base || isDirectPreviewFormat(format)) return base;

  return toCdnCgiImageUrl(base, {
    width: options.width,
    quality: options.quality,
    format: 'auto',
    fit: 'scale-down',
  });
}
