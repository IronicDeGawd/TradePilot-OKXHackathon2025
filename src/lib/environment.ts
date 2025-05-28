// Environment detection utilities for build-time safety
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function isBuildTime(): boolean {
  return (
    isServer() &&
    (
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PHASE === 'phase-production-build'
    )
  );
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function canMakeApiCalls(): boolean {
  // Allow API calls in browser or during development
  return isBrowser() || isDevelopment();
}

export function shouldSkipApiCall(reason = ''): boolean {
  const skip = isBuildTime();
  if (skip && reason) {
    console.log(`Skipping API call during build time: ${reason}`);
  }
  return skip;
}
