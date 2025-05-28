/**
 * Arbitrage Calculation Utilities
 *
 * This module provides centralized functions to calculate and filter arbitrage opportunities
 * ensuring consistency across all pages (landing page, arbitrage page, market overview).
 */

import type { ArbitrageOpportunity } from "@/types";
import { CACHE_KEYS, getFromCache, saveToCache } from "./cache-utils";

/**
 * Configuration for arbitrage calculations
 */
export const ARBITRAGE_CONFIG = {
  // Thresholds for different opportunity types
  THRESHOLDS: {
    MINIMUM_SPREAD: 0.1,        // 0.1% - minimum spread to be considered
    PROFITABLE_SPREAD: 0.5,     // 0.5% - threshold for "profitable" opportunities
    HIGH_PROFIT_SPREAD: 1.0,    // 1.0% - threshold for high-profit opportunities
    VERY_HIGH_PROFIT: 2.0,      // 2.0% - threshold for very high profit opportunities
  },

  // Risk assessment thresholds
  RISK_LEVELS: {
    LOW_RISK_MAX: 1.0,          // <= 1% = low risk
    MEDIUM_RISK_MAX: 2.0,       // 1-2% = medium risk
    // > 2% = high risk
  }
} as const;

/**
 * Filter opportunities by minimum spread threshold
 */
export function filterByMinimumSpread(
  opportunities: ArbitrageOpportunity[],
  threshold: number = ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD
): ArbitrageOpportunity[] {
  return opportunities.filter(op =>
    op.profitPercent != null && Math.abs(op.profitPercent) > threshold
  );
}

/**
 * Filter opportunities that are profitable (positive spread above threshold)
 */
export function filterProfitableOpportunities(
  opportunities: ArbitrageOpportunity[],
  threshold: number = ARBITRAGE_CONFIG.THRESHOLDS.PROFITABLE_SPREAD
): ArbitrageOpportunity[] {
  return opportunities.filter(op =>
    op.profitPercent != null && op.profitPercent > threshold
  );
}

/**
 * Filter opportunities with high profit potential
 */
export function filterHighProfitOpportunities(
  opportunities: ArbitrageOpportunity[],
  threshold: number = ARBITRAGE_CONFIG.THRESHOLDS.HIGH_PROFIT_SPREAD
): ArbitrageOpportunity[] {
  return opportunities.filter(op =>
    op.profitPercent != null && Math.abs(op.profitPercent) >= threshold
  );
}

/**
 * Filter unique opportunities by symbol, keeping the one with highest profit percentage
 */
export function filterUniqueOpportunities(
  opportunities: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  return opportunities.reduce((unique: ArbitrageOpportunity[], opp) => {
    const existingIndex = unique.findIndex(item => item.symbol === opp.symbol);

    if (existingIndex === -1) {
      unique.push(opp);
    } else if (
      Math.abs(opp.profitPercent) > Math.abs(unique[existingIndex].profitPercent)
    ) {
      unique[existingIndex] = opp;
    }

    return unique;
  }, []);
}

/**
 * Sort opportunities by profit percentage (highest absolute value first)
 */
export function sortByProfitPercent(
  opportunities: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  return [...opportunities].sort((a, b) =>
    Math.abs(b.profitPercent) - Math.abs(a.profitPercent)
  );
}

/**
 * Get count of opportunities above specified threshold
 * This is the main function used across different pages for consistency
 */
export function getOpportunityCount(
  opportunities: ArbitrageOpportunity[],
  config: {
    threshold?: number;
    onlyPositive?: boolean;
    useUniqueOnly?: boolean;
  } = {}
): number {
  const {
    threshold = ARBITRAGE_CONFIG.THRESHOLDS.PROFITABLE_SPREAD,
    onlyPositive = false,
    useUniqueOnly = false
  } = config;

  let filteredOpportunities = opportunities;

  // Apply unique filter if requested
  if (useUniqueOnly) {
    filteredOpportunities = filterUniqueOpportunities(filteredOpportunities);
  }

  // Apply threshold and positive filters
  return filteredOpportunities.filter(op => {
    if (op.profitPercent == null) return false;

    if (onlyPositive) {
      return op.profitPercent > threshold;
    } else {
      return Math.abs(op.profitPercent) > threshold;
    }
  }).length;
}

