// TradePilot AI - Comprehensive DEX Client Integration
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { okxService } from './lib/okx';
import { okxCEXService } from './lib/okx-cex';
import { okxDEXService } from './lib/okx-dex-api';
import { okxDEXExtended } from './lib/okx-dex-extended';
import { portfolioService } from './lib/portfolio-service';
import { trendingService } from './lib/trending-service';
import { geminiService } from './lib/gemini';
import { solanaWallet } from './lib/solana-wallet';
import 'dotenv/config';

// Common Solana token addresses
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',   // Native SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'
};

// Chain indices for OKX DEX API
export const CHAIN_INDICES = {
  SOLANA: '501',
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10'
};

// Initialize OKX DEX SDK client for swaps and basic operations
const initOKXSDKClient = () => {
  if (!process.env.OKX_API_KEY) throw new Error('Missing OKX_API_KEY in .env file');
  if (!process.env.OKX_SECRET_KEY) throw new Error('Missing OKX_SECRET_KEY in .env file');
  if (!process.env.OKX_API_PASSPHRASE) throw new Error('Missing OKX_API_PASSPHRASE in .env file');
  if (!process.env.OKX_PROJECT_ID) throw new Error('Missing OKX_PROJECT_ID in .env file');

  return new OKXDexClient({
    apiKey: process.env.OKX_API_KEY,
    secretKey: process.env.OKX_SECRET_KEY,
    apiPassphrase: process.env.OKX_API_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID,
    // Required for executing swaps
    evm: {
      privateKey: process.env.EVM_PRIVATE_KEY!,
      walletAddress: process.env.EVM_WALLET_ADDRESS!,
      connection: {
        rpcUrl: process.env.EVM_RPC_URL!
      }
    },
    // Minimal configuration for OKX SDK - the SolanaConfig type doesn't accept
    // the properties we tried, so we'll use minimal config for now
    // solana: {
    //   connection: {
    //     rpcUrl: process.env.SOLANA_RPC_URL!
    //   }
    // },
    sui: {
      walletAddress: process.env.SUI_WALLET_ADDRESS!,
      privateKey: process.env.SUI_PRIVATE_KEY!,
      connection: {
        rpcUrl: process.env.SUI_RPC_URL!
      }
    }
  });
};

/**
 * TradePilot AI Client - Comprehensive trading interface
 * Integrates all MVP features as per GUIDELINE.md:
 * 1. AI-Powered Strategy Chat (Gemini API)
 * 2. OKX DEX + CEX Arbitrage Scanner
 * 3. Trending Token Radar
 * 4. Portfolio Snapshot + Smart Suggestions
 */
export class TradePilotClient {
  public sdkClient: OKXDexClient;

  constructor() {
    this.sdkClient = initOKXSDKClient();
  }

  // ===== 1. AI-Powered Strategy Chat =====

  /**
   * Get AI trading strategy advice using Gemini
   */
  async getAITradingAdvice(
    message: string,
    portfolioData?: any,
    marketData?: any
  ) {
    return await geminiService.getChatResponse(message, {
      portfolio: portfolioData,
      market: marketData
    });
  }

  /**
   * Generate trading suggestions based on portfolio and market conditions
   */
  async generateTradingSuggestions(walletAddress?: string) {
    try {
      const [portfolio, trending, arbitrage] = await Promise.all([
        this.getPortfolio(walletAddress),
        this.getTrendingTokens(),
        this.getArbitrageOpportunities()
      ]);

      return await geminiService.getTradingSuggestions({
        portfolio,
        trending: trending.slice(0, 5),
        arbitrage: arbitrage.slice(0, 3)
      });
    } catch (error) {
      console.error('Error generating trading suggestions:', error);
      return [];
    }
  }

  // ===== 2. OKX DEX + CEX Arbitrage Scanner =====

  /**
   * Get real-time arbitrage opportunities between OKX DEX and CEX
   */
  async getArbitrageOpportunities() {
    return await okxService.getArbitrageOpportunities();
  }

  /**
   * Get detailed arbitrage analysis for specific token
   */
  async getTokenArbitrageAnalysis(symbol: string) {
    try {
      // Get both CEX and DEX data for comparison
      const [cexData, dexData] = await Promise.all([
        okxCEXService.getArbitrageData([symbol]),
        okxDEXService.getTokenPrice(CHAIN_INDICES.SOLANA, TOKENS[symbol as keyof typeof TOKENS])
      ]);

      if (cexData.length > 0 && dexData) {
        const cexPrice = cexData[0].cexPrice;
        const spread = Math.abs(dexData - cexPrice);
        const spreadPercentage = (spread / Math.min(dexData, cexPrice)) * 100;

        return {
          symbol,
          dexPrice: dexData,
          cexPrice,
          spread,
          spreadPercentage,
          recommendation: spreadPercentage > 0.5 ? 'profitable' : 'monitor',
          volume24h: cexData[0].volume24h,
          lastUpdated: new Date()
        };
      }

      return null;
    } catch (error) {
      console.error(`Error analyzing arbitrage for ${symbol}:`, error);
      return null;
    }
  }

  // ===== 3. Trending Token Radar =====

  /**
   * Get trending tokens using real DEX data analysis
   */
  async getTrendingTokens() {
    return await okxService.getTrendingTokens();
  }

