import type { Env } from './types';

const DEFAULT_CORS_ORIGINS = [
  'https://pic.swtmax.top',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Return explicitly trusted frontend origins for credentialed requests. */
export function getAllowedCorsOrigins(env: Pick<Env, 'ENVIRONMENT' | 'CORS_ORIGINS'>): string[] {
  const configured = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => origin !== null);

  const defaults = env.ENVIRONMENT === 'development'
    ? DEFAULT_CORS_ORIGINS
    : [DEFAULT_CORS_ORIGINS[0]];

  return Array.from(new Set([...defaults, ...configured]));
}

export function isAllowedCorsOrigin(origin: string | null, env: Pick<Env, 'ENVIRONMENT' | 'CORS_ORIGINS'>): boolean {
  return !!origin && getAllowedCorsOrigins(env).includes(origin);
}
