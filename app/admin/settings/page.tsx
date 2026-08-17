"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "../../hooks/useSession";
import { api } from "../../utils/request";
import { invalidateThemeConfig } from "../../hooks/useTheme";
import { queryKeys } from "../../lib/queryKeys";
import type { AdminConfig, CompressionConfig, ThemeConfig, ThemeAccent, ThemeMode } from "../../types";
import { Spinner, CheckIcon } from "../../components/ui/icons";
import ToastContainer, { showToast } from "../../components/ToastContainer";

const QUALITY_PRESETS = [
  { value: 95, label: "最高", desc: "95%" },
  { value: 90, label: "高", desc: "90%" },
  { value: 80, label: "中", desc: "80%" },
  { value: 70, label: "低", desc: "70%" },
];

const WIDTH_PRESETS = [
  { value: 0, label: "原图", desc: "不限制" },
  { value: 3840, label: "4K", desc: "3840px" },
  { value: 2560, label: "2K", desc: "2560px" },
  { value: 1920, label: "FHD", desc: "1920px" },
  { value: 1280, label: "HD", desc: "1280px" },
];

const FORMAT_OPTIONS = [
  { value: "both", label: "WebP + AVIF", desc: "两者都要" },
  { value: "webp", label: "仅 WebP", desc: "兼容性最好" },
  { value: "avif", label: "仅 AVIF", desc: "体积更小" },
];

const ACCENT_OPTIONS: { value: ThemeAccent; label: string; color: string }[] = [
  { value: "green", label: "绿色", color: "#22c55e" },
  { value: "blue", label: "蓝色", color: "#3b82f6" },
  { value: "violet", label: "紫色", color: "#8b5cf6" },
  { value: "red", label: "红色", color: "#ef4444" },
  { value: "orange", label: "橙色", color: "#f97316" },
];

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const DEFAULT_COMPRESSION: CompressionConfig = {
  quality: 90,
  maxWidth: 0,
  maxHeight: 0,
  preserveAnimation: true,
  generateWebp: true,
  generateAvif: true,
};

const DEFAULT_THEME: ThemeConfig = { accent: "green", mode: "system" };
const DEFAULT_MAX_FILE_SIZE_MB = 70;
const MAX_FILE_SIZE_MB = 500;

