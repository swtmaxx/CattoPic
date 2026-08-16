interface ConfigResponse {
  apiUrl?: string;
  remotePatterns?: string;
}

// 从环境变量获取后端地址，默认为相对路径
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function normalizeLocalApiUrl(value: string): string {
  if (typeof window === "undefined" || !value) return value;

  try {
    const apiUrl = new URL(value, window.location.origin);
    if (isLocalHost(apiUrl.hostname) && isLocalHost(window.location.hostname)) {
      apiUrl.hostname = window.location.hostname;
    }
    return apiUrl.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

let currentBaseUrl = normalizeLocalApiUrl(BASE_URL);
let initPromise: Promise<void> | null = null;

async function initializeApiBaseUrl(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) return;

    const config = await response.json() as ConfigResponse;
    if (config.apiUrl) {
      currentBaseUrl = normalizeLocalApiUrl(config.apiUrl);
    }
  } catch (error) {
    console.error("Failed to fetch API config:", error);
  }
}

// Ensure initialization only runs once, even with concurrent requests.
export async function ensureApiBaseUrl(): Promise<string> {
  if (!initPromise) {
    initPromise = initializeApiBaseUrl();
  }
  await initPromise;
  return currentBaseUrl;
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function buildApiUrl(endpoint: string): URL {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return new URL(endpoint, currentBaseUrl || fallbackOrigin);
}

/**
 * 为URL添加基础地址
 * @param url 相对路径或完整URL
 * @returns 完整URL
 */
export function getFullUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // 如果是相对路径，添加BASE_URL
  try {
    // 在浏览器环境下
    if (typeof window !== "undefined") {
      const nurl = new URL(url, currentBaseUrl || window.location.origin).toString();
      return nurl;
    }
    // 在服务器环境下
    return `${currentBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
  } catch (error) {
    console.error("URL格式错误:", error);
    return url;
  }
}