/**
 * Calculate aggregate statistics for opportunities
 */
export function getArbitrageStats(opportunities: ArbitrageOpportunity[]) {
  const uniqueOpportunities = filterUniqueOpportunities(opportunities);
  const profitableOpportunities = filterProfitableOpportunities(uniqueOpportunities);
  const highProfitOpportunities = filterHighProfitOpportunities(uniqueOpportunities);

  // Calculate average spread
  const validOpportunities = opportunities.filter(op =>
    op.profitPercent != null && !isNaN(op.profitPercent)
  );

  const avgSpread = validOpportunities.length > 0
    ? validOpportunities.reduce((sum, op) => sum + Math.abs(op.profitPercent), 0) / validOpportunities.length
    : 0;

  // Find best spread
  const bestSpread = validOpportunities.length > 0
    ? Math.max(...validOpportunities.map(op => op.profitPercent))
    : 0;

  // Calculate total volume
  const totalVolume = opportunities.reduce((sum, op) => sum + (op.volume24h || 0), 0);

  return {
    total: opportunities.length,
    unique: uniqueOpportunities.length,
    profitable: profitableOpportunities.length,
    highProfit: highProfitOpportunities.length,
    avgSpread,
    bestSpread,
    totalVolume,

    // Convenience methods for different page requirements
    landingPageCount: getOpportunityCount(opportunities, {
      threshold: ARBITRAGE_CONFIG.THRESHOLDS.PROFITABLE_SPREAD,
      onlyPositive: false,
      useUniqueOnly: false
    }),

    arbitragePageProfitable: getOpportunityCount(opportunities, {
      threshold: ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD,
      onlyPositive: true,
      useUniqueOnly: true
    }),

    marketOverviewCount: getOpportunityCount(opportunities, {
      threshold: ARBITRAGE_CONFIG.THRESHOLDS.PROFITABLE_SPREAD,
      onlyPositive: false,
      useUniqueOnly: false
    })
  };
}

/**
 * Assess risk level for an opportunity
 */
