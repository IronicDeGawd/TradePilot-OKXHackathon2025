"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MessageCircle,
  TrendingUp,
  Wallet,
  ArrowUpDown,
  Bot,
  Zap,
  Target,
  BarChart3,
  Sparkles,
  Activity,
} from "lucide-react";
import { okxService } from "@/lib/okx";
import MarketOverview from "@/components/MarketOverview";
import type { ArbitrageOpportunity, TrendingToken } from "@/types";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketStats, setMarketStats] = useState({
    topArbitrage: null as ArbitrageOpportunity | null,
    topTrending: null as TrendingToken | null,
    totalOpportunities: 0,
  });

  useEffect(() => {
    // Try to load from cache first
    loadCachedData();
    // Then load fresh data
    loadMarketData();
  }, []);

  const loadCachedData = () => {
    // Using browser's localStorage - this only runs on client
    if (typeof window === "undefined") return;

    try {
      // Try to get cached data
      const cachedData = localStorage.getItem("tradepilot-market-data");
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if cached data is less than 15 minutes old
        const cachedTime = parsedData.timestamp || 0;
        const isStale = Date.now() - cachedTime > 15 * 60 * 1000;

        setMarketStats(parsedData.data);
        // If data is stale, we'll still show it but also refresh in background
        setIsRefreshing(isStale);
      } else {
        // No cached data, show loading state
        setIsLoading(true);
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
      setIsLoading(true);
    }
  };

  const loadMarketData = async () => {
    try {
      // If we have cached data, show refreshing indicator
      if (!isLoading) {
        setIsRefreshing(true);
      }

      const [arbitrageData, trendingData] = await Promise.all([
        fetch("/api/arbitrage").then((res) => res.json()),
        fetch("/api/trending").then((res) => res.json()),
      ]);

      const newStats = {
        topArbitrage: arbitrageData[0] || null,
        topTrending: trendingData[0] || null,
        totalOpportunities: arbitrageData.filter(
          (op: ArbitrageOpportunity) => Math.abs(op.spreadPercentage) > 0.5
        ).length,
      };

      setMarketStats(newStats);

      // Cache the new data
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "tradepilot-market-data",
          JSON.stringify({
            data: newStats,
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const features = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "AI Trading Chat",
      description:
        "Ask 'What should I trade today?' and get personalized suggestions",
      href: "/chat",
      color: "text-blue-400",
    },
    {
      icon: <Wallet className="w-8 h-8" />,
      title: "Portfolio Snapshot",
      description: "View your holdings and get smart rebalancing suggestions",
      href: "/portfolio",
      color: "text-green-400",
    },
    {
      icon: <ArrowUpDown className="w-8 h-8" />,
      title: "Arbitrage Scanner",
      description: "Find real-time price differences between OKX DEX & CEX",
      href: "/arbitrage",
      color: "text-purple-400",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Trending Radar",
      description: "Discover hot tokens with social buzz and price momentum",
      href: "/trending",
      color: "text-orange-400",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-primary-500" />
            <h1 className="text-2xl font-bold">TradePilot AI</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Live
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
            Your Gemini-Powered Trading Copilot
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Combine real-time OKX DEX/CEX data with AI insights to identify
            profitable strategies, spot arbitrage opportunities, and make
            informed decisions.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center space-x-2 px-4 py-2 bg-dark-card rounded-full border border-dark-border">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm">Built for Speed</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-dark-card rounded-full border border-dark-border">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-sm">Designed for Clarity</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-dark-card rounded-full border border-dark-border">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm">Real-time Data</span>
            </div>
          </div>

          <Link
            href="/chat"
            className="btn-primary text-lg px-8 py-4 inline-block"
          >
            Start Trading with AI
          </Link>
        </div>
      </section>

      {/* Market Overview Section */}
      <section className="container mx-auto px-4 py-16">
        <MarketOverview />
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Core Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="card hover:border-primary-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className={`${feature.color} mb-4`}>{feature.icon}</div>
              <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-dark-border bg-dark-card/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-400 mb-2">
                24/7
              </div>
              <div className="text-gray-400">Market Monitoring</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                &lt;1s
              </div>
              <div className="text-gray-400">Response Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-2">AI</div>
              <div className="text-gray-400">Powered Insights</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>
            &copy; 2025 TradePilot AI. Built with OKX DEX SDK & Google Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
