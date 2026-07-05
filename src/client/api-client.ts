import { hc } from 'hono/client';
import type { AppType } from '@/app/api/[[...route]]/route';

// We initialize the client targeting the site root.
// Hono base path is /api, so calls to client.api will hit /api.
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const client = hc<AppType>(getBaseUrl());
export type ClientType = typeof client;
