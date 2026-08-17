'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from './useSession';
import { api } from '../utils/request';
import { queryKeys } from '../lib/queryKeys';

interface PreviewSettingsContextValue {
  useCdnCgiPreview: boolean;
  isReady: boolean;
}

interface ConfigResponse {
  success: boolean;
  config?: {
    useCdnCgiPreview?: boolean;
  };
}

const PreviewSettingsContext = createContext<PreviewSettingsContextValue>({
  // Direct URLs are the safe behavior while the server setting is loading.
  useCdnCgiPreview: false,
  isReady: false,
});

export function ImagePreviewSettingsProvider({ children }: { children: React.ReactNode }) {
  const { status, loading: sessionLoading } = useSession();
  const authenticated = !sessionLoading && status?.authenticated === true;
  const query = useQuery({
    queryKey: queryKeys.config.preview(),
    queryFn: async () => {
      const response = await api.get<ConfigResponse>('/api/config');
      return response.config?.useCdnCgiPreview === true;
    },
    enabled: authenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const value = useMemo<PreviewSettingsContextValue>(() => ({
    // Treat a missing or failed setting as direct-preview mode to avoid accidental transforms.
    useCdnCgiPreview: query.data === true,
    isReady: !authenticated || !query.isLoading,
  }), [authenticated, query.data, query.isLoading]);

  return (
    <PreviewSettingsContext.Provider value={value}>
      {children}
    </PreviewSettingsContext.Provider>
  );
}

export function useImagePreviewSettings(): PreviewSettingsContextValue {
  return useContext(PreviewSettingsContext);
}
