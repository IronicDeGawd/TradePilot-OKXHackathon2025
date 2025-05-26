"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  PieChart,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { okxService } from "@/lib/okx";
import type { Portfolio, TokenBalance, TradingSuggestion } from "@/types";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [suggestions, setSuggestions] = useState<TradingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      // Use environment wallet address for API call
      const walletAddress = process.env.NEXT_PUBLIC_SOLANA_WALLET_ADDRESS;
      const response = await fetch(
        `/api/portfolio${walletAddress ? `?address=${walletAddress}` : ""}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch portfolio data");
      }

      const portfolioData = await response.json();
      setPortfolio(portfolioData);

      // Generate suggestions based on portfolio
      await generateSuggestions(portfolioData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = async (portfolioData: Portfolio) => {
    try {
      // Use AI-generated suggestions from Gemini API
      const response = await fetch("/api/portfolio/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ portfolio: portfolioData }),
      });

      if (response.ok) {
        const aiSuggestions = await response.json();
        setSuggestions(aiSuggestions || []);
      } else {
        console.error("Failed to get AI suggestions, using fallback");
        // Fallback to basic suggestions if AI fails
        const fallbackSuggestions: TradingSuggestion[] = [
          {
            action: "hold",
            toToken: "SOL",
            reason:
              "Continue holding SOL with strong Solana ecosystem fundamentals.",
            confidence: 85,
            riskLevel: "medium",
          },
          {
            action: "buy",
            toToken: "USDC",
            reason:
              "Consider increasing stablecoin allocation for risk management.",
            confidence: 78,
            riskLevel: "low",
          },
        ];
        setSuggestions(fallbackSuggestions);
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "buy":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "sell":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case "hold":
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case "swap":
        return <RefreshCw className="w-4 h-4 text-purple-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Wallet className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-xl font-bold">Portfolio</h1>
              <p className="text-sm text-gray-400">
                Asset overview & suggestions
              </p>
            </div>
          </div>
          <button
            onClick={loadPortfolioData}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {portfolio && (
          <>
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <DollarSign className="w-6 h-6 mr-2 text-green-400" />
                      Total Portfolio Value
                    </h2>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-400">
                        {formatCurrency(portfolio.totalValue)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Last updated: {formatTime(lastUpdated)}
                      </div>
                    </div>
                  </div>

                  {/* Token Holdings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Holdings</h3>
                    {portfolio.tokens.map((token, index) => {
                      const allocation =
                        (token.usdValue / portfolio.totalValue) * 100;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-dark-bg rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                              <span className="font-bold text-primary-400">
                                {token.symbol.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold">
                                {token.symbol}
                              </div>
                              <div className="text-sm text-gray-400">
                                {token.amount} tokens
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(token.usdValue)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {allocation.toFixed(1)}%
                            </div>
                            <div
                              className={`text-sm ${
                                token.change24h >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {formatPercentage(token.change24h)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Portfolio Allocation Chart Placeholder */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-primary-400" />
                  Allocation
                </h3>
                <div className="space-y-3">
                  {portfolio.tokens.map((token, index) => {
                    const allocation =
                      (token.usdValue / portfolio.totalValue) * 100;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === 0 ? "bg-primary-500" : "bg-green-500"
                            }`}
                          ></div>
                          <span className="text-sm">{token.symbol}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {allocation.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-yellow-400" />
                AI Trading Suggestions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 bg-dark-bg rounded-lg border border-dark-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(suggestion.action)}
                        <span className="font-semibold capitalize">
                          {suggestion.action}
                        </span>
                        <span className="text-primary-400">
                          {suggestion.toToken}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Confidence</div>
                        <div className="font-semibold">
                          {suggestion.confidence}%
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getRiskColor(
                          suggestion.riskLevel
                        )} bg-opacity-20`}
                      >
                        {suggestion.riskLevel.toUpperCase()} RISK
                      </span>
                      <Link
                        href="/chat"
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        Discuss →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
