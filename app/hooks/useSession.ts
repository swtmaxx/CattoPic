"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSessionStatus,
  login as apiLogin,
  logout as apiLogout,
  setupAdmin,
  SessionStatus,
} from "../utils/auth";

export function useSession() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchSessionStatus();
      setStatus(s);
    } catch {
      setStatus({ authenticated: false, needsSetup: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      await apiLogin(username, password);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setStatus({ authenticated: false, needsSetup: false });
  }, []);

  const setup = useCallback(
    async (username: string, password: string) => {
      await setupAdmin(username, password);
      await refresh();
    },
    [refresh]
  );

  return { status, loading, refresh, login, logout, setup };
}
