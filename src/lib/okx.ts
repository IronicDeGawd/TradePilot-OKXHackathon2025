import { okxCEXService } from './okx-cex';
import { okxDEXService } from './okx-dex-api';
import { okxDEXExtended } from './okx-dex-extended';
import { portfolioService } from './portfolio-service';
import { trendingService } from './trending-service';
import { solanaWallet } from './solana-wallet';

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

export interface ArbitrageOpportunity {
  symbol: string;
  dexPrice: number;
  cexPrice: number;
  priceSpread: number;
  profitPercent: number;
  volume24h: number;
  liquidity: number;
  estimatedProfit: number;
  risk: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

export interface Portfolio {
  totalValue: number;
  tokens: Array<{
    symbol: string;
    address: string;
    balance: number;
    value: number;
    price: number;
    change24h: number;
  }>;
  lastUpdated: Date;
}

class OKXService {
  private solanaTokens = ['SOL', 'JUP', 'RAY', 'ORCA', 'JTO', 'BONK', 'WIF', 'PYTH', 'MNGO'];

  async getTrendingTokens(): Promise<TrendingToken[]> {
    try {
      console.log('Analyzing trending tokens using real DEX data...');

      // Use our new trending service that analyzes real price/volume data
      const trendingData = await trendingService.analyzeTrendingTokens('501');

      if (trendingData && trendingData.length > 0) {
        console.log(`Successfully analyzed ${trendingData.length} trending tokens from OKX DEX data`);
        return trendingData;
      }

      console.warn('No trending tokens found from analysis');
      return [];
    } catch (error) {
      console.error('Error analyzing trending tokens:', error);
      return [];
    }
  }

  async getArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      console.log('Scanning arbitrage opportunities between OKX CEX and DEX...');

      // Get CEX prices from OKX
      const cexData = await okxCEXService.getArbitrageData(this.solanaTokens);

      if (!cexData || cexData.length === 0) {
        console.warn('No CEX data available');
        return [];
      }

      // Prepare batch request for DEX prices
      const tokenRequests: { symbol: string; chainIndex: string; tokenContractAddress: string }[] = [];
      const symbolToAddress: { [symbol: string]: string } = {};

      for (const cex of cexData) {
        const tokenAddress = this.getTokenAddress(cex.symbol);
        if (tokenAddress) {
          tokenRequests.push({
            symbol: cex.symbol,
            chainIndex: '501',
            tokenContractAddress: tokenAddress
          });
          symbolToAddress[cex.symbol] = tokenAddress;
        }
      }

      // Get all DEX prices in a single batch request to avoid rate limits
      const dexPriceRequests = tokenRequests.map(req => ({
        chainIndex: req.chainIndex,
        tokenContractAddress: req.tokenContractAddress
      }));

      const dexPrices = await okxDEXService.getMultipleTokenPrices(dexPriceRequests);

      // Process arbitrage opportunities
      const opportunities: ArbitrageOpportunity[] = [];

      for (const cex of cexData) {
        try {
          const tokenAddress = symbolToAddress[cex.symbol];
          if (!tokenAddress) continue;

          const priceKey = `501-${tokenAddress}`;
          const dexPrice = dexPrices[priceKey];

          if (dexPrice && dexPrice > 0) {
            const priceSpread = Math.abs(dexPrice - cex.cexPrice);
            const profitPercent = ((Math.abs(dexPrice - cex.cexPrice) / Math.min(dexPrice, cex.cexPrice)) * 100);

            // Only include opportunities with meaningful spreads
            if (profitPercent > 0.1) {
              // Calculate estimated profit based on volume and spread
              const estimatedProfit = Math.min(cex.volume24h * 0.001, 50000) * (profitPercent / 100);

              // Determine risk level
              let risk: 'low' | 'medium' | 'high' = 'low';
              if (profitPercent > 2) risk = 'high';
              else if (profitPercent > 1) risk = 'medium';

              opportunities.push({
                symbol: cex.symbol,
                dexPrice,
                cexPrice: cex.cexPrice,
                priceSpread,
                profitPercent,
                volume24h: cex.volume24h,
                liquidity: Math.min(cex.volume24h * 0.1, 1000000), // Estimate liquidity
                estimatedProfit,
                risk,
                lastUpdated: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`Error processing arbitrage for ${cex.symbol}:`, error);
        }
      }

      // Sort by profit potential
      const sortedOpportunities = opportunities
        .sort((a, b) => b.profitPercent - a.profitPercent)
        .slice(0, 10);

      console.log(`Found ${sortedOpportunities.length} real arbitrage opportunities`);
      return sortedOpportunities;

    } catch (error) {
      console.error('Error fetching arbitrage opportunities:', error);
      return [];
    }
  }

  async getPortfolio(walletAddress?: string): Promise<Portfolio> {
    try {
      if (!walletAddress) {
        console.warn('No wallet address provided');
        return { totalValue: 0, tokens: [], lastUpdated: new Date() };
      }

      console.log(`Fetching portfolio for wallet: ${walletAddress}`);

      // Use OKX DEX Balance APIs for portfolio data
      const [totalValueData, tokenBalances] = await Promise.all([
        portfolioService.getTotalValue(walletAddress, '501'), // Solana chain
        portfolioService.getAllTokenBalances(walletAddress, ['501'])
      ]);

      const totalValue = parseFloat(totalValueData.totalValue) || 0;

      // Process token balances
      const tokens = tokenBalances.map(balance => ({
        symbol: balance.symbol,
        address: balance.tokenContractAddress,
        balance: parseFloat(balance.balance),
        value: parseFloat(balance.balance) * parseFloat(balance.tokenPrice),
        price: parseFloat(balance.tokenPrice),
        change24h: 0 // Would need additional API call for 24h change
      }));

      console.log(`Portfolio fetched: $${totalValue.toFixed(2)} across ${tokens.length} tokens`);

      return {
        totalValue,
        tokens,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      return { totalValue: 0, tokens: [], lastUpdated: new Date() };
    }
  }

  private getTokenAddress(symbol: string): string {
    const addresses: { [key: string]: string } = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      'ORCA': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
      'JTO': 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
      'MNGO': 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'
    };

    return addresses[symbol] || '';
  }
}

export const okxService = new OKXService();