export default function AdminSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, loading, logout } = useSession();
  const [compression, setCompression] = useState<CompressionConfig | null>(null);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(DEFAULT_MAX_FILE_SIZE_MB);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [useCdnCgiPreview, setUseCdnCgiPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);

  // 账号设置
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");

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
    api.get<{ success: boolean; config: AdminConfig }>("/api/config")
      .then((res) => {
        if (res.success && res.config) {
          setCompression({ ...DEFAULT_COMPRESSION, ...res.config.compression });
          setMaxFileSizeMb(Math.max(1, Math.min(
            MAX_FILE_SIZE_MB,
            Math.round((res.config.maxFileSize || DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024) / 1024 / 1024),
          )));
          setTheme({ ...DEFAULT_THEME, ...(res.config.theme || {}) });
          setUseCdnCgiPreview(res.config.useCdnCgiPreview ?? true);
        }
      })
      .catch(() => showToast("加载配置失败", "error"));
  }, [status, loading, router]);

  const handleSavePreview = async () => {
    setPreviewSaving(true);
    try {
      await api.put<{ success: boolean }>("/api/config", { useCdnCgiPreview });
      queryClient.setQueryData(queryKeys.config.preview(), useCdnCgiPreview);
      showToast("图片预览设置已保存", "success");
    } catch {
      showToast("保存失败", "error");
    } finally {
      setPreviewSaving(false);
    }
  };

  const handleSave = async () => {
    if (!compression) return;
    if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb < 1 || maxFileSizeMb > MAX_FILE_SIZE_MB) {
      showToast(`上传大小必须在 1-${MAX_FILE_SIZE_MB} MB 之间`, "error");
      return;
    }
    setSaving(true);
    try {
      await api.put<{ success: boolean }>("/api/config", {
        compression,
        maxFileSize: Math.round(maxFileSizeMb * 1024 * 1024),
      });
      showToast("上传与压缩设置已保存", "success");
    } catch {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    try {
      await api.put<{ success: boolean }>("/api/config", { theme });
      invalidateThemeConfig();
      showToast("主题设置已保存", "success");
      document.documentElement.dataset.accent = theme.accent;
      const dark = theme.mode === "dark"
        || (theme.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      try {
        // A saved server theme becomes the new default; remove the browser-only override.
        localStorage.removeItem("theme");
        localStorage.removeItem("theme-override");
      } catch {
        // ignore storage errors
      }
    } catch {
      showToast("保存失败", "error");
    } finally {
      setThemeSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    setAccountError("");
    if (!currentPassword) {
      setAccountError("请输入当前密码");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setAccountError("两次输入的新密码不一致");
      return;
    }
    setAccountSaving(true);
    try {
      await api.post<{ success: boolean }>("/api/auth/account", {
        currentPassword,
        newUsername: newUsername.trim() || undefined,
        newPassword: newPassword || undefined,
      });
      await logout();
      showToast("账号信息已更新，请重新登录", "success");
      router.replace("/admin/login");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setAccountSaving(false);
    }
  };

  const setOutputFormat = (format: string) => {
    if (!compression) return;
    setCompression({
      ...compression,
      generateWebp: format === "both" || format === "webp",
      generateAvif: format === "both" || format === "avif",
    });
  };

  const outputFormat = !compression ? "both"
    : compression.generateWebp && compression.generateAvif ? "both"
    : compression.generateWebp ? "webp" : "avif";

  if (loading || !status?.authenticated || !compression) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-10 w-10 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="app-page w-full max-w-3xl">
      <ToastContainer />
      <div className="page-heading">
        <div>
          <div className="eyebrow">Settings</div>
          <h1 className="page-title">系统设置</h1>
          <p className="page-subtitle">主题、压缩与账号设置。</p>
        </div>
      </div>

      {/* 主题设置 */}
      <div className="card p-4 sm:p-6">
        <h2 className="section-title mb-1">主题设置</h2>
        <p className="section-description mb-6">设置全站主题色与默认深浅模式</p>

        <div className="mb-6">
          <label className="form-label mb-3">主题色</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme((prev) => ({ ...prev, accent: opt.value }))}
                className={`settings-option flex flex-col items-center gap-2 ${theme.accent === opt.value ? "is-active" : ""}`}
              >
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: opt.color }} />
                <span className="text-xs font-medium text-[var(--app-ink)]">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="form-label mb-3">默认模式</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme((prev) => ({ ...prev, mode: opt.value }))}
                className={`settings-option text-sm font-medium ${theme.mode === opt.value ? "is-active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="form-hint">个人仍可在右上角临时切换深浅模式</p>
        </div>

        <div className="flex justify-stretch sm:justify-end">
          <button
            onClick={() => void handleSaveTheme()}
            disabled={themeSaving}
            className="btn-primary w-full px-6 py-2.5 disabled:opacity-70 sm:w-auto"
          >
            <CheckIcon className="h-4 w-4" />
            {themeSaving ? "保存中..." : "保存主题设置"}
          </button>
        </div>
      </div>

      {/* 图片预览设置 */}
      <div className="card mt-6 p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="section-title mb-1">图片预览</h2>
            <p className="section-description">
              使用 Cloudflare 图片转换生成缩略图。关闭后优先使用已保存的 AVIF、WebP，再回退到原图，可减少转换额度消耗。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useCdnCgiPreview}
            aria-label="使用 Cloudflare 图片转换预览"
            onClick={() => setUseCdnCgiPreview((current) => !current)}
            className={`settings-toggle ${useCdnCgiPreview ? "is-on" : ""}`}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-[var(--app-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-[var(--app-muted)]">
            当前：{useCdnCgiPreview ? "使用 /cdn-cgi/image 缩略图" : "使用已保存格式直链"}
          </span>
          <button
            type="button"
            onClick={() => void handleSavePreview()}
            disabled={previewSaving}
            className="btn-primary w-full px-6 py-2.5 disabled:opacity-70 sm:w-auto"
          >
            <CheckIcon className="h-4 w-4" />
            {previewSaving ? "保存中..." : "保存图片预览设置"}
          </button>
        </div>
      </div>

      {/* 压缩设置 */}
      <div className="card mt-6 space-y-8 p-4 sm:p-6">
        <div>
          <h2 className="section-title mb-1">压缩设置</h2>
          <p className="section-description mb-6">全局压缩设置，适用于所有新上传的图片</p>
        </div>

        {/* 上传大小 */}
        <div>
          <label htmlFor="max-file-size" className="form-label">
            最大上传大小
          </label>
          <div className="flex items-center gap-3">
            <input
              id="max-file-size"
              type="number"
              min={1}
              max={MAX_FILE_SIZE_MB}
              step={1}
              value={Number.isFinite(maxFileSizeMb) ? maxFileSizeMb : ""}
              onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
              className="input-primary w-32 px-3 py-2.5"
            />
            <span className="text-sm text-[var(--app-muted)]">MB</span>
          </div>
          <p className="form-hint">
            默认 70 MB，可设置范围为 1–{MAX_FILE_SIZE_MB} MB；实际限制还受 Cloudflare 套餐限制影响。
          </p>
        </div>

        {/* 输出格式 */}
        <div>
          <label className="form-label mb-3">输出格式</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOutputFormat(opt.value)}
                className={`settings-option p-4 text-left ${outputFormat === opt.value ? "is-active" : ""}`}
              >
                <div className="text-sm font-medium text-[var(--app-ink)]">{opt.label}</div>
                <div className="mt-1 text-xs text-[var(--app-muted)]">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 质量 */}
        <div>
          <label className="form-label mb-3">质量</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCompression({ ...compression, quality: preset.value })}
                className={`settings-option p-3 text-center ${compression.quality === preset.value ? "is-active" : ""}`}
              >
                <div className="text-sm font-medium text-[var(--app-ink)]">{preset.label}</div>
                <div className="mt-1 text-xs text-[var(--app-muted)]">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 最大宽度 */}
        <div>
          <label className="form-label mb-3">最大宽度</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {WIDTH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCompression({ ...compression, maxWidth: preset.value, maxHeight: preset.value })}
                className={`settings-option p-3 text-center ${compression.maxWidth === preset.value ? "is-active" : ""}`}
              >
                <div className="text-sm font-medium text-[var(--app-ink)]">{preset.label}</div>
                <div className="mt-1 text-xs text-[var(--app-muted)]">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 保留动画 */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--app-ink)]">保留 GIF 动画</div>
            <div className="mt-1 text-xs text-[var(--app-muted)]">开启后动图 GIF 跳过压缩，只保存原图</div>
          </div>
          <button
            onClick={() => setCompression({ ...compression, preserveAnimation: !compression.preserveAnimation })}
            className={`settings-toggle ${compression.preserveAnimation ? "is-on" : ""}`}
          >
            <span
              className="settings-toggle-knob"
            />
          </button>
        </div>

        {/* 当前摘要 + 保存 */}
        <div className="flex flex-col items-stretch gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-[var(--app-muted)]">
            当前：输出 {outputFormat.toUpperCase()} · 质量 {compression.quality}% · 最大{" "}
            {compression.maxWidth > 0 ? `${compression.maxWidth}px` : "原图"}
          </div>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary w-full px-6 py-2.5 disabled:opacity-70 sm:w-auto"
          >
            <CheckIcon className="h-4 w-4" />
            {saving ? "保存中..." : "保存上传与压缩设置"}
          </button>
        </div>
      </div>

      {/* 账号设置 */}
      <div className="card mt-6 p-4 sm:p-6">
        <h2 className="section-title mb-1">账号设置</h2>
        <p className="section-description mb-6">修改管理员用户名或密码</p>

        <div className="space-y-4">
          <div>
            <label className="form-label">当前密码（必填）</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="请输入当前密码"
            />
          </div>
          <div>
            <label className="form-label">新用户名（可选）</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="3-50 位（字母/数字/._-），留空则不修改"
            />
          </div>
          <div>
            <label className="form-label">新密码（可选）</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="至少 8 位，留空则不修改"
            />
          </div>
          <div>
            <label className="form-label">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="再次输入新密码"
            />
          </div>

          {accountError && (
            <div className="status-panel error">
              {accountError}
            </div>
          )}

          <div className="flex justify-stretch sm:justify-end">
            <button
              onClick={() => void handleSaveAccount()}
              disabled={accountSaving}
              className="btn-primary w-full px-6 py-2.5 disabled:opacity-70 sm:w-auto"
            >
              <CheckIcon className="h-4 w-4" />
              {accountSaving ? "保存中..." : "保存账号信息"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
