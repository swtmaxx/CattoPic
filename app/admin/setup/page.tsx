"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../hooks/useTheme";
import { Spinner, GearIcon } from "../../components/ui/icons";

export default function AdminSetup() {
  useTheme();
  const router = useRouter();
  const { status, loading, setup } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!status?.needsSetup) {
      router.replace(status?.authenticated ? "/admin" : "/admin/login");
    }
  }, [status, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError("用户名至少 3 个字符");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await setup(username.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "初始化失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-10 w-10 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="auth-page flex min-h-screen items-center justify-center px-3 py-6 sm:px-4">
      <div className="auth-card w-full max-w-md p-5 sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="brand-mark">
            <GearIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="brand-name">CattoPic</div>
            <div className="brand-context">First-time setup</div>
          </div>
        </div>
        <div className="mb-6">
          <div className="eyebrow">Get started</div>
          <h1 className="auth-title">初始化管理员</h1>
          <p className="page-subtitle">首次使用，请创建管理员账号（仅一次）</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="3-50 位（字母/数字/._-）"
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="至少 8 位"
            />
          </div>
          <div>
            <label className="form-label">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="再次输入密码"
            />
          </div>

          {error && (
            <div className="status-panel error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-70"
          >
            {submitting ? "创建中..." : "创建管理员账号"}
          </button>
        </form>
      </div>
    </div>
  );
}
