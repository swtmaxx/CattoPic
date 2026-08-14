"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../hooks/useSession";
import { api } from "../utils/request";
import type { AdminStats, ImageFile } from "../types";
import { getFullUrl } from "../utils/baseUrl";
import ImageModal from "../components/ImageModal";
import {
  Spinner,
  ImageIcon,
  SizeIcon,
  TagIcon,
  Link1Icon,
} from "../components/ui/icons";
import ToastContainer from "../components/ToastContainer";

function toImageFile(img: AdminStats["recentUploads"][number]): ImageFile {
  return {
    id: img.id,
    originalName: img.originalName,
    uploadTime: img.uploadTime,
    expiryTime: img.expiryTime,
    orientation: img.orientation as "landscape" | "portrait",
    tags: img.tags || [],
    format: img.format,
    width: img.width,
    height: img.height,
    paths: { original: img.paths.original, webp: img.paths.webp, avif: img.paths.avif },
    sizes: { original: img.sizes.original, webp: img.sizes.webp, avif: img.sizes.avif },
    urls: {
      original: img.urls?.original || getFullUrl(img.paths.original),
      webp: img.urls?.webp || (img.paths.webp ? getFullUrl(img.paths.webp) : ""),
      avif: img.urls?.avif || (img.paths.avif ? getFullUrl(img.paths.avif) : ""),
    },
  };
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-sm">
      <div className={`inline-flex p-3 rounded-xl ${accent} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function BarList({ data, label, color }: { data: Array<{ name?: string; format?: string; date?: string; count: number }>; label: (item: { name?: string; format?: string; date?: string; count: number }) => string; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">暂无数据</div>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 text-sm text-gray-600 dark:text-gray-300 truncate">{label(d)}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <div className={`h-full ${color} rounded-full`} style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-sm text-gray-500 dark:text-gray-400 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { status, loading } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);

  useEffect(() => {
    if (loading) return;
    if (status?.needsSetup) {
      router.replace("/admin/setup");
      return;
    }
    if (!status?.authenticated) {
      router.replace("/admin/login");
      return;
    }
    api.get<{ success: boolean; stats: AdminStats }>("/api/admin/stats")
      .then((res) => res.success && setStats(res.stats))
      .catch(() => setError("加载统计数据失败"));
  }, [status, loading, router]);

  if (loading || !status?.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-10 w-10 text-indigo-500" />
      </div>
    );
  }

  const weekUploads = stats?.dailyTrend.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">概览</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">CattoPic 数据统计</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!stats ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-10 w-10 text-indigo-500" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="图片总数"
              value={String(stats.totalImages)}
              icon={<ImageIcon className="h-5 w-5 text-indigo-500" />}
              accent="bg-indigo-50 dark:bg-indigo-900/30"
            />
            <StatCard
              label="总存储占用"
              value={formatBytes(stats.totalStorageBytes)}
              icon={<SizeIcon className="h-5 w-5 text-emerald-500" />}
              accent="bg-emerald-50 dark:bg-emerald-900/30"
            />
            <StatCard
              label="标签数量"
              value={String(stats.topTags.length)}
              icon={<TagIcon className="h-5 w-5 text-purple-500" />}
              accent="bg-purple-50 dark:bg-purple-900/30"
            />
            <StatCard
              label="近 7 天上传"
              value={String(weekUploads)}
              icon={<Link1Icon className="h-5 w-5 text-amber-500" />}
              accent="bg-amber-50 dark:bg-amber-900/30"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 近 7 天趋势 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">近 7 天上传趋势</h2>
              <BarList
                data={stats.dailyTrend}
                label={(d) => (d.date || "").slice(5)}
                color="bg-indigo-500"
              />
            </div>

            {/* 最近上传 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近上传</h2>
              {stats.recentUploads.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">暂无图片</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {stats.recentUploads.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setPreviewImage(toImageFile(img))}
                      className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 aspect-square group"
                      title="点击预览"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.urls?.original || getFullUrl(img.paths.original)}
                        alt={img.originalName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 格式分布 */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">格式分布</h2>
              <BarList
                data={stats.formatDistribution}
                label={(d) => d.format || "-"}
                color="bg-emerald-500"
              />
            </div>

            {/* 标签 TOP */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">标签 TOP 10</h2>
              <BarList
                data={stats.topTags}
                label={(d) => d.name || "-"}
                color="bg-amber-500"
              />
            </div>
          </div>
        </>
      )}

      <ImageModal
        image={previewImage}
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}