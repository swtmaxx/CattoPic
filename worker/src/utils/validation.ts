// Validation Utilities

export function isValidUUID(str: string): boolean {
  // Support both standard UUID and image ID format (YYYYMMDD-XXXXXXXX)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const imageIdRegex = /^\d{8}-[0-9a-f]{8}$/i;
  return uuidRegex.test(str) || imageIdRegex.test(str);
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate readable image ID: YYYYMMDD-XXXXXXXX (date + 8 random chars)
export function generateImageId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const random = crypto.randomUUID().slice(0, 8); // 8位随机字符
  return `${date}-${random}`;
}

export function sanitizeTagName(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '') // Allow alphanumeric, Chinese, hyphens, underscores
    .substring(0, 50);
}

export function parseTags(tagsString: string | null): string[] {
  if (!tagsString) return [];
  return tagsString
    .split(',')
    .map(t => sanitizeTagName(t))
    .filter(t => t.length > 0);
}

export function parseNumber(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

export function parseBoolean(value: string | null): boolean {
  return value === 'true' || value === '1';
}

export function validateOrientation(value: string | null): 'landscape' | 'portrait' | undefined {
  if (value === 'landscape' || value === 'portrait') {
    return value;
  }
  return undefined;
}

export function validateFormat(value: string | null): 'original' | 'webp' | 'avif' | undefined {
  if (value === 'original' || value === 'webp' || value === 'avif') {
    return value;
  }
  return undefined;
}

export function validateImageListFormat(
  value: string | null
): 'all' | 'gif' | 'webp' | 'avif' | 'original' | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (
    normalized === 'all'
    || normalized === 'gif'
    || normalized === 'webp'
    || normalized === 'avif'
    || normalized === 'original'
  ) {
    return normalized;
  }
  return undefined;
}

export function validateOriginalImageFormat(
  value: string | null
): 'all' | 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'svg' | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpeg';
  if (
    normalized === 'all'
    || normalized === 'png'
    || normalized === 'gif'
    || normalized === 'webp'
    || normalized === 'avif'
    || normalized === 'svg'
  ) {
    return normalized;
  }
  return undefined;
}

// Detect if request is from mobile device
export function isMobileDevice(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'windows phone', 'opera mini', 'opera mobi'
  ];
  const ua = userAgent.toLowerCase();
  return mobileKeywords.some(keyword => ua.includes(keyword));
}

// Get best format based on Accept header
export function getBestFormat(acceptHeader: string | null | undefined): 'avif' | 'webp' | 'original' {
  if (!acceptHeader) return 'original';

  if (acceptHeader.includes('image/avif')) {
    return 'avif';
  }
  if (acceptHeader.includes('image/webp')) {
    return 'webp';
  }
  return 'original';
}
