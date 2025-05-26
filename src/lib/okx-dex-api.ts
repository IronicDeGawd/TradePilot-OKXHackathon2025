// OKX DEX API service for real DEX price data across multiple chains
import crypto from 'crypto';
import { globalRateLimiter } from './rate-limiter';
import { constructApiUrl } from './url-utils';
export const OKX_CHAIN_INDEX = {
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  AVALANCHE: '43114',
  FANTOM: '250',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  SOLANA: '501',
  BASE: '8453',
  LINEA: '59144'
} as const;

// Common Solana token contract addresses (SPL tokens)
export const SOLANA_TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
} as const;

export interface OKXDEXPriceRequest {
  chainIndex: string;
  tokenContractAddress: string;
}

export interface OKXDEXPriceResponse {
  code: string;
  data: Array<{
    chainIndex: string;
    tokenContractAddress: string;
    time: string;
    price: string;
  }>;
  msg: string;
}

export interface OKXDEXConfig {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class OKXDEXService {
  private config: OKXDEXConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 3000; // 3 seconds between retries (increased)
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_CACHE_TTL = 60000; // 60 seconds cache (increased from 30s)

  constructor(config?: Partial<OKXDEXConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.OKX_API_KEY || '',
      secretKey: config?.secretKey || process.env.OKX_SECRET_KEY || '',
      passphrase: config?.passphrase || process.env.OKX_API_PASSPHRASE || '',
      baseUrl: config?.baseUrl || 'https://web3.okx.com'
    };
  }

