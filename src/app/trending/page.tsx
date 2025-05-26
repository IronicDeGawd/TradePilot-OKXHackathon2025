"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Star,
  MessageCircle,
  BarChart3,
  Flame,
  Eye,
  DollarSign,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { okxService } from "@/lib/okx";
import { CACHE_KEYS, getFromCache, saveToCache } from "@/lib/cache-utils";
import type { TrendingToken } from "@/types";

// Default trending data to show while API loads
const DEFAULT_TRENDING_TOKENS: TrendingToken[] = [
  {
    symbol: "SOL",
    address: "So11111111111111111111111111111111111111112",
    price: 142.35,
    change24h: 2.1,
    volume24h: 1527000,
    marketCap: 66714341970,
    socialMentions: 3500,
    trendScore: 87,
    lastUpdated: new Date(),
  },
  {
    symbol: "JUP",
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    price: 0.72,
    change24h: 5.8,
    volume24h: 742000,
    marketCap: 7200000000,
    socialMentions: 2100,
    trendScore: 93,
    lastUpdated: new Date(),
  },
];

export default function TrendingPage() {
  // Start with default data while real data loads
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [sortBy, setSortBy] = useState<
    "trendScore" | "change24h" | "volume24h"
  >("trendScore");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  useEffect(() => {
    // First load default data if no cached data
    if (trendingTokens.length === 0) {
      setTrendingTokens(DEFAULT_TRENDING_TOKENS);
    }

    // Then try to load from cache
    loadCachedData();

    // Then fetch fresh data with slight delay to improve perceived performance
    const timer = setTimeout(() => {
      loadTrendingData();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const loadCachedData = () => {
    if (typeof window === "undefined") return;

    console.log("Attempting to load trending data from cache...");
    const cachedTrending = getFromCache<TrendingToken[]>(
      CACHE_KEYS.TRENDING_DATA
    );

    if (
      cachedTrending &&
      Array.isArray(cachedTrending.data) &&
      cachedTrending.data.length > 0
    ) {
      console.log(
        `Loaded ${cachedTrending.data.length} trending tokens from cache`
      );
      setTrendingTokens(cachedTrending.data);
      setIsRefreshing(cachedTrending.isStale);
      setIsLoading(false);

      // Set last updated timestamp from cache directly from the cachedTrending object
      try {
        const cachedItem = localStorage.getItem(CACHE_KEYS.TRENDING_DATA);
        if (cachedItem) {
          const parsedItem = JSON.parse(cachedItem);
          if (parsedItem && parsedItem.timestamp) {
            const date = new Date(parsedItem.timestamp);
            setLastUpdated(date);
            console.log(`Last updated: ${date.toLocaleString()}`);
          }
        }
      } catch (e) {
        console.error("Error parsing cached timestamp:", e);
      }
    } else {
      console.log("No valid trending data found in cache");
    }
  };

  const loadTrendingData = async () => {
    // If we already have data from cache, show refreshing state
    if (!isLoading) {
      setIsRefreshing(true);
    }

    try {
      console.log("Fetching trending data from API...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch("/api/trending", {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch trending data: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Received ${data.length} trending tokens from API`);

      if (Array.isArray(data) && data.length > 0) {
        setTrendingTokens(data);
        setLastUpdated(new Date());

        // Cache the data
        if (typeof window !== "undefined") {
          saveToCache(CACHE_KEYS.TRENDING_DATA, data);
        }
      } else {
        console.error("API returned empty or invalid trending data");
      }
    } catch (error) {
      console.error("Error loading trending data:", error);
      // If we have cached data, keep using it
      const cachedTrending = getFromCache<TrendingToken[]>(
        CACHE_KEYS.TRENDING_DATA
      );
      if (cachedTrending && !trendingTokens.length) {
        setTrendingTokens(cachedTrending.data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toFixed(1)}B`;
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toFixed(1)}M`;
    } else if (marketCap >= 1_000) {
      return `$${(marketCap / 1_000).toFixed(1)}K`;
    }
    return `$${marketCap.toFixed(0)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(1)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const getTrendScoreColor = (score: number) => {
    if (score >= 90) return "text-red-400";
    if (score >= 75) return "text-orange-400";
    if (score >= 50) return "text-yellow-400";
    return "text-gray-400";
  };

  const getTrendScoreLabel = (score: number) => {
    if (score >= 90) return "HOT";
    if (score >= 75) return "TRENDING";
    if (score >= 50) return "WARM";
    return "COOL";
  };

  const getSortedTokens = () => {
    return [...trendingTokens].sort((a, b) => {
      switch (sortBy) {
        case "change24h":
          return b.change24h - a.change24h;
        case "volume24h":
          return b.volume24h - a.volume24h;
        default:
          return b.trendScore - a.trendScore;
      }
    });
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "text-green-400" : "text-red-400";
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Flame className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-xl font-bold">Trending Radar</h1>
              <div className="flex items-center">
                <p className="text-sm text-gray-400 mr-2">
                  Hot tokens with momentum & buzz
                </p>
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                {isRefreshing && (
                  <span className="flex items-center text-xs text-blue-400 ml-2">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Refreshing...
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={loadTrendingData}
            className={`flex items-center space-x-2 ${
              isLoading || isRefreshing
                ? "btn-secondary opacity-80"
                : "btn-secondary"
            }`}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading || isRefreshing ? "animate-spin text-blue-400" : ""
              }`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Timeframe:</span>
              <div className="flex bg-dark-card rounded-lg p-1">
                {["1h", "24h", "7d"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf as any)}
                    className={`px-3 py-1 text-sm rounded ${
                      timeframe === tf
                        ? "bg-primary-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="trendScore">Trend Score</option>
              <option value="change24h">Price Change</option>
              <option value="volume24h">Volume</option>
            </select>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Trending Tokens</p>
                <p className="text-2xl font-bold">{trendingTokens.length}</p>
              </div>
              <Flame className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Trend Score</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {trendingTokens.length > 0
                    ? (
                        trendingTokens.reduce(
                          (sum, token) => sum + token.trendScore,
                          0
                        ) / trendingTokens.length
                      ).toFixed(0)
                    : "0"}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Social Mentions</p>
                <p className="text-2xl font-bold text-blue-400">
                  {trendingTokens
                    .reduce((sum, token) => sum + token.socialMentions, 0)
                    .toLocaleString()}
                </p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatVolume(
                    trendingTokens.reduce(
                      (sum, token) => sum + token.volume24h,
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Trending Tokens List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🔥 Trending Tokens</h2>
            {isRefreshing && (
              <span className="flex items-center text-sm text-blue-400">
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Refreshing data...
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-400">Loading trending tokens...</p>
            </div>
          ) : (
            <div
              className={`space-y-4 ${
                isRefreshing ? "opacity-80 transition-opacity" : ""
              }`}
            >
              {getSortedTokens().map((token, index) => (
                <div
                  key={index}
                  className="p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-primary-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-500">
                          #{index + 1}
                        </span>
                        <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                          <span className="font-bold text-primary-400">
                            {token.symbol.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">
                            {token.symbol}
                          </h3>
                          <div
                            className={`px-2 py-1 rounded text-xs font-bold ${getTrendScoreColor(
                              token.trendScore
                            )} bg-opacity-20`}
                          >
                            {getTrendScoreLabel(token.trendScore)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          Market Cap: {formatMarketCap(token.marketCap)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Price</p>
                        <p className="font-semibold">
                          {formatCurrency(token.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">24h Change</p>
                        <div
                          className={`flex items-center justify-center space-x-1 ${getChangeColor(
                            token.change24h
                          )}`}
                        >
                          {getChangeIcon(token.change24h)}
                          <span className="font-bold">
                            {token.change24h >= 0 ? "+" : ""}
                            {token.change24h.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Volume 24h</p>
                        <p className="font-semibold">
                          {formatVolume(token.volume24h)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Social Buzz*
                        </p>
                        <div className="flex items-center justify-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-blue-400" />
                          <span className="font-semibold text-blue-400">
                            {token.socialMentions}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Trend Score</p>
                        <p
                          className={`text-2xl font-bold ${getTrendScoreColor(
                            token.trendScore
                          )}`}
                        >
                          {token.trendScore}
                        </p>
                      </div>
                      <Link href="/chat" className="btn-secondary text-sm">
                        Analyze
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 card bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start space-x-3">
            <Eye className="w-6 h-6 text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">
                Trend Analysis
              </h3>
              <p className="text-sm text-gray-300">
                Trend scores are calculated based on price momentum, volume
                changes, and market activity. Social buzz metrics (*) are
                estimated based on trading volume and price volatility until
                real social media API integration is implemented. High trend
                scores indicate tokens with significant buzz and price movement,
                but always conduct your own research before trading.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
