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
