"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Zap,
  RefreshCw,
} from "lucide-react";
import { okxService } from "@/lib/okx";
import { CACHE_KEYS, getFromCache, saveToCache } from "@/lib/cache-utils";
import type { TrendingToken } from "@/types";
import type { ArbitrageOpportunity } from "@/lib/okx";

interface MarketStats {
  totalVolume24h: number;
  totalArbitrageOpportunities: number;
  activeTraders: number;
  avgSpread: number;
}

export default function MarketOverview() {
  const [marketStats, setMarketStats] = useState<MarketStats>({
    totalVolume24h: 0,
    totalArbitrageOpportunities: 0,
    activeTraders: 0,
    avgSpread: 0,
  });
  const [topTrending, setTopTrending] = useState<TrendingToken[]>([]);
  const [topArbitrage, setTopArbitrage] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // First try to load from cache
    loadCachedData();
    // Then fetch fresh data in the background
    loadMarketData();
  }, []);

  const loadCachedData = () => {
    if (typeof window === "undefined") return;

    let hasLoadedAnyCache = false;

    // Try to load trending data from cache
    const trendingCache = getFromCache<TrendingToken[]>(
      CACHE_KEYS.TRENDING_DATA
    );
    if (trendingCache) {
      setTopTrending(trendingCache.data.slice(0, 3));
      setIsRefreshing(trendingCache.isStale);
      hasLoadedAnyCache = true;
    }

    // Try to load arbitrage data from cache
    const arbitrageCache = getFromCache<ArbitrageOpportunity[]>(
      CACHE_KEYS.ARBITRAGE_DATA
    );
    if (arbitrageCache) {
      setTopArbitrage(arbitrageCache.data.slice(0, 3));
      setIsRefreshing(arbitrageCache.isStale);
      hasLoadedAnyCache = true;
    }

    // Try to load market stats from cache
    const statsCache = getFromCache<MarketStats>(CACHE_KEYS.MARKET_STATS);
    if (statsCache) {
      setMarketStats(statsCache.data);
      setIsRefreshing(statsCache.isStale);
      hasLoadedAnyCache = true;

      // Set last updated timestamp from cache
      const timestamp = new Date();
      try {
        const cachedItem = localStorage.getItem(CACHE_KEYS.MARKET_STATS);
        if (cachedItem) {
          const { timestamp: cachedTimestamp } = JSON.parse(cachedItem);
          if (cachedTimestamp) {
            timestamp.setTime(cachedTimestamp);
          }
        }
      } catch (e) {
        console.error("Error parsing cached timestamp:", e);
      }

      setLastUpdated(timestamp);
    }

    // If we've loaded any cache data, we don't need to show the full loading state
    if (hasLoadedAnyCache) {
      setIsLoading(false);
    }
  };

  const loadMarketData = async () => {
    // If we're not already in loading state, show refreshing indicator
    if (!isLoading) {
      setIsRefreshing(true);
    }

    try {
      // Load trending tokens and arbitrage opportunities
      const [trending, arbitrage] = await Promise.all([
        okxService.getTrendingTokens(),
        okxService.getArbitrageOpportunities(),
      ]);

      // Save to cache
      if (typeof window !== "undefined") {
        saveToCache(CACHE_KEYS.TRENDING_DATA, trending);
        saveToCache(CACHE_KEYS.ARBITRAGE_DATA, arbitrage);
      }

      setTopTrending(trending.slice(0, 3));
      setTopArbitrage(arbitrage.slice(0, 3));

      // Calculate market stats
      const totalVolume = trending.reduce(
        (sum, token) => sum + token.volume24h,
        0
      );
      const avgSpread =
        arbitrage.length > 0
          ? arbitrage.reduce(
              (sum, opp) => sum + Math.abs(opp.profitPercent),
              0
            ) / arbitrage.length
          : 0;

      const newStats = {
        totalVolume24h: totalVolume,
        totalArbitrageOpportunities: arbitrage.filter(
          (opp) => Math.abs(opp.profitPercent) > 0.5
        ).length,
        activeTraders: trending.reduce(
          (sum, token) => sum + token.socialMentions,
          0
        ), // Use social mentions as proxy for active traders
        avgSpread,
      };

      // Save stats to cache
      if (typeof window !== "undefined") {
        saveToCache(CACHE_KEYS.MARKET_STATS, newStats);
      }

      setMarketStats(newStats);

      const currentTime = new Date();
      setLastUpdated(currentTime);
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(1)}B`;
    } else if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(1)}M`;
    }
    return `$${(volume / 1_000).toFixed(1)}K`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-dark-card border border-dark-border rounded-xl p-6 animate-pulse"
          >
            <div className="w-8 h-8 bg-gray-700 rounded-lg mb-4"></div>
            <div className="w-20 h-6 bg-gray-700 rounded mb-2"></div>
            <div className="w-16 h-4 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Stats + Refresh */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            {lastUpdated ? `Last updated: ${formatTime(lastUpdated)}` : ""}
          </span>
          {isRefreshing && (
            <span className="flex items-center text-xs text-blue-400">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Refreshing...
            </span>
          )}
        </div>
        <button
          onClick={loadMarketData}
          className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          disabled={isLoading || isRefreshing}
          title="Refresh"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1 1 19 5.635"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">24h Volume</p>
              <p className="text-2xl font-bold text-white">
                {formatVolume(marketStats.totalVolume24h)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-green-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Arbitrage Ops</p>
              <p className="text-2xl font-bold text-white">
                {marketStats.totalArbitrageOpportunities}
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Traders*</p>
              <p className="text-2xl font-bold text-white">
                {marketStats.activeTraders.toString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-orange-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Spread</p>
              <p className="text-2xl font-bold text-white">
                {marketStats.avgSpread.toFixed(2)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Top Trending & Arbitrage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Trending */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-orange-400 mr-2" />
            Top Trending
            {isRefreshing && (
              <RefreshCw className="w-3 h-3 ml-2 text-blue-400 animate-spin" />
            )}
          </h3>
          <div className="space-y-3">
            {topTrending.length === 0 && !isLoading && (
              <div className="text-gray-400 text-sm">
                No trending tokens found.
              </div>
            )}
            {topTrending.map((token, index) => (
              <div
                key={token.address}
                className={`flex items-center justify-between ${
                  isRefreshing ? "opacity-80 transition-opacity" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400 w-4">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{token.symbol}</p>
                    <p className="text-sm text-gray-400">
                      {formatVolume(token.volume24h)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    {formatCurrency(token.price)}
                  </p>
                  <div
                    className={`flex items-center text-sm ${
                      token.change24h >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {token.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(token.change24h).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Arbitrage */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 text-green-400 mr-2" />
            Top Arbitrage
            {isRefreshing && (
              <RefreshCw className="w-3 h-3 ml-2 text-blue-400 animate-spin" />
            )}
          </h3>
          <div className="space-y-3">
            {topArbitrage.length === 0 && !isLoading && (
              <div className="text-gray-400 text-sm">
                No arbitrage opportunities found.
              </div>
            )}
            {topArbitrage.map((opp, index) => (
              <div
                key={`${opp.symbol}-${index}`}
                className={`flex items-center justify-between ${
                  isRefreshing ? "opacity-80 transition-opacity" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400 w-4">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{opp.symbol}</p>
                    <p className="text-sm text-gray-400">
                      {formatVolume(opp.volume24h)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    {formatCurrency(Math.abs(opp.priceSpread))}
                  </p>
                  <div
                    className={`text-sm ${
                      opp.profitPercent >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {opp.profitPercent >= 0 ? "+" : ""}
                    {opp.profitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
