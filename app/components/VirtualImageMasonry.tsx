'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ImageFile } from '../types';
import ImageCard from './ImageCard';

const GUTTER_PX = 16;

function getLaneCount(containerWidth: number): number {
  if (containerWidth <= 640) return 1;
  if (containerWidth <= 768) return 2;
  if (containerWidth <= 1024) return 3;
  return 4;
}

function getColumnWidth(containerWidth: number, lanes: number): number {
  const safeLanes = Math.max(1, lanes);
  const totalGutter = GUTTER_PX * (safeLanes - 1);
  const width = Math.floor((containerWidth - totalGutter) / safeLanes);
  return Math.max(1, width);
}

function estimateCardHeight(image: Pick<ImageFile, 'width' | 'height' | 'orientation'>, columnWidth: number): number {
  if (image.width > 0 && image.height > 0) {
    return columnWidth * (image.height / image.width);
  }

  const aspectRatio = image.orientation === 'portrait' ? 3 / 4 : 4 / 3; // width / height
  return columnWidth / aspectRatio;
}

export interface VirtualImageMasonryProps {
  images: ImageFile[];
  onImageClick: (image: ImageFile) => void;
  onDelete: (id: string) => Promise<void>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  layoutKey?: string | number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  /** 手动指定网格列数（覆盖自动计算），用于"大小调节"滑块 */
  lanesOverride?: number;
}

interface VirtualImageMasonryInnerProps extends Omit<VirtualImageMasonryProps, 'layoutKey'> {
  lanes: number;
  columnWidth: number;
  scrollMargin: number;
}

function VirtualImageMasonryInner({
  images,
  onImageClick,
  onDelete,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  lanes,
  columnWidth,
  scrollMargin,
  selectable = false,
  selectedIds,
  onToggleSelect,
}: VirtualImageMasonryInnerProps) {
  const lastFetchTriggerIndexRef = useRef(-1);

  const overscan = Math.max(12, lanes * 6);

  const getItemKey = useCallback((index: number) => images[index]?.id ?? index, [images]);

  const estimateSize = useCallback((index: number) => {
    const image = images[index];
    if (!image) return 0;
    return estimateCardHeight(image, columnWidth);
  }, [images, columnWidth]);

  const rowVirtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: images.length,
    estimateSize,
    getItemKey,
    overscan,
    lanes,
    scrollMargin,
    gap: GUTTER_PX,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, columnWidth]);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : -1;

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (images.length === 0) return;
    if (lastVirtualIndex < 0) return;

    const remainingThreshold = lanes * 10;
    const triggerIndex = Math.max(0, images.length - 1 - remainingThreshold);

    if (lastVirtualIndex < triggerIndex) return;
    if (lastFetchTriggerIndexRef.current === lastVirtualIndex) return;

    lastFetchTriggerIndexRef.current = lastVirtualIndex;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, images.length, lanes, lastVirtualIndex]);

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const image = images[virtualItem.index];
        if (!image) return null;

        const x = virtualItem.lane * (columnWidth + GUTTER_PX);
        const y = virtualItem.start - scrollMargin;

        return (
          <div
            key={image.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${columnWidth}px`,
              transform: `translate3d(${x}px, ${y}px, 0)`,
              boxSizing: 'border-box',
            }}
          >
            <ImageCard
              image={image}
              onClick={onImageClick}
              onDelete={onDelete}
              displayWidth={columnWidth}
              selectable={selectable}
              selected={selectedIds?.has(image.id)}
              onToggleSelect={onToggleSelect}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function VirtualImageMasonry({
  images,
  onImageClick,
  onDelete,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  layoutKey,
  selectable = false,
  selectedIds,
  onToggleSelect,
  lanesOverride,
}: VirtualImageMasonryProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();

    const ro = new ResizeObserver(() => {
      updateWidth();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const nextMargin = el.getBoundingClientRect().top + window.scrollY;
    setScrollMargin((prev) => {
      if (prev === null) return nextMargin;
      return Math.abs(prev - nextMargin) > 1 ? nextMargin : prev;
    });
  }, [containerWidth, layoutKey]);

  const lanes = useMemo(() => (lanesOverride && lanesOverride >= 1 ? lanesOverride : getLaneCount(containerWidth)), [containerWidth, lanesOverride]);
  const columnWidth = useMemo(() => getColumnWidth(containerWidth, lanes), [containerWidth, lanes]);

  const isReady = containerWidth > 0 && scrollMargin !== null;

  return (
    <div ref={parentRef}>
      {isReady ? (
        <VirtualImageMasonryInner
          key={`${lanes}:${Math.round(scrollMargin)}`}
          images={images}
          onImageClick={onImageClick}
          onDelete={onDelete}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          lanes={lanes}
          columnWidth={columnWidth}
          scrollMargin={scrollMargin}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      ) : null}
    </div>
  );
}
