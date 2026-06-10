import { getApiUrl } from './api-url';

let cachedCsrfToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;

  const res = await fetch(`${getApiUrl()}/api/auth/csrf-token`, {
    credentials: 'include',
  });
  const data = await res.json();
  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken!;
}

export function clearCsrfToken(): void {
  cachedCsrfToken = null;
}
