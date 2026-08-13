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
  onSearchChange?: (search: string) => void;
}

const SORT_OPTIONS = [
  { value: "upload_time", label: "上传时间" },
  { value: "name", label: "文件名" },
  { value: "size", label: "大小" },
];

export default function ImageFilters({ onFilterChange, search = "", onSearchChange }: ImageFiltersProps) {
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
          className={`w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 flex items-center justify-between ${
            isActive
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
              : "bg-slate-200 dark:bg-gray-800/40 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800/60 backdrop-blur-md border border-slate-300/50 dark:border-transparent"
          }`}
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
              className="absolute right-0 bottom-full mb-2 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 z-50 overflow-hidden"
            >
              {type === "tag" && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700/50">
                  <div className="relative">
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="搜索标签..."
                      className="w-full px-3 py-2 pl-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              )}

              <div className={`${type === "tag" ? "max-h-60" : ""} overflow-y-auto`}>
                {(type === "tag" || type === "sort") && (
                  <button
                    onClick={() => handleFilterChange(type, type === "tag" ? "" : "upload_time")}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                      (type === "tag" && tag === "") || (type === "sort" && sort === "upload_time")
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    {type === "tag" ? "全部" : "上传时间"}
                  </button>
                )}
                {getOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(type, option.value)}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                      (type === "format" && format === option.value) ||
                      (type === "orientation" && orientation === option.value) ||
                      (type === "tag" && tag === option.value) ||
                      (type === "sort" && sort === option.value)
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
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
    <>
      <motion.button
        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
        className="filter-toggle-button fixed bottom-6 right-6 z-50 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-3.5 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-110"
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        <MixerHorizontalIcon className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {isFilterPanelOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-20 right-6 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_4px_16px_-4px_rgba(0,0,0,0.1)] dark:shadow-2xl border border-gray-200/80 dark:border-gray-800/50 p-4 w-72 ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
          >
            <div className="space-y-3">
              {renderFilterOption("format")}
              {renderFilterOption("orientation")}
              {renderFilterOption("tag")}

              {/* 排序 */}
              <div className="flex items-center gap-2">
                <div className="flex-1">{renderFilterOption("sort")}</div>
                <button
                  onClick={handleToggleOrder}
                  className="px-3 py-3 rounded-xl text-sm bg-slate-200 dark:bg-gray-800/40 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800/60 border border-slate-300/50 dark:border-transparent flex items-center justify-center"
                  title={order === "desc" ? "降序" : "升序"}
                >
                  {order === "desc" ? <ArrowDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
