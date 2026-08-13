// Session helpers (username/password login)
import { buildApiUrl, ensureApiBaseUrl } from "./baseUrl";

export interface SessionStatus {
  authenticated: boolean;
  needsSetup: boolean;
}

export async function fetchSessionStatus(): Promise<SessionStatus> {
  await ensureApiBaseUrl();
  const response = await fetch(buildApiUrl("/api/auth/session").toString(), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("会话检查失败");
  const data = await response.json();
  return { authenticated: !!data.authenticated, needsSetup: !!data.needsSetup };
}

export async function login(username: string, password: string): Promise<void> {
  await ensureApiBaseUrl();
  const response = await fetch(buildApiUrl("/api/auth/login").toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "登录失败");
  }
}

export async function logout(): Promise<void> {
  await ensureApiBaseUrl();
  await fetch(buildApiUrl("/api/auth/logout").toString(), {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}

export async function setupAdmin(username: string, password: string): Promise<void> {
  await ensureApiBaseUrl();
  const response = await fetch(buildApiUrl("/api/auth/setup").toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "初始化失败");
  }
}
