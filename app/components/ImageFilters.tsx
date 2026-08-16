"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../utils/request";
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, MixerHorizontalIcon, ArrowDownIcon } from "./ui/icons";

export interface ImageFilterValues {
  format: string;
  orientation: string;
  tag: string;
  search: string;
  sort: "upload_time" | "name" | "size";
  order: "asc" | "desc";
}

interface ImageFiltersProps {
  onFilterChange: (filters: ImageFilterValues) => void;
  search?: string;
}

const SORT_OPTIONS = [
  { value: "upload_time", label: "上传时间" },
  { value: "name", label: "文件名" },
  { value: "size", label: "大小" },
];

export default function ImageFilters({ onFilterChange, search = "" }: ImageFiltersProps) {
  const [format, setFormat] = useState("all");
  const [orientation, setOrientation] = useState("all");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"upload_time" | "name" | "size">("upload_time");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState<"format" | "orientation" | "tag" | "sort" | null>(null);

  const dropdownRefs = {
    format: useRef<HTMLDivElement>(null),
    orientation: useRef<HTMLDivElement>(null),
    tag: useRef<HTMLDivElement>(null),
    sort: useRef<HTMLDivElement>(null),
  };

  const panelRef = useRef<HTMLDivElement>(null);

  const formatOptions = useMemo(() => [
    { value: "all", label: "全部" },
    { value: "webp", label: "WebP" },
    { value: "avif", label: "AVIF" },
    { value: "original", label: "仅原图" },
    { value: "gif", label: "GIF" },
  ], []);

  const orientationOptions = useMemo(() => [
    { value: "all", label: "方向" },
    { value: "landscape", label: "横向" },
    { value: "portrait", label: "纵向" },
  ], []);


  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await api.get<{ success: boolean; tags: { name: string; count: number }[] }>("/api/tags");
        if (response.success && response.tags && response.tags.length > 0) {
          setAvailableTags(response.tags.map((t) => t.name));
        }
      } catch (error) {
        console.error("获取标签失败:", error);
      }
    };
    fetchTags();
  }, []);

  const emit = useCallback((next: Partial<ImageFilterValues>) => {
    onFilterChange({
      format, orientation, tag, search, sort, order,
      ...next,
    });
  }, [format, orientation, tag, search, sort, order, onFilterChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".filter-toggle-button")
      ) {
        setIsFilterPanelOpen(false);
        setActiveDropdown(null);
      }

      if (!Object.values(dropdownRefs).some((ref) => ref.current && ref.current.contains(event.target as Node))) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = useCallback((type: string, value: string) => {
    switch (type) {
      case "format":
        setFormat(value);
        emit({ format: value });
        break;
      case "orientation":
        setOrientation(value);
        emit({ orientation: value });
        break;
      case "tag":
        setTag(value);
        emit({ tag: value });
        break;
      case "sort":
        setSort(value as "upload_time" | "name" | "size");
        emit({ sort: value as "upload_time" | "name" | "size" });
        break;
    }
    setActiveDropdown(null);
  }, [emit]);

  const handleToggleOrder = () => {
    const next = order === "desc" ? "asc" : "desc";
    setOrder(next);
    emit({ order: next });
  };

  const filteredTags = useMemo(() =>
    tagSearchQuery.trim() === ""
      ? availableTags
      : availableTags.filter((t) => t.toLowerCase().includes(tagSearchQuery.toLowerCase())),
    [availableTags, tagSearchQuery]
  );

  const renderFilterOption = useCallback((type: "format" | "orientation" | "tag" | "sort") => {
    const getOptionLabel = () => {
      switch (type) {
        case "format":
          return formatOptions.find((opt) => opt.value === format)?.label || "选择格式";
        case "orientation":
          return orientationOptions.find((opt) => opt.value === orientation)?.label || "选择方向";
        case "tag":
          return tag || "选择标签";
        case "sort":
          return SORT_OPTIONS.find((opt) => opt.value === sort)?.label || "排序";
      }
    };

    const getOptions = () => {
      switch (type) {
        case "format":
          return formatOptions;
        case "orientation":
          return orientationOptions;
        case "sort":
          return SORT_OPTIONS;
        case "tag":
          return filteredTags.map((t) => ({ value: t, label: t }));
      }
    };

    const isActive = activeDropdown === type;

    return (
      <div className="relative" ref={dropdownRefs[type]}>
        <button
          onClick={() => setActiveDropdown(isActive ? null : type)}
          className={`filter-button ${isActive ? "is-active" : ""}`}
        >
          <span className="font-medium truncate">{getOptionLabel()}</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isActive ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="filter-dropdown absolute left-0 top-full z-[110] mt-2 w-full overflow-hidden"
            >
              {type === "tag" && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700/50">
                  <div className="relative">
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="搜索标签..."
                      className="input-primary px-3 py-2 pl-9 placeholder:text-[var(--app-faint)]"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              )}

              <div className={`${type === "tag" ? "max-h-60" : ""} overflow-y-auto`}>
                {type === "tag" && (
                  <button
                    onClick={() => handleFilterChange(type, "")}
                    className={`filter-option ${
                      tag === ""
                        ? "is-active"
                        : ""
                    }`}
                  >
                    全部
                  </button>
                )}
                {getOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(type, option.value)}
                    className={`filter-option ${
                      (type === "format" && format === option.value) ||
                      (type === "orientation" && orientation === option.value) ||
                      (type === "tag" && tag === option.value) ||
                      (type === "sort" && sort === option.value)
                        ? "is-active"
                        : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                {type === "tag" && filteredTags.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    未找到匹配的标签
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDropdown, format, orientation, tag, sort, formatOptions, orientationOptions, filteredTags, handleFilterChange]);

  return (
    <div className="filter-toolbar relative z-50 isolate mb-4">
      <motion.button
        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
        className="filter-toggle-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.9 }}
        aria-expanded={isFilterPanelOpen}
      >
        <MixerHorizontalIcon className="h-5 w-5" />
        筛选
      </motion.button>

      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="filter-panel absolute left-0 top-full z-[100] mt-2 w-full max-w-xl p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {renderFilterOption("format")}
              {renderFilterOption("orientation")}
              {renderFilterOption("tag")}

              {/* 排序 */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex-1">{renderFilterOption("sort")}</div>
                <button
                  onClick={handleToggleOrder}
                  className="btn-icon min-h-11 min-w-11 rounded-lg border-[var(--app-border)] bg-[var(--app-surface-muted)]"
                  title={order === "desc" ? "降序" : "升序"}
                >
                  {order === "desc" ? <ArrowDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