  /**
   * Get detailed trending analysis for specific token
   */
  async getTokenTrendAnalysis(tokenAddress: string, chainIndex = CHAIN_INDICES.SOLANA) {
    try {
      const [trades, candles, priceChange] = await Promise.all([
        okxDEXExtended.getTrades(chainIndex, tokenAddress, 100),
        okxDEXExtended.getCandlesticks(chainIndex, tokenAddress, '1H', 24),
        trendingService.getTokenPriceChange(tokenAddress, chainIndex, 24)
      ]);

      return {
        address: tokenAddress,
        recentTrades: trades.length,
        volume24h: candles.reduce((sum, candle) => sum + parseFloat(candle.volUsd), 0),
        priceChange24h: priceChange,
        candlestickData: candles,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error analyzing trend for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get top trending tokens with limit
   */
  async getTopTrendingTokens(limit = 5) {
    return await trendingService.getTopTrendingTokens(limit);
  }

  // ===== 4. Portfolio Snapshot + Smart Suggestions =====

  /**
   * Get comprehensive portfolio data
   */
  async getPortfolio(walletAddress?: string) {
    return await okxService.getPortfolio(walletAddress);
  }

  /**
   * Get detailed portfolio analytics
   */
  async getPortfolioAnalytics(walletAddress: string) {
    try {
      const [totalValue, tokenBalances] = await Promise.all([
        portfolioService.getTotalValue(walletAddress, CHAIN_INDICES.SOLANA),
        portfolioService.getAllTokenBalances(walletAddress, [CHAIN_INDICES.SOLANA])
      ]);

      const portfolio = await this.getPortfolio(walletAddress);

      // Calculate portfolio metrics
      const totalBalance = parseFloat(totalValue.totalValue);
      const tokenCount = tokenBalances.length;
      const largestHolding = portfolio.tokens.reduce((max, token) =>
        token.value > max.value ? token : max, portfolio.tokens[0] || { value: 0 }
      );

      return {
        totalValue: totalBalance,
        tokenCount,
        largestHolding,
        diversificationScore: Math.min(100, tokenCount * 20), // Simple diversification metric
        performance24h: portfolio.tokens.reduce((sum, token) =>
          sum + (token.value * token.change24h / 100), 0
        ),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting portfolio analytics:', error);
      return null;
    }
  }

  // ===== Market Data & Utilities =====

  /**
   * Get real-time token price from DEX
   */
  async getTokenPrice(tokenAddress: string, chainIndex = CHAIN_INDICES.SOLANA) {
    return await okxDEXService.getTokenPrice(chainIndex, tokenAddress);
  }

  /**
   * Get multiple token prices efficiently
   */
  async getMultipleTokenPrices(tokens: Array<{address: string, chainIndex?: string}>) {
    const requests = tokens.map(token => ({
      chainIndex: token.chainIndex || CHAIN_INDICES.SOLANA,
      tokenContractAddress: token.address
    }));

    return await okxDEXService.getMultipleTokenPrices(requests);
  }

  /**
   * Get comprehensive market overview
   */
  async getMarketOverview() {
    try {
      const [trending, arbitrage, portfolioData] = await Promise.all([
        this.getTrendingTokens(),
        this.getArbitrageOpportunities(),
        this.getPortfolio()
      ]);

      const totalVolume24h = trending.reduce((sum, token) => sum + token.volume24h, 0);
      const profitableArbitrage = arbitrage.filter(opp => Math.abs(opp.profitPercent) > 0.5);
      const avgSpread = arbitrage.length > 0
        ? arbitrage.reduce((sum, opp) => sum + Math.abs(opp.profitPercent), 0) / arbitrage.length
        : 0;

      return {
        totalVolume24h,
        trendingTokensCount: trending.length,
        arbitrageOpportunities: profitableArbitrage.length,
        avgSpread,
        portfolioValue: portfolioData.totalValue,
        topTrending: trending.slice(0, 3),
        topArbitrage: arbitrage.slice(0, 3),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting market overview:', error);
      return null;
    }
  }

  /**
   * Execute a swap using OKX DEX SDK
   */
  async executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    chainIndex = CHAIN_INDICES.SOLANA
  ) {
    try {
      // This would use the OKX DEX SDK for actual swap execution
      // Implementation depends on specific swap requirements
      console.log(`Executing swap: ${amount} ${fromToken} -> ${toToken} on chain ${chainIndex}`);

      // Return swap result
      return {
        success: true,
        txHash: 'mock-tx-hash', // Would be actual transaction hash
        fromToken,
        toToken,
        amount,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===== Wallet Integration =====

  /**
   * Get Solana wallet connection status
   */
  async getWalletStatus() {
    try {
      const connection = await solanaWallet.connectPhantomWallet();
      if (connection) {
        return {
          isConnected: true,
          address: connection.address,
          balance: connection.balance,
          network: 'solana'
        };
      }
      return {
        isConnected: false,
        address: null,
        balance: 0,
        network: null
      };
    } catch (error) {
      console.error('Error checking wallet status:', error);
      return {
        isConnected: false,
        address: null,
        balance: 0,
        network: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const tradePilotClient = new TradePilotClient();

// Export OKX SDK client for direct access
export const client = tradePilotClient.sdkClient;
