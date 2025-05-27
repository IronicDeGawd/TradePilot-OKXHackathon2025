/**
 * This file contains utilities to detect and adapt to mobile devices
 */

/**
 * Check if the current device is a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
}

/**
 * Get device performance level
 */
export function getDevicePerformanceLevel(): 'low' | 'medium' | 'high' {
  if (typeof window === 'undefined') return 'medium';

  const mobile = isMobileDevice();
  const cores = navigator.hardwareConcurrency || 2;

  if (mobile) {
    if (cores <= 4) return 'low';
    if (cores <= 6) return 'medium';
    return 'high';
  } else {
    if (cores <= 2) return 'low';
    if (cores <= 6) return 'medium';
    return 'high';
  }
}

/**
 * Optimizes the rendering based on device capabilities
 */
export function getOptimalRenderCount(elementCount: number): number {
  const performanceLevel = getDevicePerformanceLevel();

  if (performanceLevel === 'low') {
    return Math.min(elementCount, 10);
  } else if (performanceLevel === 'medium') {
    return Math.min(elementCount, 20);
  }

  return elementCount;
}