export function assessRisk(profitPercent: number): 'low' | 'medium' | 'high' {
  const absProfit = Math.abs(profitPercent);

  if (absProfit <= ARBITRAGE_CONFIG.RISK_LEVELS.LOW_RISK_MAX) {
    return 'low';
  } else if (absProfit <= ARBITRAGE_CONFIG.RISK_LEVELS.MEDIUM_RISK_MAX) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Check if an opportunity is considered profitable for alerts/notifications
 */
export function isProfitableForAlert(
  opportunity: ArbitrageOpportunity,
  alertThreshold: number = ARBITRAGE_CONFIG.THRESHOLDS.HIGH_PROFIT_SPREAD
): boolean {
  return opportunity.profitPercent != null &&
         Math.abs(opportunity.profitPercent) >= alertThreshold;
}

/**
 * Format opportunities for display with consistent sorting and filtering
 */
export function prepareOpportunitiesForDisplay(
  opportunities: ArbitrageOpportunity[],
  options: {
    useUniqueOnly?: boolean;
    minThreshold?: number;
    sortByProfit?: boolean;
    limit?: number;
  } = {}
): ArbitrageOpportunity[] {
  const {
    useUniqueOnly = true,
    minThreshold = ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD,
    sortByProfit = true,
    limit
  } = options;

  let result = opportunities;

  // Filter by minimum threshold
  result = filterByMinimumSpread(result, minThreshold);

  // Apply unique filter if requested
  if (useUniqueOnly) {
    result = filterUniqueOpportunities(result);
  }

  // Sort by profit if requested
  if (sortByProfit) {
    result = sortByProfitPercent(result);
  }

  // Limit results if specified
  if (limit && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

/**
 * Get market-wide statistics for display on different pages
 * This ensures consistent calculations across landing page, arbitrage page, and market overview
 */
export function getMarketStatistics(opportunities: ArbitrageOpportunity[]) {
  const stats = getArbitrageStats(opportunities);

  return {
    // Raw stats
    ...stats,

    // Formatted values for UI display
    formatted: {
      totalOpportunities: stats.unique,
      profitableCount: stats.profitable,
      highProfitCount: stats.highProfit,
      bestSpreadPercent: `${stats.bestSpread.toFixed(2)}%`,
      avgSpreadPercent: `${stats.avgSpread.toFixed(2)}%`,
      totalVolumeFormatted: formatVolume(stats.totalVolume),
    },

    // Page-specific counts for consistency
    counts: {
      landingPage: stats.landingPageCount,
      arbitragePage: stats.arbitragePageProfitable,
      marketOverview: stats.marketOverviewCount,
    }
  };
}

/**
 * Format volume for display consistency
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Load and process arbitrage data with consistent caching and error handling
 * Used by both landing page and arbitrage page for consistency
 */
export async function loadArbitrageDataCentralized(
  options: {
    useCache?: boolean;
    cacheKey?: string;
    onDataLoaded?: (data: ArbitrageOpportunity[], stats: ReturnType<typeof getArbitrageStats>) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    useCache = true,
    cacheKey = CACHE_KEYS.ARBITRAGE_DATA,
    onDataLoaded,
    onError
  } = options;

  try {
    // Check cache first if enabled
    if (useCache && typeof window !== "undefined") {
      const cachedData = getFromCache<ArbitrageOpportunity[]>(cacheKey);
      if (cachedData && !cachedData.isStale) {
        const stats = getArbitrageStats(cachedData.data);
        onDataLoaded?.(cachedData.data, stats);
        return { data: cachedData.data, stats, fromCache: true };
      }
    }

    // Fetch fresh data
    const response = await fetch(`/api/arbitrage?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch arbitrage data");
    }

    const data: ArbitrageOpportunity[] = await response.json();
    const stats = getArbitrageStats(data);

    // Cache the new data
    if (useCache && typeof window !== "undefined") {
      saveToCache(cacheKey, data);
    }

    onDataLoaded?.(data, stats);
    return { data, stats, fromCache: false };

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    onError?.(err);
    throw err;
  }
}

/**
 * Load arbitrage opportunities using chain service data (multi-chain approach)
 * This function compares DEX prices from the chain service with CEX prices
 */
export async function loadArbitrageDataFromChainService(
  options: {
    chainIndex: string;
    tokenPrices: Record<string, import('../types').TokenPriceData>;
    tokensForChain: import('../types').ExtendedTokenData[];
    useCache?: boolean;
    cacheKey?: string;
    onDataLoaded?: (data: ArbitrageOpportunity[], stats: ReturnType<typeof getArbitrageStats>) => void;
    onError?: (error: Error) => void;
  }
) {
  const {
    chainIndex,
    tokenPrices,
    tokensForChain,
    useCache = true,
    cacheKey = `${CACHE_KEYS.ARBITRAGE_DATA}_chain_${chainIndex}`,
    onDataLoaded,
    onError
  } = options;

  try {
    // Check cache first if enabled
    if (useCache && typeof window !== "undefined") {
      const cachedData = getFromCache<ArbitrageOpportunity[]>(cacheKey);
      if (cachedData && !cachedData.isStale) {
        const stats = getArbitrageStats(cachedData.data);
        onDataLoaded?.(cachedData.data, stats);
        return { data: cachedData.data, stats, fromCache: true };
      }
    }

    // Import CEX service dynamically to avoid server-side issues
    const { okxCEXService } = await import('./okx-cex');

    // Get symbols from tokens that have prices
    const tokensWithPrices = tokensForChain.filter(token =>
      tokenPrices[token.address] && tokenPrices[token.address].price > 0
    );

    if (tokensWithPrices.length === 0) {
      console.warn('No tokens with valid prices found for arbitrage analysis');
      const emptyResult = { data: [], stats: getArbitrageStats([]), fromCache: false };
      onDataLoaded?.([], emptyResult.stats);
      return emptyResult;
    }

    // Extract symbols for CEX price lookup
    const symbols = tokensWithPrices.map(token => token.symbol).filter(Boolean);

    // Fetch CEX prices
    console.log(`Fetching CEX prices for ${symbols.length} tokens on chain ${chainIndex}...`);
    const cexMarketData = await okxCEXService.getMarketData(symbols);

    // Create arbitrage opportunities by comparing DEX vs CEX prices
    const opportunities: ArbitrageOpportunity[] = [];

    for (const token of tokensWithPrices) {
      const dexPrice = tokenPrices[token.address];
      if (!dexPrice || !token.symbol) continue;

      // Find matching CEX data
      const cexData = cexMarketData.find(market =>
        market.instId.startsWith(token.symbol + '-USDT') ||
        market.instId.startsWith(token.symbol + '-USDC')
      );

      if (!cexData) continue;

      const cexPrice = parseFloat(cexData.last);
      const dexPriceUsd = dexPrice.price;

      if (cexPrice <= 0 || dexPriceUsd <= 0) continue;

      // Calculate spread: (DEX - CEX) / CEX * 100
      // Positive means DEX is higher (sell on DEX, buy on CEX)
      // Negative means CEX is higher (buy on DEX, sell on CEX)
      const profitPercent = ((dexPriceUsd - cexPrice) / cexPrice) * 100;

      // Only include opportunities that meet minimum threshold
      if (Math.abs(profitPercent) < ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD) {
        continue;
      }

      const opportunity: ArbitrageOpportunity = {
        symbol: token.symbol,
        tokenAddress: token.address,
        dexPrice: dexPriceUsd,
        cexPrice: cexPrice,
        profitPercent,
        volume24h: parseFloat(cexData.vol24h) || 0,
        liquidity: dexPrice.volume24H || 0,
        lastUpdated: new Date(),
        risk: getRiskLevel(Math.abs(profitPercent))
      };

      opportunities.push(opportunity);
    }

    // Sort by absolute profit percentage (highest spreads first)
    opportunities.sort((a, b) => Math.abs(b.profitPercent) - Math.abs(a.profitPercent));

    const stats = getArbitrageStats(opportunities);

    // Cache the new data
    if (useCache && typeof window !== "undefined") {
      saveToCache(cacheKey, opportunities);
    }

    console.log(`Found ${opportunities.length} arbitrage opportunities on chain ${chainIndex}`);
    onDataLoaded?.(opportunities, stats);
    return { data: opportunities, stats, fromCache: false };

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Error loading chain service arbitrage data:', err);
    onError?.(err);
    throw err;
  }
}

/**
 * Helper function to get chain name from index
 */
function getChainName(chainIndex: string): string {
  const chainNames: Record<string, string> = {
    '1': 'Ethereum',
    '501': 'Solana',
    '56': 'BSC',
    '137': 'Polygon',
    '43114': 'Avalanche',
    '250': 'Fantom',
    '42161': 'Arbitrum',
    '10': 'Optimism'
  };
  return chainNames[chainIndex] || `Chain ${chainIndex}`;
}

/**
 * Helper function to determine risk level based on spread
 */
function getRiskLevel(spreadPercent: number): 'low' | 'medium' | 'high' {
  if (spreadPercent <= ARBITRAGE_CONFIG.RISK_LEVELS.LOW_RISK_MAX) {
    return 'low';
  } else if (spreadPercent <= ARBITRAGE_CONFIG.RISK_LEVELS.MEDIUM_RISK_MAX) {
    return 'medium';
  } else {
    return 'high';
  }
}
