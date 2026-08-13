// Image Processor Service
// Note: Full WebP/AVIF conversion requires photon-rs WASM or Cloudflare Image Resizing
// This is a basic implementation that handles format detection and orientation

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  orientation: 'landscape' | 'portrait';
}

export class ImageProcessor {
  // Detect image format from magic bytes
  static detectFormat(data: ArrayBuffer): string {
    const bytes = new Uint8Array(data.slice(0, 12));

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'png';
    }

    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return 'gif';
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'webp';
    }

    // AVIF: Check for ftyp box with avif brand
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === 'avif' || brand === 'avis') {
        return 'avif';
      }
    }

    // SVG: text-based format. Allow BOM/whitespace and optional XML declaration.
    const head = new Uint8Array(data.slice(0, 1024));
    let text = '';
    for (let i = 0; i < head.length; i++) text += String.fromCharCode(head[i]);
    text = text.replace(/^\uFEFF/, '').trimStart();
    if (text.startsWith('<svg') || text.startsWith('<?xml')) {
      return 'svg';
    }

    return 'unknown';
  }

  private static getSvgDimensions(data: ArrayBuffer): { width: number; height: number } {
    const head = new Uint8Array(data.slice(0, 4096));
    let text = '';
    for (let i = 0; i < head.length; i++) text += String.fromCharCode(head[i]);

    const widthMatch = text.match(/width\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
    const heightMatch = text.match(/height\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
    if (widthMatch && heightMatch) {
      return { width: Math.round(parseFloat(widthMatch[1])), height: Math.round(parseFloat(heightMatch[1])) };
    }

    const viewBoxMatch = text.match(/viewBox\s*=\s*["']\s*[\d.\-]+\s+[\d.\-]+\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
    if (viewBoxMatch) {
      return { width: Math.round(parseFloat(viewBoxMatch[1])), height: Math.round(parseFloat(viewBoxMatch[2])) };
    }

    return { width: 1920, height: 1080 };
  }

  // Get image dimensions (basic implementation for JPEG and PNG)
  static async getImageDimensions(data: ArrayBuffer): Promise<{ width: number; height: number }> {
    const bytes = new Uint8Array(data);
    const format = this.detectFormat(data);

    switch (format) {
      case 'png':
        return this.getPngDimensions(bytes);
      case 'jpeg':
        return this.getJpegDimensions(bytes);
      case 'gif':
        return this.getGifDimensions(bytes);
      case 'webp':
        return this.getWebpDimensions(bytes);
      case 'avif':
        return this.getAvifDimensions(bytes);
      case 'svg':
        return this.getSvgDimensions(data);
      default:
        // Default fallback for unknown formats
        return { width: 1920, height: 1080 };
    }
  }

  private static getPngDimensions(bytes: Uint8Array): { width: number; height: number } {
    // PNG stores dimensions at byte 16-23 in big-endian
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    return { width, height };
  }

  private static getJpegDimensions(bytes: Uint8Array): { width: number; height: number } {
    // JPEG dimensions are in SOF markers
    let i = 2;
    while (i < bytes.length) {
      if (bytes[i] !== 0xFF) {
        i++;
        continue;
      }

      const marker = bytes[i + 1];

      // SOF markers (Start of Frame)
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        const height = (bytes[i + 5] << 8) | bytes[i + 6];
        const width = (bytes[i + 7] << 8) | bytes[i + 8];
        return { width, height };
      }

      // Skip to next marker
      const length = (bytes[i + 2] << 8) | bytes[i + 3];
      i += 2 + length;
    }

    return { width: 1920, height: 1080 };
  }

  private static getGifDimensions(bytes: Uint8Array): { width: number; height: number } {
    // GIF dimensions at bytes 6-9 in little-endian
    const width = bytes[6] | (bytes[7] << 8);
    const height = bytes[8] | (bytes[9] << 8);
    return { width, height };
  }

  private static getWebpDimensions(bytes: Uint8Array): { width: number; height: number } {
    // WebP file structure:
    // bytes 0-3: "RIFF"
    // bytes 4-7: file size
    // bytes 8-11: "WEBP"
    // bytes 12-15: chunk type ("VP8 ", "VP8L", "VP8X")

    // Check for VP8X (extended format) - bytes 12-15 = "VP8X"
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
      // VP8X: width at bytes 24-26 (little-endian, 24-bit) + 1
      // height at bytes 27-29 (little-endian, 24-bit) + 1
      const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
      const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
      return { width, height };
    }

    // Check for VP8L (lossless) - bytes 12-15 = "VP8L"
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4C) {
      // VP8L: signature byte at 20, then 4 bytes for width/height
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = ((b0 | (b1 << 8)) & 0x3FFF) + 1;
      const height = (((b1 >> 6) | (b2 << 2) | (b3 << 10)) & 0x3FFF) + 1;
      return { width, height };
    }

    // Check for VP8 (lossy) - bytes 12-15 = "VP8 "
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
      // VP8: skip to frame header, width at bytes 26-27, height at 28-29
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3FFF;
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3FFF;
      return { width, height };
    }

    return { width: 1920, height: 1080 }; // fallback
  }

  private static getAvifDimensions(bytes: Uint8Array): { width: number; height: number } {
    // AVIF uses ISOBMFF container, need to find 'ispe' box for dimensions
    let offset = 0;

    while (offset < bytes.length - 8) {
      const boxSize = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                      (bytes[offset + 2] << 8) | bytes[offset + 3];
      const boxType = String.fromCharCode(
        bytes[offset + 4], bytes[offset + 5],
        bytes[offset + 6], bytes[offset + 7]
      );

      if (boxSize === 0) break; // Invalid box

      // 'ispe' box contains width and height
      if (boxType === 'ispe') {
        // ispe box: 4 bytes version/flags, then 4 bytes width, 4 bytes height
        const width = (bytes[offset + 12] << 24) | (bytes[offset + 13] << 16) |
                      (bytes[offset + 14] << 8) | bytes[offset + 15];
        const height = (bytes[offset + 16] << 24) | (bytes[offset + 17] << 16) |
                       (bytes[offset + 18] << 8) | bytes[offset + 19];
        return { width, height };
      }

      // Container boxes that we need to descend into
      if (['meta', 'iprp', 'ipco'].includes(boxType)) {
        // Skip box header (8 bytes) or full box header (12 bytes for 'meta')
        offset += boxType === 'meta' ? 12 : 8;
        continue;
      }

      offset += boxSize;
    }

    return { width: 1920, height: 1080 }; // fallback
  }

  // Detect orientation based on dimensions
  static detectOrientation(width: number, height: number): 'landscape' | 'portrait' {
    return width >= height ? 'landscape' : 'portrait';
  }

  // Get full image info
  static async getImageInfo(data: ArrayBuffer): Promise<ImageInfo> {
    const format = this.detectFormat(data);
    const { width, height } = await this.getImageDimensions(data);
    const orientation = this.detectOrientation(width, height);

    return { width, height, format, orientation };
  }

  // Get content type for format
  static getContentType(format: string): string {
    const types: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
      svg: 'image/svg+xml'
    };
    return types[format] || 'application/octet-stream';
  }

  // Get file extension for format
  static getExtension(format: string): string {
    const extensions: Record<string, string> = {
      jpeg: 'jpg',
      jpg: 'jpg',
      png: 'png',
      gif: 'gif',
      webp: 'webp',
      avif: 'avif',
      svg: 'svg'
    };
    return extensions[format] || format;
  }

  // Check if format is supported
  static isSupportedFormat(format: string): boolean {
    const supported = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'avif', 'svg'];
    return supported.includes(format.toLowerCase());
  }

  // Validate file size
  static isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize;
  }
}
