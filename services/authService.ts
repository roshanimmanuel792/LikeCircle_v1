
import { User } from '../types';

const STORAGE_KEY = 'likecircle_user';
const TOKEN_KEY = 'likecircle_google_token';
const ACCESS_KEY = 'likecircle_access_token';
const REFRESH_KEY = 'likecircle_refresh_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const authService = {
  loginWithGoogleToken: async (credentialResponse: any): Promise<User> => {
    try {
      const token = credentialResponse.credential;

      // Verify token server-side to ensure authenticity
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: token }),
      });

      if (!res.ok) {
        throw new Error('Token verification failed');
      }

      const { user, accessToken, refreshToken } = await res.json();

      localStorage.setItem(TOKEN_KEY, token);
      if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Error processing Google token:', error);
      throw new Error('Failed to authenticate with Google');
    }
  },

  loginWithGoogle: async (): Promise<User> => {
    // Simulating Google Sign-In Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser: User = {
      id: 'google_user_' + Math.random().toString(36).substr(2, 9),
      email: 'user@example.com',
      name: 'Simulated User',
      avatar: 'https://picsum.photos/seed/user/200'
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  getAccessToken: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
};
