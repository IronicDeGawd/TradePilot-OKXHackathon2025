import crypto from 'crypto';
import { getAllTokenSymbols, getTokenBySymbol, MARKET_CAP_ESTIMATES, SOCIAL_MULTIPLIERS } from '../config/tokens';

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
      const solanaTokens = getAllTokenSymbols();
      const marketData = await this.getMarketData(solanaTokens);

      // Get 24h candle data for trend analysis
      const trendingData = await Promise.all(
        marketData.map(async (ticker) => {
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
    const token = getTokenBySymbol(symbol);
    return token?.address || '';
  }

  private estimateMarketCap(symbol: string, price: number): number {
    const estimatedCap = MARKET_CAP_ESTIMATES[symbol];
    if (estimatedCap) {
      // Use live price with estimated supply ratio
      const estimatedSupply = estimatedCap / 100; // Assuming $100 base price for ratio
      return price * estimatedSupply;
    }

    // Default fallback
    return price * 1000000000;
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

    // Use centralized social multipliers
    const multiplier = SOCIAL_MULTIPLIERS[symbol] || 1.0;

    // Calculate estimated mentions with reasonable bounds
    const estimatedMentions = Math.floor((volumeComponent + volatilityComponent) * multiplier) + 50;

    // Cap at reasonable limits (50 minimum, 10000 maximum)
    return Math.min(Math.max(estimatedMentions, 50), 10000);
  }
}

export const okxCEXService = new OKXCEXService();
