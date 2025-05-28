// filepath: /mnt/project-files/okx-dex-project/src/config/tokens.ts
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

// Ethereum token definitions for multi-chain support
export const ETHEREUM_TOKENS: Record<string, TokenMetadata> = {
  ETH: {
    symbol: 'ETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    name: 'Ethereum',
    chainIndex: '1',
    category: 'native',
    isPopular: true
  },
  USDC: {
    symbol: 'USDC',
    address: '0xA0b86a33E6441b6C862F7F5A7B4B6B5A5F8D7a7D',
    decimals: 6,
    name: 'USD Coin',
    chainIndex: '1',
    category: 'stablecoin',
    isPopular: true
  },
  USDT: {
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    name: 'Tether USD',
    chainIndex: '1',
    category: 'stablecoin',
    isPopular: true
  },
  WBTC: {
    symbol: 'WBTC',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    chainIndex: '1',
    category: 'native',
    isPopular: true
  },
  UNI: {
    symbol: 'UNI',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    name: 'Uniswap',
    chainIndex: '1',
    category: 'defi',
    isPopular: true
  }
} as const;

// BSC token definitions for multi-chain support
export const BSC_TOKENS: Record<string, TokenMetadata> = {
  BNB: {
    symbol: 'BNB',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    decimals: 18,
    name: 'BNB',
    chainIndex: '56',
    category: 'native',
    isPopular: true
  },
  USDT: {
    symbol: 'USDT',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    name: 'Tether USD',
    chainIndex: '56',
    category: 'stablecoin',
    isPopular: true
  },
  USDC: {
    symbol: 'USDC',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
    name: 'USD Coin',
    chainIndex: '56',
    category: 'stablecoin',
    isPopular: true
  },
  CAKE: {
    symbol: 'CAKE',
    address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    decimals: 18,
    name: 'PancakeSwap Token',
    chainIndex: '56',
    category: 'defi',
    isPopular: true
  }
} as const;

// Multi-chain token registry
export const ALL_CHAIN_TOKENS = {
  '501': SOLANA_TOKENS,
  '1': ETHEREUM_TOKENS,
  '56': BSC_TOKENS
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
export const getTokenBySymbol = (symbol: string, chainIndex?: string): TokenMetadata | undefined => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens?.[symbol as keyof typeof chainTokens];
  }

  return SOLANA_TOKENS[symbol as keyof typeof SOLANA_TOKENS];
};

export const getTokenByAddress = (address: string, chainIndex?: string): TokenMetadata | undefined => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens ? Object.values(chainTokens).find(token => token.address === address) : undefined;
  }

  for (const chainTokens of Object.values(ALL_CHAIN_TOKENS)) {
    const token = Object.values(chainTokens).find(token => token.address === address);
    if (token) return token;
  }
  return undefined;
};

export const getAllTokenSymbols = (chainIndex?: string): string[] => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens ? Object.keys(chainTokens) : [];
  }

  return Object.keys(SOLANA_TOKENS);
};

export const getAllTokenAddresses = (chainIndex?: string): string[] => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens ? Object.values(chainTokens).map(token => token.address) : [];
  }

  return Object.values(SOLANA_TOKENS).map(token => token.address);
};

export const getPopularTokens = (chainIndex?: string): TokenMetadata[] => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens ? Object.values(chainTokens).filter(token => token.isPopular) : [];
  }

  return Object.values(SOLANA_TOKENS).filter(token => token.isPopular);
};

export const getTokensByCategory = (category: TokenMetadata['category'], chainIndex?: string): TokenMetadata[] => {
  if (chainIndex) {
    const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
    return chainTokens ? Object.values(chainTokens).filter(token => token.category === category) : [];
  }

  return Object.values(SOLANA_TOKENS).filter(token => token.category === category);
};

export const getSupportedChains = (): string[] => {
  return Object.keys(ALL_CHAIN_TOKENS);
};

export const getTokensForChain = (chainIndex: string): TokenMetadata[] => {
  const chainTokens = ALL_CHAIN_TOKENS[chainIndex as keyof typeof ALL_CHAIN_TOKENS];
  return chainTokens ? Object.values(chainTokens) : [];
};

// Token lists for different services
export const TRENDING_TOKENS = getPopularTokens('501').map(token => ({
  symbol: token.symbol,
  address: token.address,
  chainIndex: token.chainIndex
}));

export const MULTI_CHAIN_TRENDING_TOKENS = Object.entries(ALL_CHAIN_TOKENS).flatMap(([chainIndex, tokens]) =>
  Object.values(tokens)
    .filter(token => token.isPopular)
    .map(token => ({
      symbol: token.symbol,
      address: token.address,
      chainIndex: token.chainIndex
    }))
);

export const CEX_TRADING_PAIRS = getAllTokenSymbols('501');
export const DEX_SUPPORTED_TOKENS = getAllTokenSymbols('501');

// Social multipliers for trending analysis
export const SOCIAL_MULTIPLIERS: Record<string, number> = {
  SOL: 1.2,
  JUP: 1.1,
  RAY: 1.0,
  ORCA: 1.0,
  JTO: 1.0,
  BONK: 1.4,
  WIF: 1.4,
  PYTH: 1.1,
  MNGO: 1.0,
  USDC: 0.7,
  USDT: 0.7,
  JITO: 1.1
};

// Market cap estimates for trending calculations
export const MARKET_CAP_ESTIMATES: Record<string, number> = {
  SOL: 66000000000,
  USDC: 32000000000,
  USDT: 120000000000,
  JUP: 2500000000,
  RAY: 800000000,
  ORCA: 300000000,
  JTO: 500000000,
  BONK: 1800000000,
  WIF: 3200000000,
  PYTH: 1500000000,
  MNGO: 150000000,
  JITO: 400000000
};

export default SOLANA_TOKENS;
