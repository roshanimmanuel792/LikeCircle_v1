import { authService } from './authService';

export const tokenRefreshService = {
  isAccessTokenExpired: (): boolean => {
    const token = authService.getAccessToken();
    if (!token) return true;
    
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp <= now;
    } catch {
      return true;
    }
  },

  refreshAccessToken: async (): Promise<boolean> => {
    try {
      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        console.warn('No refresh token available');
        return false;
      }

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        console.error('Token refresh failed');
        authService.logout();
        return false;
      }

      const { accessToken } = await res.json();
      authService.setAccessToken(accessToken);
      return true;
    } catch (error) {
      console.error('Auto-refresh error:', error);
      authService.logout();
      return false;
    }
  },

  ensureValidToken: async (): Promise<boolean> => {
    if (tokenRefreshService.isAccessTokenExpired()) {
      return await tokenRefreshService.refreshAccessToken();
    }
    return true;
  },
};
