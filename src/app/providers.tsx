'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/client/auth-context';
import { I18nProvider } from '@/i18n/I18nProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  // Use a state ref for the QueryClient to prevent recreation on re-renders
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes default
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
