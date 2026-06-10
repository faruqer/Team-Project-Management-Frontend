/**
 * Base URL for the Orbit API. Set NEXT_PUBLIC_API_URL in .env (see .env.example).
 */
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined. Copy .env.example to .env and set it.');
  }
  return url.replace(/\/$/, '');
}
