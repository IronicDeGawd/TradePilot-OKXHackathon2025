// Portfolio Types
export interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  amount: string;
  usdValue: number;
  price: number;
  change24h: number;
}

export interface Portfolio {
  totalValue: number;
  tokens: TokenBalance[];
  lastUpdated: Date;
}

// AI Chat Types
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    suggestions?: string[];
    tradeData?: any;
  };
}

// Arbitrage Types
export interface ArbitrageOpportunity {
  tokenSymbol?: string;
  tokenAddress?: string;
  symbol: string;
  dexPrice: number;
  cexPrice: number;
  spread?: number;
  priceSpread?: number;
  spreadPercentage?: number;
  profitPercent: number;
  volume24h: number;
  liquidity?: number;
  estimatedProfit?: number;
  risk?: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

// Trending Types
export interface TrendingToken {
  symbol: string;
  address: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  socialMentions: number; // Estimated based on volume and price volatility
  trendScore: number;
  lastUpdated: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Trading Suggestion Types
export interface TradingSuggestion {
  action: 'buy' | 'sell' | 'hold' | 'swap';
  fromToken?: string;
  toToken: string;
  reason: string;
  confidence: number;
  expectedReturn?: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// New API Response Types for OKX DEX Market API
export interface ApiChainInfo {
  chainIndex: string;
  chainName: string;
  chainSymbol: string;
}

export interface ApiTokenInfo {
  decimals: string;
  tokenContractAddress: string;
  tokenLogoUrl: string;
  tokenName: string;
  tokenSymbol: string;
}

export interface ApiTokenPriceInfo {
  chainIndex: string;
  tokenContractAddress: string;
  time: string;
  price: string;
  marketCap?: string;
  priceChange5M?: string;
  priceChange1H?: string;
  priceChange4H?: string;
  priceChange24H?: string;
  volume5M?: string;
  volume1H?: string;
  volume4H?: string;
  volume24H?: string;
}

// Extended types for internal use
export interface ChainData {
  chainIndex: string;
  name: string;
  symbol: string;
}

export interface ExtendedTokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  chainIndex: string;
}

export interface TokenPriceData {
  address: string;
  chainIndex: string;
  price: number;
  priceChange5M?: number;
  priceChange1H?: number;
  priceChange4H?: number;
  priceChange24H?: number;
  volume5M?: number;
  volume1H?: number;
  volume4H?: number;
  volume24H?: number;
  marketCap?: number;
  timestamp: number;
}

export interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Portfolio Types
