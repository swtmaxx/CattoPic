"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSessionStatus,
  login as apiLogin,
  logout as apiLogout,
  setupAdmin,
  SessionStatus,
} from "../utils/auth";

export const sessionQueryKey = ["auth", "session"] as const;

async function loadSessionStatus(): Promise<SessionStatus> {
  try {
    return await fetchSessionStatus();
  } catch {
    // Keep the existing behavior: a failed session request is treated as logged out.
    return { authenticated: false, needsSetup: false };
  }
}

export function useSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: loadSessionStatus,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: sessionQueryKey,
      queryFn: loadSessionStatus,
      staleTime: 0,
    });
  }, [queryClient]);

  const login = useCallback(
    async (username: string, password: string) => {
      await apiLogin(username, password);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    queryClient.setQueryData<SessionStatus>(sessionQueryKey, {
      authenticated: false,
      needsSetup: false,
    });
  }, [queryClient]);

  const setup = useCallback(
    async (username: string, password: string) => {
      await setupAdmin(username, password);
      await refresh();
    },
    [refresh]
  );

  return {
    status: query.data ?? null,
    loading: query.isLoading,
    refresh,
    login,
    logout,
    setup,
  };
}