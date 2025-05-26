// Trending service using OKX DEX APIs for price analysis
import { okxDEXExtended, OKXCandlestickData, OKXTradeData } from './okx-dex-extended';

export interface TrendingToken {
  symbol: string;
  address: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  socialMentions: number;
  trendScore: number;
  lastUpdated: Date;
}

class TrendingService {
  private popularSolanaTokens = [
    { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
    { symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
    { symbol: 'RAY', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
    { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { symbol: 'WIF', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
    { symbol: 'PYTH', address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' }
  ];

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async analyzeTrendingTokens(chainIndex = '501'): Promise<TrendingToken[]> {
    const trendingTokens: TrendingToken[] = [];

    console.log(`Analyzing ${this.popularSolanaTokens.length} tokens for trending data...`);

    // Process tokens in batches to reduce API load
    const batchSize = 2; // Reduced batch size to be more conservative
    for (let i = 0; i < this.popularSolanaTokens.length; i += batchSize) {
      const batch = this.popularSolanaTokens.slice(i, i + batchSize);

      // Process batch concurrently but with controlled concurrency
      const batchPromises = batch.map(async (token) => {
        try {
          // Get 24h candlestick data
          const candles = await okxDEXExtended.getCandlesticks(chainIndex, token.address, '1H', 24);

          if (candles.length >= 2) {
            const latest = candles[0];
            const previous = candles[candles.length - 1];

            const currentPrice = parseFloat(latest.c);
            const previousPrice = parseFloat(previous.c);
            const change24h = ((currentPrice - previousPrice) / previousPrice) * 100;

            // Calculate total volume in last 24h
            const volume24h = candles.reduce((sum, candle) => sum + parseFloat(candle.volUsd), 0);

            // Skip trades API call to reduce load - estimate activity from volume
            const tradeCount24h = Math.floor(volume24h / 10000); // Estimate trades based on volume

            // Calculate volume change (recent vs older periods)
            const recentVolume = candles.slice(0, 12).reduce((sum, candle) => sum + parseFloat(candle.volUsd), 0);
            const oldVolume = candles.slice(12).reduce((sum, candle) => sum + parseFloat(candle.volUsd), 0);
            const volumeChange24h = oldVolume > 0 ? ((recentVolume - oldVolume) / oldVolume) * 100 : 0;

            // Estimate market cap (simplified calculation)
            const marketCap = this.estimateMarketCap(token.symbol, currentPrice);

            // Estimate social mentions based on volume and trend activity
            const socialMentions = this.estimateSocialMentions(volume24h, change24h, token.symbol);

            // Calculate trend score
            let trendScore = 0;
            trendScore += Math.abs(change24h) * 2; // Price volatility
            trendScore += Math.max(0, volumeChange24h) * 0.5; // Volume increase
            trendScore += tradeCount24h * 0.1; // Trading activity

            return {
              symbol: token.symbol,
              address: token.address,
              price: currentPrice,
              change24h,
              volume24h,
              marketCap,
              socialMentions,
              trendScore,
              lastUpdated: new Date()
            };
          }
          return null;
        } catch (error) {
          console.error(`Error analyzing ${token.symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      trendingTokens.push(...validResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < this.popularSolanaTokens.length) {
        await this.delay(2000); // 2 seconds between batches (increased)
      }
    }

    // Sort by trend score (highest first)
    return trendingTokens.sort((a, b) => b.trendScore - a.trendScore);
  }

  async getTopTrendingTokens(limit = 5, chainIndex = '501'): Promise<TrendingToken[]> {
    const allTrending = await this.analyzeTrendingTokens(chainIndex);
    return allTrending.slice(0, limit);
  }

  async getTokenPriceChange(tokenAddress: string, chainIndex = '501', hours = 24): Promise<number> {
    try {
      const candles = await okxDEXExtended.getCandlesticks(chainIndex, tokenAddress, '1H', hours);

      if (candles.length >= 2) {
        const latest = parseFloat(candles[0].c);
        const previous = parseFloat(candles[candles.length - 1].c);
        return ((latest - previous) / previous) * 100;
      }

      return 0;
    } catch (error) {
      console.error('Error getting price change:', error);
      return 0;
    }
  }

  private estimateMarketCap(symbol: string, price: number): number {
    // Simplified market cap estimation based on known circulating supplies
    const supplies: { [key: string]: number } = {
      'SOL': 467000000,
      'JUP': 10000000000,
      'RAY': 555000000,
      'ORCA': 100000000,
      'JTO': 1000000000,
      'BONK': 75000000000000,
      'WIF': 998926393,
      'PYTH': 10000000000,
      'MNGO': 10000000000
    };

    const supply = supplies[symbol] || 1000000000; // Default supply if unknown
    return price * supply;
  }

  /**
   * Estimates social mentions based on trading volume, price volatility, and token characteristics
   * This is a heuristic approach until real social media APIs are integrated
   */
  private estimateSocialMentions(volume24h: number, change24h: number, symbol: string): number {
    // Base mentions from volume (higher volume = more discussion)
    const volumeComponent = Math.floor(volume24h / 10000);

    // Price volatility component (big moves generate discussion)
    const volatilityComponent = Math.abs(change24h) * 10;

    // Token popularity multiplier based on market position
    const popularityMultipliers: { [key: string]: number } = {
      'SOL': 1.5,     // Major L1
      'JUP': 1.3,     // Popular DEX
      'RAY': 1.2,     // Established DeFi
      'BONK': 1.4,    // Meme coin = high social activity
      'WIF': 1.4,     // Another meme with high social presence
      'PYTH': 1.1,    // Oracle network
      'ORCA': 1.1,    // DEX
      'JTO': 1.0,     // Newer token
      'MNGO': 1.0,    // Established but lower activity
      'USDC': 0.7     // Stablecoin = lower social activity
    };

    const multiplier = popularityMultipliers[symbol] || 1.0;

    // Calculate estimated mentions with reasonable bounds
    const estimatedMentions = Math.floor((volumeComponent + volatilityComponent) * multiplier) + 50;

    // Cap at reasonable limits (50 minimum, 10000 maximum)
    return Math.min(Math.max(estimatedMentions, 50), 10000);
  }
}

export const trendingService = new TrendingService();