  private getCacheKey(method: string, path: string, body?: string): string {
    return `${method}:${path}:${body || ''}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    try {
      console.log(`Making OKX DEX API request to: ${url} (attempt ${retryCount + 1})`);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429) or server errors (5xx)
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retryCount < this.MAX_RETRIES) {
          const retryDelay = this.RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`OKX DEX API request failed with status ${response.status}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          await this.delay(retryDelay);
          return this.makeApiRequest(url, options, retryCount + 1);
        }
      }

      return response;
    } catch (error) {
      console.error(`OKX DEX API request failed:`, error);

      if (retryCount < this.MAX_RETRIES) {
        const retryDelay = this.RETRY_DELAY * Math.pow(2, retryCount);

        // Handle different types of errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn(`OKX DEX request timed out, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          } else if (error.message.includes('Failed to fetch')) {
            console.warn(`OKX DEX network error (Failed to fetch), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          } else {
            console.warn(`OKX DEX request failed with error: ${error.message}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          }
        }

        await this.delay(retryDelay);
        return this.makeApiRequest(url, options, retryCount + 1);
      }

      // After all retries failed, throw a more descriptive error
      throw new Error(`OKX DEX API request failed after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  async getTokenPrice(chainIndex: string, tokenContractAddress: string): Promise<number | null> {
    const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price', `${chainIndex}-${tokenContractAddress}`);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null) {
      return cachedResult;
    }

    return globalRateLimiter.executeRequest(async () => {
      try {
        // Use our proxy API to avoid CORS issues
        const body = JSON.stringify([{ chainIndex, tokenContractAddress }]);
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body
        });

        if (!response.ok) {
          throw new Error(`OKX DEX API error: ${response.status}`);
        }

        const data: OKXDEXPriceResponse = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX DEX API error: ${data.msg}`);
        }

        const priceData = data.data[0];
        const result = priceData ? parseFloat(priceData.price) : null;

        // Cache the result for 30 seconds
        this.setCache(cacheKey, result);

        return result;
      } catch (error) {
        console.error('Error fetching OKX DEX price:', error);
        return null;
      }
    });
  }

  async getMultipleTokenPrices(requests: OKXDEXPriceRequest[]): Promise<{ [key: string]: number }> {
    // Check cache for each request
    const cachedPrices: { [key: string]: number } = {};
    const uncachedRequests: OKXDEXPriceRequest[] = [];

    requests.forEach(request => {
      const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price', `${request.chainIndex}-${request.tokenContractAddress}`);
      const cachedResult = this.getFromCache(cacheKey);

      if (cachedResult !== null) {
        const key = `${request.chainIndex}-${request.tokenContractAddress}`;
        cachedPrices[key] = cachedResult;
      } else {
        uncachedRequests.push(request);
      }
    });

    // If all prices are cached, return immediately
    if (uncachedRequests.length === 0) {
      return cachedPrices;
    }

    return globalRateLimiter.executeRequest(async () => {
      try {
        if (uncachedRequests.length > 20) {
          throw new Error('OKX DEX API supports maximum 20 tokens at once');
        }

        // Use our proxy API to avoid CORS issues
        const body = JSON.stringify(uncachedRequests);
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body
        });

        if (!response.ok) {
          throw new Error(`OKX DEX API error: ${response.status}`);
        }

        const data: OKXDEXPriceResponse = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX DEX API error: ${data.msg}`);
        }

        const newPrices: { [key: string]: number } = {};
        data.data.forEach(item => {
          const key = `${item.chainIndex}-${item.tokenContractAddress}`;
          const price = parseFloat(item.price);
          newPrices[key] = price;

          // Cache individual prices
          const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price', `${item.chainIndex}-${item.tokenContractAddress}`);
          this.setCache(cacheKey, price);
        });

        // Combine cached and new prices
        return { ...cachedPrices, ...newPrices };
      } catch (error) {
        console.error('Error fetching OKX DEX prices:', error);
        return cachedPrices; // Return cached prices if API fails
      }
    });
  }

  // Utility method to get SOL price
  async getSOLPrice(): Promise<number | null> {
    return this.getTokenPrice(OKX_CHAIN_INDEX.SOLANA, SOLANA_TOKEN_ADDRESSES.SOL);
  }

  // Utility method to get prices for common Solana tokens
  async getCommonSolanaTokenPrices(): Promise<{ [symbol: string]: number }> {
    const requests: OKXDEXPriceRequest[] = Object.entries(SOLANA_TOKEN_ADDRESSES).map(([symbol, address]) => ({
      chainIndex: OKX_CHAIN_INDEX.SOLANA,
      tokenContractAddress: address
    }));

    const prices = await this.getMultipleTokenPrices(requests);

    // Convert back to symbol-based mapping
    const symbolPrices: { [symbol: string]: number } = {};
    Object.entries(SOLANA_TOKEN_ADDRESSES).forEach(([symbol, address]) => {
      const key = `${OKX_CHAIN_INDEX.SOLANA}-${address}`;
      if (prices[key]) {
        symbolPrices[symbol] = prices[key];
      }
    });

    return symbolPrices;
  }

  // Get price comparison between chains for the same token
  async getCrossChainPriceComparison(tokenAddress: string, chains: string[]): Promise<{
    [chainIndex: string]: number;
  }> {
    try {
      const requests: OKXDEXPriceRequest[] = chains.map(chainIndex => ({
        chainIndex,
        tokenContractAddress: tokenAddress
      }));

      const prices = await this.getMultipleTokenPrices(requests);

      const chainPrices: { [chainIndex: string]: number } = {};
      chains.forEach(chainIndex => {
        const key = `${chainIndex}-${tokenAddress}`;
        if (prices[key]) {
          chainPrices[chainIndex] = prices[key];
        }
      });

      return chainPrices;
    } catch (error) {
      console.error('Error getting cross-chain price comparison:', error);
      return {};
    }
  }

  // Get arbitrage opportunities between DEX and CEX
  async getArbitrageOpportunities(tokens: { symbol: string; address: string; chainIndex: string }[]): Promise<any[]> {
    try {
      const requests: OKXDEXPriceRequest[] = tokens.map(token => ({
        chainIndex: token.chainIndex,
        tokenContractAddress: token.address
      }));

      const dexPrices = await this.getMultipleTokenPrices(requests);

      return tokens.map(token => {
        const key = `${token.chainIndex}-${token.address}`;
        const dexPrice = dexPrices[key];

        return {
          symbol: token.symbol,
          chainIndex: token.chainIndex,
          address: token.address,
          dexPrice,
          lastUpdated: new Date()
        };
      }).filter(item => item.dexPrice !== undefined);
    } catch (error) {
      console.error('Error fetching arbitrage opportunities:', error);
      return [];
    }
  }
}

export const okxDEXService = new OKXDEXService();
