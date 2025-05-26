// Centralized Token Configuration for TradePilot AI
// This file contains all supported tokens with their metadata

export interface TokenMetadata {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  chainIndex: string;
  category: 'native' | 'stablecoin' | 'defi' | 'meme' | 'oracle' | 'governance';
  isPopular: boolean;
}

// Comprehensive Solana token definitions
export const SOLANA_TOKENS: Record<string, TokenMetadata> = {
  SOL: {
    symbol: 'SOL',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    name: 'Solana',
    chainIndex: '501',
    category: 'native',
    isPopular: true
  },
  USDC: {
    symbol: 'USDC',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    name: 'USD Coin',
    chainIndex: '501',
    category: 'stablecoin',
    isPopular: true
  },
  USDT: {
    symbol: 'USDT',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    name: 'Tether USD',
    chainIndex: '501',
    category: 'stablecoin',
    isPopular: true
  },
  JUP: {
    symbol: 'JUP',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    name: 'Jupiter',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  },
  RAY: {
    symbol: 'RAY',
    address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    name: 'Raydium',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  },
  ORCA: {
    symbol: 'ORCA',
    address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    decimals: 6,
    name: 'Orca',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  },
  JTO: {
    symbol: 'JTO',
    address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
    decimals: 9,
    name: 'Jito',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  },
  BONK: {
    symbol: 'BONK',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    name: 'Bonk',
    chainIndex: '501',
    category: 'meme',
    isPopular: true
  },
  WIF: {
    symbol: 'WIF',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    name: 'Dogwifhat',
    chainIndex: '501',
    category: 'meme',
    isPopular: true
  },
  PYTH: {
    symbol: 'PYTH',
    address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    name: 'Pyth Network',
    chainIndex: '501',
    category: 'oracle',
    isPopular: true
  },
  MNGO: {
    symbol: 'MNGO',
    address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
    decimals: 6,
    name: 'Mango',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  },
  JITO: {
    symbol: 'JITO',
    address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    decimals: 9,
    name: 'Jito Staked SOL',
    chainIndex: '501',
    category: 'defi',
    isPopular: true
  }
} as const;

// Legacy TOKENS export for backward compatibility
export const TOKENS = Object.fromEntries(
  Object.entries(SOLANA_TOKENS).map(([key, token]) => [key, token.address])
) as Record<keyof typeof SOLANA_TOKENS, string>;

// Chain indices for OKX DEX API
export const CHAIN_INDICES = {
  SOLANA: '501',
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  BASE: '8453',
  LINEA: '59144',
  AVALANCHE: '43114',
  FANTOM: '250'
} as const;

// Helper functions to work with tokens
export const getTokenBySymbol = (symbol: string): TokenMetadata | undefined => {
  return SOLANA_TOKENS[symbol as keyof typeof SOLANA_TOKENS];
};

export const getTokenByAddress = (address: string): TokenMetadata | undefined => {
  return Object.values(SOLANA_TOKENS).find(token => token.address === address);
};

export const getAllTokenSymbols = (): string[] => {
  return Object.keys(SOLANA_TOKENS);
};

export const getAllTokenAddresses = (): string[] => {
  return Object.values(SOLANA_TOKENS).map(token => token.address);
};

export const getPopularTokens = (): TokenMetadata[] => {
  return Object.values(SOLANA_TOKENS).filter(token => token.isPopular);
};

export const getTokensByCategory = (category: TokenMetadata['category']): TokenMetadata[] => {
  return Object.values(SOLANA_TOKENS).filter(token => token.category === category);
};

// Token lists for different services
export const TRENDING_TOKENS = getPopularTokens().map(token => ({
  symbol: token.symbol,
  address: token.address
}));

export const CEX_TRADING_PAIRS = getAllTokenSymbols();

export const DEX_SUPPORTED_TOKENS = getAllTokenSymbols();

// Social multipliers for trending analysis
export const SOCIAL_MULTIPLIERS: Record<string, number> = {
  SOL: 1.2,      // High social activity
  JUP: 1.1,      // Aggregator with good following
  RAY: 1.0,      // Established DeFi
  ORCA: 1.0,     // Established DeFi
  JTO: 1.0,      // Jito network
  BONK: 1.4,     // Meme coin = high social activity
  WIF: 1.4,      // Another meme with high social presence
  PYTH: 1.1,     // Oracle network
  MNGO: 1.0,     // Established but lower activity
  USDC: 0.7,     // Stablecoin = lower social activity
  USDT: 0.7,     // Stablecoin = lower social activity
  JITO: 1.1      // Liquid staking token
};

// Market cap estimates for trending calculations
export const MARKET_CAP_ESTIMATES: Record<string, number> = {
  SOL: 66000000000,    // ~$66B
  USDC: 32000000000,   // ~$32B
  USDT: 120000000000,  // ~$120B
  JUP: 2500000000,     // ~$2.5B
  RAY: 800000000,      // ~$800M
  ORCA: 300000000,     // ~$300M
  JTO: 500000000,      // ~$500M
  BONK: 1800000000,    // ~$1.8B
  WIF: 3200000000,     // ~$3.2B
  PYTH: 1500000000,    // ~$1.5B
  MNGO: 150000000,     // ~$150M
  JITO: 400000000      // ~$400M
};

export default SOLANA_TOKENS;
