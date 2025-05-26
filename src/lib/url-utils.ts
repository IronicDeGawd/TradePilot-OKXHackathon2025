// Utility functions for URL construction in both client and server environments
export function getBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Check for Vercel environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Check for custom base URL environment variable
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Default to localhost for development
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

export function constructApiUrl(path: string): string {
  // If it's already an absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // If it's a relative URL, make it absolute
  if (path.startsWith('/')) {
    return `${getBaseUrl()}${path}`;
  }

  // If it doesn't start with /, add it
  return `${getBaseUrl()}/${path}`;
}
