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
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import CandlePopup from "@/components/CandlePopup";
import { useChainService } from "@/lib/use-chain-service";
import { trendingService } from "@/lib/trending-service";
import { CACHE_KEYS, getFromCache, saveToCache } from "@/lib/cache-utils";
import type { TrendingToken } from "@/lib/trending-service";

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
  // Chain service integration
  const { selectedChain, isLoading: isChainLoading } = useChainService();

  // Start with default data while real data loads
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [sortBy, setSortBy] = useState<
    "trendScore" | "change24h" | "volume24h"
  >("trendScore");
  // Timeframe switching is WIP - currently all data is 24h
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Candle popup state
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showCandlePopup, setShowCandlePopup] = useState(false);

  useEffect(() => {
    // Set mounted state to prevent hydration errors
    setIsMounted(true);

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
  }, [selectedChain]); // Re-run when selected chain changes

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
            console.log(`Last updated: ${formatTime(date)}`);
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
      console.log("Analyzing trending tokens using chain service...");

      // Use trending service with chain service integration
      const chainIndex = selectedChain?.chainIndex;
      if (!chainIndex) {
        console.warn("No chain selected for trending analysis");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const data = await trendingService.analyzeTrendingTokens(chainIndex);
      console.log(`Received ${data.length} trending tokens from analysis`);

      if (Array.isArray(data) && data.length > 0) {
        setTrendingTokens(data);
        setLastUpdated(new Date());

        // Cache the data
        if (typeof window !== "undefined") {
          saveToCache(CACHE_KEYS.TRENDING_DATA, data);
        }
      } else {
        console.warn("No trending data received from analysis");
        // Keep existing data if available
        if (trendingTokens.length === 0) {
          setTrendingTokens(DEFAULT_TRENDING_TOKENS);
        }
      }
    } catch (error) {
      console.error("Error loading trending data:", error);
      // Keep existing data on error, or use defaults
      if (trendingTokens.length === 0) {
        setTrendingTokens(DEFAULT_TRENDING_TOKENS);
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

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
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

  const handleTokenClick = (symbol: string) => {
    setSelectedToken(symbol);
    setShowCandlePopup(true);
  };

  const handleCloseCandlePopup = () => {
    setShowCandlePopup(false);
    setSelectedToken(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <Flame className="w-6 h-6 md:w-8 md:h-8 text-primary-500" />
            <div>
              <h1 className="text-lg md:text-xl font-bold">Trending Radar</h1>
              <div className="flex flex-col md:flex-row md:items-center">
                <p className="text-xs md:text-sm text-gray-400 md:mr-2">
                  Hot tokens with momentum & buzz
                </p>
                <div className="flex items-center mt-1 md:mt-0">
                  {lastUpdated && isMounted && (
                    <span className="text-xs text-gray-500">
                      Updated: {formatTime(lastUpdated)}
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
          </div>
          <button
            onClick={loadTrendingData}
            className={`flex items-center space-x-1 md:space-x-2 px-3 py-1 md:px-4 md:py-2 ${
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
            <span className="text-sm md:text-base">
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 w-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                <AlertCircle className="w-4 h-4 inline mr-1 text-yellow-500" />
                WIP Timeframe:
              </span>
              <div className="relative flex space-x-1">
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
                      disabled={true}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Trending Tokens</p>
                <p className="text-2xl font-bold">{trendingTokens.length}</p>
              </div>
              <Flame className="w-6 h-6 md:w-8 md:h-8 text-orange-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
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
                      ).toFixed(2)
                    : "0.00"}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Social Mentions*</p>
                <p className="text-2xl font-bold text-blue-400">
                  {trendingTokens
                    .reduce((sum, token) => sum + token.socialMentions, 0)
                    .toString()}
                </p>
              </div>
              <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
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
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Trending Tokens Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🔥 Trending Tokens</h2>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-400 hidden md:block">
                Click any token to view 1H candle data
              </p>
              {isRefreshing && (
                <span className="flex items-center text-sm text-blue-400">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Refreshing data...
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-400">Loading trending tokens...</p>
            </div>
          ) : (
            <div
              className={`${
                isRefreshing ? "opacity-80 transition-opacity" : ""
              }`}
            >
              {/* Table Header - Hidden on mobile */}
              <div className="hidden md:grid md:grid-cols-8 gap-4 p-4 border-b border-dark-border text-sm text-gray-400 font-semibold">
                <div className="col-span-2">Token</div>
                <div className="text-right">Price</div>
                <div className="text-right">24h Change</div>
                <div className="text-right">Volume 24h</div>
                <div className="text-right">Market Cap</div>
                <div className="text-right">Social Buzz</div>
                <div className="text-right">Trend Score</div>
              </div>

              {/* Token Rows */}
              <div className="space-y-2 md:space-y-0">
                {getSortedTokens().map((token, index) => (
                  <div
                    key={index}
                    className="group p-4 bg-dark-bg md:bg-transparent rounded-lg md:rounded-none border border-dark-border md:border-0 md:border-b md:border-dark-border hover:bg-dark-card/50 transition-colors md:grid md:grid-cols-8 md:gap-4 md:items-center relative cursor-pointer"
                    onClick={() => handleTokenClick(token.symbol)}
                  >
                    {/* Token Info - Mobile: Full width, Desktop: 2 columns */}
                    <div className="col-span-2 flex items-center space-x-3 mb-4 md:mb-0">
                      <span className="text-lg font-bold text-gray-500 min-w-[2rem]">
                        #{index + 1}
                      </span>
                      <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary-400">
                          {token.symbol.charAt(0)}
                        </span>
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
                        <p className="text-sm text-gray-400 md:hidden">
                          Market Cap: {formatMarketCap(token.marketCap)}
                        </p>
                      </div>
                    </div>

                    {/* Mobile: Grid layout for stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4 md:hidden">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Price</p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(token.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">24h Change</p>
                        <div
                          className={`flex items-center space-x-1 ${getChangeColor(
                            token.change24h
                          )}`}
                        >
                          {getChangeIcon(token.change24h)}
                          <span className="text-sm font-bold">
                            {token.change24h >= 0 ? "+" : ""}
                            {token.change24h.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Volume 24h</p>
                        <p className="text-sm font-semibold">
                          {formatVolume(token.volume24h)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Social Buzz
                        </p>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-400">
                            {token.socialMentions}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop: Individual columns */}
                    <div className="hidden md:block text-right">
                      <p className="font-semibold">
                        {formatCurrency(token.price)}
                      </p>
                    </div>

                    <div className="hidden md:block text-right">
                      <div
                        className={`flex items-center justify-end space-x-1 ${getChangeColor(
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

                    <div className="hidden md:block text-right">
                      <p className="font-semibold">
                        {formatVolume(token.volume24h)}
                      </p>
                    </div>

                    <div className="hidden md:block text-right">
                      <p className="font-semibold text-gray-300">
                        {formatMarketCap(token.marketCap)}
                      </p>
                    </div>

                    <div className="hidden md:block text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <MessageCircle className="w-3 h-3 text-blue-400" />
                        <span className="font-semibold text-blue-400">
                          {token.socialMentions}
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block text-right">
                      <p
                        className={`text-xl font-bold ${getTrendScoreColor(
                          token.trendScore
                        )}`}
                      >
                        {token.trendScore.toFixed(2)}
                      </p>
                    </div>

                    {/* Mobile: Bottom row with trend score and analyze button */}
                    <div className="flex items-center justify-between md:hidden">
                      <div>
                        <p className="text-xs text-gray-400">Trend Score</p>
                        <p
                          className={`text-xl font-bold ${getTrendScoreColor(
                            token.trendScore
                          )}`}
                        >
                          {token.trendScore.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Link
                          href="/chat"
                          className="btn-secondary text-xs px-3 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Analyze
                        </Link>
                        <p className="text-xs text-gray-400 text-center">
                          Tap for candles
                        </p>
                      </div>
                    </div>

                    {/* Desktop: Analyze button overlay on hover */}
                    <div className="hidden md:block absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href="/chat"
                        className="btn-secondary text-sm px-3 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Analyze
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 card bg-blue-500/5 border-blue-500/20 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-3">
            <Eye className="w-6 h-6 text-blue-400 mb-3 md:mb-0 md:mt-1" />
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

      {/* Candle Popup */}
      <CandlePopup
        symbol={selectedToken || ""}
        isOpen={showCandlePopup}
        onClose={handleCloseCandlePopup}
      />
    </div>
  );
}
