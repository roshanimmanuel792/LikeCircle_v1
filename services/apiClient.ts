import { authService } from './authService';
import { tokenRefreshService } from './tokenRefreshService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function doFetch(path: string, options: RequestInit = {}, allowRetry = true): Promise<any> {
  await tokenRefreshService.ensureValidToken();
  const accessToken = authService.getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (res.status === 401 && allowRetry) {
    const refreshed = await tokenRefreshService.refreshAccessToken();
    if (refreshed) return doFetch(path, options, false);
    authService.logout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText);
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const apiClient = {
  get: (path: string) => doFetch(path, { method: 'GET' }),
  post: (path: string, body?: any) => doFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) => doFetch(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
};
