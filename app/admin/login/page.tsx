"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../hooks/useTheme";
import { Spinner, LockClosedIcon } from "../../components/ui/icons";

export default function AdminLogin() {
  useTheme();
  const router = useRouter();
  const { status, loading, login } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (status?.needsSetup) {
      router.replace("/admin/setup");
      return;
    }
    if (status?.authenticated) {
      router.replace("/admin");
    }
  }, [status, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
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
            <LockClosedIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="brand-name">CattoPic</div>
            <div className="brand-context">Private image workspace</div>
          </div>
        </div>
        <div className="mb-6">
          <div className="eyebrow">Welcome back</div>
          <h1 className="auth-title">管理员登录</h1>
          <p className="page-subtitle">登录 CattoPic 后台管理</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-primary px-3 py-2.5"
              placeholder="请输入用户名"
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
              placeholder="请输入密码"
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
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
