'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthUser, Organization } from '@/lib/api';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth-storage';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureToken = useCallback(async (): Promise<string | null> => {
    let accessToken = getAccessToken();

    if (!accessToken) {
      try {
        const refreshed = await authApi.refresh();
        accessToken = refreshed.accessToken;
        setAccessToken(accessToken);
      } catch {
        return null;
      }
    }

    setToken(accessToken);
    return accessToken;
  }, []);

  const loadUser = useCallback(async () => {
    const accessToken = await ensureToken();

    if (!accessToken) {
      setLoading(false);
      if (requireAuth) router.push('/login');
      return;
    }

    try {
      const { user: me } = await authApi.me(accessToken);
      setUser(me);
    } catch {
      clearAccessToken();
      setUser(null);
      setToken(null);
      if (requireAuth) router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [ensureToken, requireAuth, router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // proceed
      }
    }
    clearAccessToken();
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [token, router]);

  return { user, token, loading, logout, refresh: loadUser };
}
