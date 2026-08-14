import { ImageFile } from "../types";
import { ImageData } from "../types/image";
import { getFormatLabel, formatFileSize } from "../utils/imageUtils";

type ImageType = ImageFile | (ImageData & { status: 'success' });

interface ImageInfoProps {
  image: ImageType;
}

export const ImageInfo = ({ image }: ImageInfoProps) => {
  // 判断图片类型
  const isImageFile = 'urls' in image && 'sizes' in image;

  // 获取展示信息
  const format = (image.format || '').toLowerCase();
  const size = isImageFile ? (image as ImageFile).sizes?.original || 0 : 0;
  const width = 'width' in image ? image.width : undefined;
  const height = 'height' in image ? image.height : undefined;

  // 构建紧凑的标签数据
  const tags = [
    format && {
      label: getFormatLabel(format),
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    isImageFile && size > 0 && {
      label: formatFileSize(size),
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    width && height && {
      label: `${width} × ${height}`,
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800'
    },
  ].filter(Boolean) as Array<{ label: string; bg: string; text: string; border: string }>;

  return (
    <div className="space-y-3">
      {/* 紧凑标签行 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${tag.bg} ${tag.text} ${tag.border}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

    </div>
  );
};
