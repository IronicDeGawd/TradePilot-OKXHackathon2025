import crypto from 'crypto';

interface OKXCEXConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
}

interface OKXMarketData {
  instId: string;
  last: string;
  lastSz: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
  ts: string;
}

interface OKXCandle {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
  volCcy: string;
}

class OKXCEXService {
  private config: OKXCEXConfig;

  constructor() {
    this.config = {
      apiKey: process.env.OKX_API_KEY || '',
      secretKey: process.env.OKX_SECRET_KEY || '',
      passphrase: process.env.OKX_API_PASSPHRASE || '',
      baseUrl: 'https://www.okx.com'
    };
  }

  private createSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64');
  }

  private getHeaders(method: string, requestPath: string, body: string = '') {
    const timestamp = new Date().toISOString();
    const signature = this.createSignature(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'Content-Type': 'application/json'
    };
  }

  async getMarketData(symbols: string[]): Promise<OKXMarketData[]> {
    try {
      const requestPath = '/api/v5/market/tickers?instType=SPOT';
      const headers = this.getHeaders('GET', requestPath);

      const response = await fetch(`${this.config.baseUrl}${requestPath}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(`OKX API error: ${data.msg}`);
      }

      // Filter for Solana-related tokens
      const solanaTokens = data.data.filter((ticker: OKXMarketData) =>
        symbols.some(symbol => ticker.instId.includes(symbol + '-USDT') || ticker.instId.includes(symbol + '-USDC'))
      );

      return solanaTokens;
    } catch (error) {
      console.error('Error fetching OKX market data:', error);
      return [];
    }
  }

  async getTrendingTokens(): Promise<any[]> {
    try {
      // Get market data for major Solana tokens
      const solanaTokens = ['SOL', 'JUP', 'RAY', 'ORCA', 'JTO', 'BONK', 'WIF', 'PYTH', 'MNGO'];
      const marketData = await this.getMarketData(solanaTokens);

      // Get 24h candle data for trend analysis
      const trendingData = await Promise.all(
        marketData.slice(0, 10).map(async (ticker) => {
          try {
            const symbol = ticker.instId.split('-')[0];
            const candlePath = `/api/v5/market/candles?instId=${ticker.instId}&bar=1D&limit=2`;
            const headers = this.getHeaders('GET', candlePath);

            const candleResponse = await fetch(`${this.config.baseUrl}${candlePath}`, {
              method: 'GET',
              headers
            });

            let change24h = parseFloat(ticker.open24h) > 0 ?
              ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h)) * 100 : 0;

            if (candleResponse.ok) {
              const candleData = await candleResponse.json();
              if (candleData.code === '0' && candleData.data.length >= 2) {
                const [current, previous] = candleData.data;
                const currentClose = parseFloat(current[4]);
                const previousClose = parseFloat(previous[4]);
                change24h = ((currentClose - previousClose) / previousClose) * 100;
              }
            }

            // Calculate trend score based on volume and price change
            const volume24h = parseFloat(ticker.volCcy24h);
            const trendScore = Math.min(100, Math.max(0,
              (Math.abs(change24h) * 3) +
              (Math.log10(volume24h / 1000000) * 15) +
              (volume24h > 10000000 ? 20 : 0) // Bonus for high volume
            ));

            return {
              symbol,
              address: this.getTokenAddress(symbol),
              price: parseFloat(ticker.last),
              change24h,
              volume24h,
              marketCap: this.estimateMarketCap(symbol, parseFloat(ticker.last)),
              socialMentions: this.estimateSocialMentions(volume24h, change24h, symbol),
              trendScore: Math.round(trendScore),
              lastUpdated: new Date()
            };
          } catch (error) {
            console.error(`Error processing ${ticker.instId}:`, error);
            return null;
          }
        })
      );

      return trendingData
        .filter(token => token !== null)
        .sort((a, b) => b.trendScore - a.trendScore);
    } catch (error) {
      console.error('Error fetching trending tokens from OKX:', error);
      return [];
    }
  }

  async getArbitrageData(symbols: string[]): Promise<any[]> {
    try {
      const marketData = await this.getMarketData(symbols);

      return marketData.map(ticker => {
        const symbol = ticker.instId.split('-')[0];
        const cexPrice = parseFloat(ticker.last);

        return {
          symbol,
          cexPrice,
          bidPrice: parseFloat(ticker.bidPx),
          askPrice: parseFloat(ticker.askPx),
          volume24h: parseFloat(ticker.volCcy24h),
          lastUpdated: new Date()
        };
      });
    } catch (error) {
      console.error('Error fetching arbitrage data from OKX:', error);
      return [];
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
      'MNGO': 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    return addresses[symbol] || '';
  }

  private estimateMarketCap(symbol: string, price: number): number {
    // Rough estimates for market cap calculation
    const supplies: { [key: string]: number } = {
      'SOL': 580_000_000,
      'JUP': 1_000_000_000,
      'RAY': 555_000_000,
      'ORCA': 100_000_000,
      'JTO': 100_000_000,
      'BONK': 69_474_461_231_726,
      'WIF': 998_926_392,
      'PYTH': 4_000_000_000,
      'MNGO': 10_000_000_000,
      'USDC': 3_400_000_000
    };

    const supply = supplies[symbol] || 1_000_000_000;
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

export const okxCEXService = new OKXCEXService();
