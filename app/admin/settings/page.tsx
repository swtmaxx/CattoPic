"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../hooks/useTheme";
import { api } from "../../utils/request";
import type { AdminConfig, CompressionConfig } from "../../types";
import { Spinner, GearIcon, CheckIcon } from "../../components/ui/icons";
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

const DEFAULT_COMPRESSION: CompressionConfig = {
  quality: 90,
  maxWidth: 0,
  maxHeight: 0,
  preserveAnimation: true,
  generateWebp: true,
  generateAvif: true,
};

export default function AdminSettings() {
  useTheme();
  const router = useRouter();
  const { status, loading } = useSession();
  const [compression, setCompression] = useState<CompressionConfig | null>(null);
  const [saving, setSaving] = useState(false);

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
        }
      })
      .catch(() => showToast("加载配置失败", "error"));
  }, [status, loading, router]);

  const handleSave = async () => {
    if (!compression) return;
    setSaving(true);
    try {
      await api.put<{ success: boolean }>("/api/config", { compression });
      showToast("配置已保存", "success");
    } catch {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
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
      showToast("账号信息已更新", "success");
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
    <div className="max-w-3xl mx-auto px-6 py-8">
      <ToastContainer />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GearIcon className="h-7 w-7 text-indigo-500" /> 系统设置
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">全局压缩设置，适用于所有新上传的图片</p>
        </div>
        <Link href="/admin" className="px-4 py-2 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg font-medium">
          返回后台
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-6 space-y-8">
        {/* 输出格式 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">输出格式</label>
          <div className="grid grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOutputFormat(opt.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  outputFormat === opt.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 质量 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">质量</label>
          <div className="grid grid-cols-4 gap-3">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCompression({ ...compression, quality: preset.value })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  compression.quality === preset.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{preset.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 最大宽度 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">最大宽度</label>
          <div className="grid grid-cols-5 gap-2">
            {WIDTH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setCompression({ ...compression, maxWidth: preset.value, maxHeight: preset.value })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  compression.maxWidth === preset.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{preset.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 保留动画 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">保留 GIF 动画</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">开启后动图 GIF 跳过压缩，只保存原图</div>
          </div>
          <button
            onClick={() => setCompression({ ...compression, preserveAnimation: !compression.preserveAnimation })}
            className={`relative w-12 h-7 rounded-full transition-colors ${compression.preserveAnimation ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${compression.preserveAnimation ? "left-6" : "left-1"}`}
            />
          </button>
        </div>

        {/* 当前摘要 + 保存 */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            当前：输出 {outputFormat.toUpperCase()} · 质量 {compression.quality}% · 最大{" "}
            {compression.maxWidth > 0 ? `${compression.maxWidth}px` : "原图"}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-70 transition-colors"
          >
            <CheckIcon className="h-4 w-4" />
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>

      {/* 账号设置 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">账号设置</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">修改管理员用户名或密码</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">当前密码（必填）</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="请输入当前密码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">新用户名（可选）</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="3-50 位（字母/数字/._-），留空则不修改"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">新密码（可选）</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="至少 8 位，留空则不修改"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="再次输入新密码"
            />
          </div>

          {accountError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {accountError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveAccount}
              disabled={accountSaving}
              className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-70 transition-colors"
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
