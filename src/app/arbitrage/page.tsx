"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useChainService } from "@/lib/use-chain-service";
import { okxService } from "@/lib/okx";
import { notificationService } from "@/lib/notifications";
import { CACHE_KEYS, getFromCache, saveToCache } from "@/lib/cache-utils";
import { isMobileDevice, getOptimalRenderCount } from "@/lib/device-utils";
import {
  filterUniqueOpportunities,
  sortByProfitPercent,
  filterProfitableOpportunities,
  isProfitableForAlert,
  getArbitrageStats,
  prepareOpportunitiesForDisplay,
  getMarketStatistics,
  loadArbitrageDataCentralized,
  loadArbitrageDataFromChainService,
  ARBITRAGE_CONFIG,
} from "@/lib/arbitrage-utils";
import type { ArbitrageOpportunity } from "@/types";

export default function ArbitragePage() {
  // Chain service integration
  const {
    selectedChain,
    tokensForSelectedChain,
    tokenPrices,
    isLoading: isChainLoading,
  } = useChainService();

  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(1.0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Wait for chain service to be ready
    if (isChainLoading || !selectedChain) {
      return;
    }

    // First try to load from cache for immediate display
    loadCachedData();

    // Only fetch fresh data if cache is stale or empty
    const cachedArbitrage = getFromCache<ArbitrageOpportunity[]>(
      CACHE_KEYS.ARBITRAGE_DATA
    );
    if (!cachedArbitrage || cachedArbitrage.isStale) {
      loadArbitrageData();
    }

    // Set the last updated time on client-side only
    if (typeof window !== "undefined") {
      setLastUpdated(new Date());
    }
  }, [selectedChain, isChainLoading]); // Re-run when chain changes

  const loadCachedData = () => {
    if (typeof window === "undefined") return;

    const cachedArbitrage = getFromCache<ArbitrageOpportunity[]>(
      CACHE_KEYS.ARBITRAGE_DATA
    );
    if (cachedArbitrage) {
      setOpportunities(cachedArbitrage.data);
      setIsRefreshing(cachedArbitrage.isStale);
      setIsLoading(false);

      // Set last updated timestamp from cache on client-side only
      try {
        const cachedItem = localStorage.getItem(CACHE_KEYS.ARBITRAGE_DATA);
        if (cachedItem) {
          const parsedItem = JSON.parse(cachedItem);
          if (parsedItem && parsedItem.timestamp) {
            const date = new Date();
            date.setTime(parsedItem.timestamp);
            setLastUpdated(date);
          }
        }
      } catch (e) {
        console.error("Error parsing cached timestamp:", e);
      }
    }
  };

  const loadArbitrageData = async () => {
    // Ensure we have chain service data
    if (
      !selectedChain ||
      Object.keys(tokenPrices).length === 0 ||
      tokensForSelectedChain.length === 0
    ) {
      console.warn("Chain service not ready for arbitrage analysis");
      return;
    }

    // If we already have data from cache, show refreshing state
    if (!isLoading) {
      setIsRefreshing(true);
    }

    try {
      // Use chain service data for arbitrage analysis
      const result = await loadArbitrageDataFromChainService({
        chainIndex: selectedChain.chainIndex,
        tokenPrices,
        tokensForChain: tokensForSelectedChain,
        useCache: true,
        cacheKey: `${CACHE_KEYS.ARBITRAGE_DATA}_chain_${selectedChain.chainIndex}`,
        onDataLoaded: (data: ArbitrageOpportunity[], stats) => {
          // Check for high-profit opportunities and send notifications
          if (notificationsEnabled) {
            data.forEach((opportunity: ArbitrageOpportunity) => {
              if (isProfitableForAlert(opportunity, alertThreshold)) {
                notificationService.notifyArbitrageOpportunity(
                  opportunity.symbol,
                  opportunity.profitPercent
                );
              }
            });
          }
        },
        onError: (error: Error) => {
          console.error("Error loading arbitrage data:", error);
        },
      });

      setOpportunities(result.data);

      // Only update the timestamp on the client side
      if (typeof window !== "undefined") {
        const currentTime = new Date();
        setLastUpdated(currentTime);
      }
    } catch (error) {
      console.error("Error loading arbitrage data:", error);
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
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(1)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "--:--:--";
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  };

  const getSpreadColor = (spreadPercentage: number) => {
    if (spreadPercentage > 0.5) return "text-green-400";
    if (spreadPercentage > 0) return "text-green-300";
    if (spreadPercentage > -0.5) return "text-red-300";
    return "text-red-400";
  };

  const getSpreadIcon = (spreadPercentage: number) => {
    return spreadPercentage >= 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  // Calculate all stats using centralized utility for consistency
  const arbitrageStats = useMemo(() => {
    return getArbitrageStats(opportunities);
  }, [opportunities]);

  // Use centralized display preparation
  const displayOpportunities = useMemo(() => {
    return prepareOpportunitiesForDisplay(opportunities, {
      useUniqueOnly: true,
      minThreshold: ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD,
      sortByProfit: true,
    });
  }, [opportunities]);

  // Backward compatibility for existing code
  const uniqueOpportunities = useMemo(() => {
    return filterUniqueOpportunities(opportunities);
  }, [opportunities]);

  const sortedOpportunities = useMemo(() => {
    return sortByProfitPercent(uniqueOpportunities);
  }, [uniqueOpportunities]);

  const profitableOpportunities = useMemo(() => {
    return filterProfitableOpportunities(
      uniqueOpportunities,
      ARBITRAGE_CONFIG.THRESHOLDS.MINIMUM_SPREAD
    );
  }, [uniqueOpportunities]);

  const totalVolume = useMemo(() => {
    return arbitrageStats.totalVolume;
  }, [arbitrageStats]);

  const enableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationsEnabled(granted);
  };

  // Use centralized best spread calculation
  const bestSpread = useMemo(() => {
    return `${arbitrageStats.bestSpread.toFixed(2)}%`;
  }, [arbitrageStats]);

  // Limit the number of displayed opportunities based on device performance
  const renderOpportunityCards = useMemo(() => {
    if (isLoading && opportunities.length === 0) {
      return (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400">Loading arbitrage opportunities...</p>
        </div>
      );
    }

    if (opportunities.length === 0 && !isLoading) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">
            No arbitrage opportunities found at the moment.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try refreshing or check back later.
          </p>
        </div>
      );
    }

    // Limit the number of items rendered on mobile devices
    const isMobile = isMobileDevice();
    const optimizedOpportunities = isMobile
      ? sortedOpportunities.slice(
          0,
          getOptimalRenderCount(sortedOpportunities.length)
        )
      : sortedOpportunities;

    return (
      <div
        className={`space-y-4 ${
          isRefreshing ? "opacity-80 transition-opacity" : ""
        }`}
      >
        {optimizedOpportunities.map((opportunity, index) => (
          <div
            key={index}
            className="p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-primary-500/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <span className="font-bold text-primary-400">
                    {opportunity.symbol?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {opportunity.symbol || "Unknown"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    24h Volume: {formatVolume(opportunity.volume24h)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">DEX Price</p>
                  <p className="font-semibold">
                    {formatCurrency(opportunity.dexPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">CEX Price</p>
                  <p className="font-semibold">
                    {formatCurrency(opportunity.cexPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Spread</p>
                  <div
                    className={`flex items-center justify-center space-x-1 ${getSpreadColor(
                      opportunity.profitPercent
                    )}`}
                  >
                    {getSpreadIcon(opportunity.profitPercent)}
                    <span className="font-bold">
                      {opportunity.profitPercent >= 0 ? "+" : ""}
                      {opportunity.profitPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {opportunity.profitPercent > 0.5 && (
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    PROFITABLE
                  </div>
                )}
                <Link href="/chat" className="btn-secondary text-sm">
                  Analyze
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Show a message if we limited the results on mobile */}
        {isMobile &&
          sortedOpportunities.length > optimizedOpportunities.length && (
            <div className="text-center text-xs text-gray-500 mt-2">
              Showing top {optimizedOpportunities.length} of{" "}
              {sortedOpportunities.length} opportunities for better performance.
            </div>
          )}
      </div>
    );
  }, [sortedOpportunities, isLoading, isRefreshing, opportunities.length]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <ArrowUpDown className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-xl font-bold">Arbitrage Scanner</h1>
              <div className="flex items-center">
                <p className="text-sm text-gray-400 mr-2">
                  OKX DEX vs CEX price differences
                </p>
                {isRefreshing && (
                  <span className="flex items-center text-xs text-blue-400">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Refreshing...
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right text-sm">
              <div className="text-gray-400">Last updated:</div>
              <div className="text-white">{formatTime(lastUpdated)}</div>
            </div>
            <button
              onClick={loadArbitrageData}
              className="btn-secondary flex items-center space-x-2"
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isLoading || isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Opportunities</p>
                <p className="text-2xl font-bold">{arbitrageStats.unique}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Profitable</p>
                <p className="text-2xl font-bold text-green-400">
                  {arbitrageStats.profitable}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-2xl font-bold">
                  {formatVolume(arbitrageStats.totalVolume)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="card p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Best Spread</p>
                <p className="text-2xl font-bold text-green-400">
                  {bestSpread}
                </p>
              </div>
              <ArrowUpDown className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Current Opportunities</h2>
            <div className="flex items-center space-x-2 text-sm">
              {isRefreshing ? (
                <span className="flex items-center text-blue-400">
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Refreshing data...
                </span>
              ) : (
                <span className="flex items-center text-gray-400">
                  <Clock className="w-4 h-4 mr-1" />
                  Click refresh to update data
                </span>
              )}
            </div>
          </div>

          {renderOpportunityCards}
        </div>

        {/* Info Section */}
        <div className="mt-8 card bg-yellow-500/5 border-yellow-500/20">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">
                Important Notice
              </h3>
              <p className="text-sm text-gray-300 mb-2">
                Arbitrage opportunities shown are for informational purposes
                only. Consider the following before trading:
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>
                  • Transaction fees and gas costs may reduce or eliminate
                  profits
                </li>
                <li>
                  • Price movements can occur rapidly, eliminating opportunities
                </li>
                <li>• Slippage may affect actual execution prices</li>
                <li>
                  • Always verify prices on both platforms before executing
                  trades
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
