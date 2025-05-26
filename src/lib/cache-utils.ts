/**
 * Utility functions for caching API data
 */

// Cache keys
export const CACHE_KEYS = {
  ARBITRAGE_DATA: 'tradepilot-arbitrage-data',
  TRENDING_DATA: 'tradepilot-trending-data',
  MARKET_STATS: 'tradepilot-market-stats',
};

// Default cache expiry in minutes
const DEFAULT_CACHE_EXPIRY = 15;

/**
 * Structure for cached data
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number; // Expiry time in minutes
}

/**
 * Save data to cache
 * @param key Cache key
 * @param data Data to cache
 * @param expiryMinutes Expiry time in minutes
 */
export function saveToCache<T>(key: string, data: T, expiryMinutes = DEFAULT_CACHE_EXPIRY): void {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMinutes,
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if expired/not found
 */
export function getFromCache<T>(key: string): { data: T; isStale: boolean } | null {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    const { data, timestamp, expiry }: CachedData<T> = JSON.parse(cachedItem);
    const expiryTime = timestamp + expiry * 60 * 1000;
    const isStale = Date.now() > expiryTime;

    return { data, isStale };
  } catch (error) {
    console.error('Error retrieving from cache:', error);
    return null;
  }
}

/**
 * Check if a cached item exists and is not expired
 * @param key Cache key
 * @returns Whether a fresh cached value exists
 */
export function hasFreshCache(key: string): boolean {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return false;

    const { timestamp, expiry }: CachedData<any> = JSON.parse(cachedItem);
    const expiryTime = timestamp + expiry * 60 * 1000;

    return Date.now() <= expiryTime;
  } catch (error) {
    console.error('Error checking cache freshness:', error);
    return false;
  }
}

/**
 * Clear a specific item from cache
 * @param key Cache key
 */
export function clearCacheItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache item:', error);
  }
}

/**
 * Clear all cache items
 */
export function clearAllCache(): void {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}
