"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle,
  Settings,
  Zap,
  DollarSign,
  Clock,
  TrendingUp,
  Shield,
  Construction,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { SOLANA_TOKENS, getPopularTokens } from "@/config/tokens";

interface SwapQuote {
  fromToken: {
    symbol: string;
    amount: string;
    usdValue: number;
  };
  toToken: {
    symbol: string;
    amount: string;
    usdValue: number;
  };
  priceImpact: string;
  estimatedFee: string;
  route: string;
  minimumReceived?: string;
  executionPrice?: string;
}

// Get popular tokens from centralized configuration
const POPULAR_TOKENS = getPopularTokens().map((token) => ({
  symbol: token.symbol,
  name: token.name,
  address: token.address,
}));

export default function SwapPage() {
  const [fromToken, setFromToken] = useState(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState(POPULAR_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<{ [symbol: string]: number }>(
    {}
  );
  const [pricesLoading, setPricesLoading] = useState(true);

  // Fetch quote from API
  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return null;

    try {
      const params = new URLSearchParams({
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: fromAmount,
        slippage: slippage,
      });

      const response = await fetch(`/api/swap/quote?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch quote");
      }

      const apiQuote = result.data;

      // Convert API response to our UI format
      return {
        fromToken: {
          symbol: apiQuote.fromToken.symbol,
          amount: apiQuote.fromAmount,
          usdValue:
            parseFloat(apiQuote.fromAmount) *
            getTokenUSDPrice(fromToken.symbol),
        },
        toToken: {
          symbol: apiQuote.toToken.symbol,
          amount: apiQuote.toAmount,
          usdValue:
            parseFloat(apiQuote.toAmount) * getTokenUSDPrice(toToken.symbol),
        },
        priceImpact: apiQuote.priceImpact,
        estimatedFee: apiQuote.fee,
        route: apiQuote.route[0]?.pool || "Jupiter Aggregator",
        minimumReceived: apiQuote.minimumReceived,
        executionPrice: apiQuote.executionPrice,
      };
    } catch (error) {
      console.error("Failed to fetch quote:", error);
      return null;
    }
  };

  // Fetch real token prices from OKX DEX API
  const fetchTokenPrices = async () => {
    try {
      setPricesLoading(true);
      const response = await fetch("/api/okx-proxy?endpoint=market/price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          POPULAR_TOKENS.map((token) => ({
            chainIndex: "501", // Solana chain index
            tokenContractAddress: token.address,
          }))
        ),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== "0") {
        throw new Error(`OKX API error: ${data.msg}`);
      }

      // Map prices back to token symbols
      const prices: { [symbol: string]: number } = {};
      data.data.forEach((item: any) => {
        const token = POPULAR_TOKENS.find(
          (t) => t.address === item.tokenContractAddress
        );
        if (token) {
          prices[token.symbol] = parseFloat(item.price);
        }
      });

      setTokenPrices(prices);
    } catch (error) {
      console.error("Failed to fetch token prices:", error);
      // Fallback to default prices for development
      setTokenPrices({
        SOL: 95.5,
        USDC: 1.0,
        USDT: 1.0,
        JUP: 0.75,
        RAY: 2.85,
        BONK: 0.000025,
        ORCA: 4.2,
        JTO: 3.1,
        WIF: 2.8,
        PYTH: 0.45,
        MNGO: 0.12,
        JITO: 8.5,
      });
    } finally {
      setPricesLoading(false);
    }
  };

  // Get token USD price from fetched prices
  const getTokenUSDPrice = (symbol: string): number => {
    return tokenPrices[symbol] || 1;
  };

  // Fetch token prices on component mount
  useEffect(() => {
    fetchTokenPrices();
  }, []);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      setIsLoading(true);

      // Debounce API calls
      const timer = setTimeout(async () => {
        try {
          const newQuote = await fetchQuote();
          setQuote(newQuote);
        } catch (error) {
          console.error("Error fetching quote:", error);
          setQuote(null);
        } finally {
          setIsLoading(false);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
    } else {
      setQuote(null);
      setIsLoading(false);
    }
  }, [fromAmount, fromToken, toToken, slippage]);

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleSwap = () => {
    // This would trigger the actual swap in a real implementation
    alert(
      "🚧 Swap execution is under development! This is a quote-only preview."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-main">
      <DisclaimerBanner />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/"
              className="inline-flex items-center text-gray-400 hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                {/* <Construction className="w-8 h-8 mr-3 text-yellow-500" /> */}
                Token Swap
                <span className="ml-3 text-sm bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg border border-yellow-500/30">
                  Under Development
                </span>
              </h1>
              <p className="text-gray-400 mt-2">
                Get real-time quotes across DEX pools. Swap execution coming
                soon!
              </p>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className="card bg-yellow-500/5 border-yellow-500/20 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-2">
                Swap Feature Status
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>✅ Real-time price quotes from OKX DEX API</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>
                    ✅ Route optimization and price impact calculation
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span>
                    🚧 Wallet integration and transaction execution (coming
                    soon)
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span>
                    🚧 Slippage protection and MEV resistance (coming soon)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Swap Interface */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Swap Tokens
                </h2>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Slippage Tolerance
                    </label>
                    <div className="flex space-x-2">
                      {["0.1", "0.5", "1.0"].map((val) => (
                        <button
                          key={val}
                          onClick={() => setSlippage(val)}
                          className={`px-3 py-1 text-xs rounded ${
                            slippage === val
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="w-16 px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500"
                        step="0.1"
                        min="0.1"
                        max="10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* From Token */}
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      From
                    </label>
                    <span className="text-xs text-gray-400">Balance: --</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={fromToken.symbol}
                      onChange={(e) => {
                        const token = POPULAR_TOKENS.find(
                          (t) => t.symbol === e.target.value
                        );
                        if (token) setFromToken(token);
                      }}
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500"
                    >
                      {POPULAR_TOKENS.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-2xl text-white placeholder-gray-500 focus:outline-none"
                      step="any"
                    />
                  </div>
                  {fromAmount && !pricesLoading && (
                    <div className="text-sm text-gray-400 mt-2">
                      ≈ $
                      {(
                        parseFloat(fromAmount) *
                        getTokenUSDPrice(fromToken.symbol)
                      ).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={swapTokens}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                  >
                    <ArrowUpDown className="w-5 h-5" />
                  </button>
                </div>

                {/* To Token */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      To
                    </label>
                    <span className="text-xs text-gray-400">Balance: --</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={toToken.symbol}
                      onChange={(e) => {
                        const token = POPULAR_TOKENS.find(
                          (t) => t.symbol === e.target.value
                        );
                        if (token) setToToken(token);
                      }}
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500"
                    >
                      {POPULAR_TOKENS.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1 text-2xl text-white">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner />
                          <span className="text-gray-400">
                            Getting quote...
                          </span>
                        </div>
                      ) : quote ? (
                        quote.toToken.amount
                      ) : (
                        <span className="text-gray-500">0.0</span>
                      )}
                    </div>
                  </div>
                  {quote && (
                    <div className="text-sm text-gray-400 mt-2">
                      ≈ ${quote.toToken.usdValue.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Quote Details */}
                {quote && (
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Price Impact:</span>
                        <span className="text-green-400">
                          {quote.priceImpact}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Fee:</span>
                        <span className="text-white">
                          {quote.estimatedFee} SOL
                        </span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-400">Route:</span>
                        <span className="text-white">{quote.route}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={!quote || isLoading}
                  className={`w-full py-4 rounded-lg font-semibold transition-all ${
                    quote && !isLoading
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner />
                      <span>Getting Quote...</span>
                    </div>
                  ) : quote ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Construction className="w-5 h-5" />
                      <span>Preview Swap (Coming Soon)</span>
                    </div>
                  ) : (
                    "Enter Amount"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Features */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-blue-400" />
                Swap Features
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">
                    Real-time OKX DEX quotes
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">Best route optimization</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">
                    Price impact calculation
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-400">Execution (coming soon)</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="card bg-blue-500/5 border-blue-500/20 p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Notice
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• Always verify quotes on multiple platforms</p>
                <p>• Check price impact before large trades</p>
                <p>• Use appropriate slippage settings</p>
                <p>• This is a development preview only</p>
              </div>
            </div>

            {/* Market Stats */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Market Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume:</span>
                  <span className="text-white">$2.4B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Pools:</span>
                  <span className="text-white">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg. Slippage:</span>
                  <span className="text-green-400">0.23%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
