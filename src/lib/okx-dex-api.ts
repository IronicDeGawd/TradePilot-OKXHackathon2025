// OKX DEX API service for real DEX price data across multiple chains
import crypto from 'crypto';
import { globalRateLimiter } from './rate-limiter';
import { constructApiUrl } from './url-utils';
import { shouldSkipApiCall } from './environment';
import { SOLANA_TOKENS } from '../config/tokens';
import type { ApiChainInfo, ApiTokenInfo, ApiTokenPriceInfo } from '../types';

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

// Use centralized token configuration - convert to address mapping
const createTokenAddressMapping = () => {
  const mapping: { [key: string]: string } = {};
  Object.values(SOLANA_TOKENS).forEach(token => {
    mapping[token.symbol] = token.address;
  });
  return mapping;
};

export const SOLANA_TOKEN_ADDRESSES = createTokenAddressMapping();

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
    marketCap?: string;
    priceChange5M?: string;
    priceChange1H?: string;
    priceChange4H?: string;
    priceChange24H?: string;
    volume5M?: string;
    volume1H?: string;
    volume4H?: string;
    volume24H?: string;
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
  private readonly RETRY_DELAY = 2000; // Changed from 1000ms to 2000ms
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_CACHE_TTL = 60000; // 60 seconds cache (increased)

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
    const timestamp = new Date().toISOString(); // Use ISO timestamp format as per official documentation
    const signature = this.createSignature(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.config.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.config.passphrase,
      'Content-Type': 'application/json',
      'User-Agent': 'TradePilot-AI-Server/1.0' // Added User-Agent
    };
  }

  async getTokenPrice(chainIndex: string, tokenContractAddress: string): Promise<number | null> {
    const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${chainIndex}-${tokenContractAddress}`);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null) {
      return cachedResult;
    }

    return globalRateLimiter.executeRequest(async () => {
      try {
        // Skip API calls during build time
        if (shouldSkipApiCall('getTokenPrice')) {
          return null;
        }

        // For server-side requests, make direct OKX API calls instead of going through proxy
        if (typeof window === 'undefined') {
          const requestPath = '/api/v5/dex/market/price-info';
          const body = JSON.stringify([{ chainIndex, tokenContractAddress }]);
          const headers = this.getHeaders('POST', requestPath, body);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'POST',
            headers,
            body
          });

          if (!response.ok) {
            throw new Error(`OKX DEX API error: ${response.status}`);
          }

          const data: OKXDEXPriceResponse = await response.json();

          if (data.code === '0' && data.data && data.data.length > 0) {
            const price = parseFloat(data.data[0].price);
            this.setCache(cacheKey, price);
            return price;
          }
          return null;
        }

        // For client-side requests, use the proxy API
        const body = JSON.stringify([{ chainIndex, tokenContractAddress }]);
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price-info`);

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

  // Enhanced batch price fetching - primary method for getting multiple token prices
  async getMultipleTokenPrices(requests: OKXDEXPriceRequest[]): Promise<{ [key: string]: number }> {
    // Validate batch size
    if (requests.length > 20) {
      console.warn(`Batch size exceeds maximum of 20 tokens (got ${requests.length}). Splitting into smaller batches for parallel processing.`);

      // Split into chunks of 20
      const chunks = [];
      for (let i = 0; i < requests.length; i += 20) {
        chunks.push(requests.slice(i, i + 20));
      }

      console.log(`Processing ${chunks.length} batches in parallel...`);

      // Process all chunks in parallel using Promise.allSettled
      // This ensures that failures in one batch don't stop other batches from completing
      const batchPromises = chunks.map((chunk, index) =>
        this.processBatch(chunk).catch(error => {
          console.error(`Batch ${index + 1}/${chunks.length} failed:`, error);
          return {}; // Return empty object on failure so other batches can still succeed
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Combine all successful results
      const allPrices: { [key: string]: number } = {};
      let successfulBatches = 0;
      let failedBatches = 0;

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const batchPrices = result.value;
          Object.assign(allPrices, batchPrices);

          if (Object.keys(batchPrices).length > 0) {
            successfulBatches++;
          } else {
            failedBatches++;
          }
        } else {
          failedBatches++;
          console.error(`Batch ${index + 1}/${chunks.length} was rejected:`, result.reason);
        }
      });

      console.log(`✅ Parallel batch processing completed: ${successfulBatches}/${chunks.length} batches successful, ${Object.keys(allPrices).length} total prices fetched`);

      if (failedBatches > 0) {
        console.warn(`⚠️ ${failedBatches}/${chunks.length} batches failed, but continuing with partial results`);
      }

      return allPrices;
    }

    return this.processBatch(requests);
  }

  private async processBatch(requests: OKXDEXPriceRequest[]): Promise<{ [key: string]: number }> {
    // Check cache for each request
    const cachedPrices: { [key: string]: number } = {};
    const uncachedRequests: OKXDEXPriceRequest[] = [];

    requests.forEach(request => {
      const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${request.chainIndex}-${request.tokenContractAddress}`);
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
        // Skip API calls during build time
        if (shouldSkipApiCall('getMultipleTokenPrices')) {
          return cachedPrices;
        }

        // For server-side requests, make direct OKX API calls
        if (typeof window === 'undefined') {
          const requestPath = '/api/v5/dex/market/price-info';
          const body = JSON.stringify(uncachedRequests);
          const headers = this.getHeaders('POST', requestPath, body);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'POST',
            headers,
            body
          });

          if (!response.ok) {
            throw new Error(`OKX DEX API error: ${response.status}`);
          }

          const data: OKXDEXPriceResponse = await response.json();

          if (data.code !== '0') {
            throw new Error(`OKX DEX API error: ${data.msg}`);
          }

          const allPrices = { ...cachedPrices };

          data.data.forEach(item => {
            const price = parseFloat(item.price);
            const key = `${item.chainIndex}-${item.tokenContractAddress}`;
            allPrices[key] = price;

            // Cache the individual price with longer TTL for batch requests
            const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${item.chainIndex}-${item.tokenContractAddress}`);
            this.setCache(cacheKey, price, 120000); // 2 minutes cache for batch data
          });

          return allPrices;
        }

        // For client-side requests, use the proxy API
        const body = JSON.stringify(uncachedRequests);
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price-info`);

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

          // Cache individual prices with longer TTL for batch requests
          const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${item.chainIndex}-${item.tokenContractAddress}`);
          this.setCache(cacheKey, price, 120000); // 2 minutes cache for batch data
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

  // Get price analysis for multiple tokens on the same chain (batch approach)
  async getSingleChainTokenAnalysis(chainIndex: string, tokenAddresses: string[]): Promise<{
    [tokenAddress: string]: {
      price: number;
      analysis: {
        rank: number;
        priceCategory: 'high' | 'medium' | 'low';
        volatility?: string;
      };
    };
  }> {
    try {
      const requests: OKXDEXPriceRequest[] = tokenAddresses.map(address => ({
        chainIndex,
        tokenContractAddress: address
      }));

      const prices = await this.getMultipleTokenPrices(requests);

      const tokenAnalysis: { [tokenAddress: string]: any } = {};
      const priceValues: number[] = [];

      // Collect all prices for analysis
      tokenAddresses.forEach(address => {
        const key = `${chainIndex}-${address}`;
        if (prices[key]) {
          priceValues.push(prices[key]);
        }
      });

      // Sort prices for ranking
      const sortedPrices = [...priceValues].sort((a, b) => b - a);

      tokenAddresses.forEach(address => {
        const key = `${chainIndex}-${address}`;
        if (prices[key]) {
          const price = prices[key];
          const rank = sortedPrices.indexOf(price) + 1;

          let priceCategory: 'high' | 'medium' | 'low' = 'medium';
          if (rank <= Math.ceil(sortedPrices.length * 0.2)) {
            priceCategory = 'high';
          } else if (rank >= Math.ceil(sortedPrices.length * 0.8)) {
            priceCategory = 'low';
          }

          tokenAnalysis[address] = {
            price,
            analysis: {
              rank,
              priceCategory
            }
          };
        }
      });

      return tokenAnalysis;
    } catch (error) {
      console.error('Error getting single chain token analysis:', error);
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

  // New API methods for Phase 1

  async getSupportedChains(): Promise<ApiChainInfo[]> {
    // Skip API calls during build time
    if (shouldSkipApiCall('getSupportedChains')) {
      return [];
    }

    const cacheKey = this.getCacheKey('GET', '/api/v5/dex/market/supported/chain');
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null) {
      return cachedResult;
    }

    return globalRateLimiter.executeRequest(async () => {
      try {
        // For server-side requests, make direct OKX API calls
        if (typeof window === 'undefined') {
          const requestPath = '/api/v5/dex/market/supported/chain';
          const headers = this.getHeaders('GET', requestPath);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'GET',
            headers
          });

          if (!response.ok) {
            throw new Error(`OKX DEX API error: ${response.status}`);
          }

          const data = await response.json();

          if (data.code !== '0') {
            throw new Error(`OKX DEX API error: ${data.msg}`);
          }

          const result = data.data || [];
          // Cache for 1 hour since supported chains don't change frequently
          this.setCache(cacheKey, result, 3600000);
          return result;
        }

        // For client-side requests, use the proxy API
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/supported/chain`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`OKX DEX API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX DEX API error: ${data.msg}`);
        }

        const result = data.data || [];
        // Cache for 1 hour since supported chains don't change frequently
        this.setCache(cacheKey, result, 3600000);
        return result;
      } catch (error) {
        console.error('Error fetching supported chains:', error);
        return [];
      }
    });
  }

  async getAllTokensForChain(chainIndex: string): Promise<ApiTokenInfo[]> {
    // Skip API calls during build time
    if (shouldSkipApiCall('getAllTokensForChain')) {
      return [];
    }

    const cacheKey = this.getCacheKey('GET', '/api/v5/dex/aggregator/all-tokens', chainIndex);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null) {
      return cachedResult;
    }

    return globalRateLimiter.executeRequest(async () => {
      try {
        // For server-side requests, make direct OKX API calls
        if (typeof window === 'undefined') {
          const requestPath = `/api/v5/dex/aggregator/all-tokens?chainIndex=${chainIndex}`;
          const headers = this.getHeaders('GET', requestPath);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'GET',
            headers
          });

          if (!response.ok) {
            throw new Error(`OKX DEX API error: ${response.status}`);
          }

          const data = await response.json();

          if (data.code !== '0') {
            throw new Error(`OKX DEX API error: ${data.msg}`);
          }

          const result = data.data || [];
          // Cache for 30 minutes since token lists don't change very frequently
          this.setCache(cacheKey, result, 1800000);
          return result;
        }

        // For client-side requests, use the proxy API
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=aggregator/all-tokens&chainIndex=${chainIndex}`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`OKX DEX API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== '0') {
          throw new Error(`OKX DEX API error: ${data.msg}`);
        }

        const result = data.data || [];
        // Cache for 30 minutes since token lists don't change too frequently
        this.setCache(cacheKey, result, 1800000);
        return result;
      } catch (error) {
        console.error(`Error fetching tokens for chain ${chainIndex}:`, error);
        return [];
      }
    });
  }

  async getBatchTokenPrice(chainIndex: string, tokenContractAddresses: string[]): Promise<ApiTokenPriceInfo[]> {
    if (tokenContractAddresses.length === 0) {
      return [];
    }

    // Validate and filter token addresses
    const validAddresses = this.validateTokenAddresses(tokenContractAddresses);
    if (validAddresses.length === 0) {
      console.warn('No valid token addresses provided for getBatchTokenPrice');
      return [];
    }

    if (validAddresses.length !== tokenContractAddresses.length) {
      console.warn(`Filtered out ${tokenContractAddresses.length - validAddresses.length} invalid token addresses in getBatchTokenPrice`);
    }

    const MAX_ADDRESSES_PER_BATCH = 20; // Reduced to 20 for better API reliability
    const allPriceInfo: ApiTokenPriceInfo[] = [];

    // Check cache first for individual tokens using only valid addresses
    const cachedPrices: ApiTokenPriceInfo[] = [];
    const uncachedAddresses: string[] = [];

    validAddresses.forEach(address => {
      const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${chainIndex}-${address}`);
      const cachedResult = this.getFromCache(cacheKey);

      if (cachedResult !== null) {
        // Ensure cached result is in the correct format
        if (typeof cachedResult === 'object' && cachedResult.tokenContractAddress) {
          cachedPrices.push(cachedResult as ApiTokenPriceInfo);
        } else if (typeof cachedResult === 'number') {
          // This is a legacy cache entry (just price), re-fetch for full ApiTokenPriceInfo
          console.warn(`Legacy cache format for ${address}, will attempt to re-fetch for full ApiTokenPriceInfo.`);
          uncachedAddresses.push(address);
        } else {
          // Unknown cache format, treat as uncached
          uncachedAddresses.push(address);
        }
      } else {
        uncachedAddresses.push(address);
      }
    });

    // If all prices are cached and in the correct format, return them
    if (uncachedAddresses.length === 0) {
      return cachedPrices;
    }

    // Process uncached addresses in batches using parallel processing
    if (uncachedAddresses.length > MAX_ADDRESSES_PER_BATCH) {
      console.log(`Processing ${Math.ceil(uncachedAddresses.length / MAX_ADDRESSES_PER_BATCH)} batches in parallel for ${uncachedAddresses.length} valid tokens...`);

      // Split into batches
      const batches = [];
      for (let i = 0; i < uncachedAddresses.length; i += MAX_ADDRESSES_PER_BATCH) {
        batches.push(uncachedAddresses.slice(i, i + MAX_ADDRESSES_PER_BATCH));
      }

      // Process all batches in parallel using Promise.allSettled
      const batchPromises = batches.map((batchAddresses, batchIndex) =>
        globalRateLimiter.executeRequest(async () => {
          try {
            // Skip API calls during build time
            if (shouldSkipApiCall('getBatchTokenPrice')) {
              return [];
            }

            // Create request body as array of objects based on API docs
            const requestBody = batchAddresses.map(address => ({
              chainIndex,
              tokenContractAddress: address
            }));

            let currentBatchPrices: ApiTokenPriceInfo[] = [];
            // For server-side requests, make direct OKX API calls
            if (typeof window === 'undefined') {
              const requestPath = '/api/v5/dex/market/price-info';
              const bodyString = JSON.stringify(requestBody);
              const headers = this.getHeaders('POST', requestPath, bodyString);
              const okxUrl = `${this.config.baseUrl}${requestPath}`;

              const response = await this.makeApiRequest(okxUrl, {
                method: 'POST',
                headers,
                body: bodyString
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OKX DEX API error: ${response.status} ${response.statusText} - ${errorText}`);
              }

              const data = await response.json();

              if (data.code !== '0') {
                const errorMsg = data.msg || data.message || 'Unknown error';
                const errorDetails = data.data ? JSON.stringify(data.data) : '';
                throw new Error(`OKX DEX API error: Code ${data.code} - ${errorMsg}${errorDetails ? ` - Details: ${errorDetails}` : ''}`);
              }
              currentBatchPrices = data.data || [];
            } else {
              // For client-side requests, use the proxy API
              const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price-info`);
              const response = await this.makeApiRequest(proxyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OKX DEX API error via proxy: ${response.status} ${response.statusText} - ${errorText}`);
              }
              const data = await response.json();
              if (data.code !== '0') {
                const errorMsg = data.msg || data.message || 'Unknown error';
                const errorDetails = data.data ? JSON.stringify(data.data) : '';
                throw new Error(`OKX DEX API error via proxy: Code ${data.code} - ${errorMsg}${errorDetails ? ` - Details: ${errorDetails}` : ''}`);
              }
              currentBatchPrices = data.data || [];
            }

            // Cache individual token prices
            currentBatchPrices.forEach((priceInfo: ApiTokenPriceInfo) => {
                if (priceInfo && priceInfo.tokenContractAddress) {
                    const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${chainIndex}-${priceInfo.tokenContractAddress}`);
                    this.setCache(cacheKey, priceInfo, this.DEFAULT_CACHE_TTL);
                }
            });
            return currentBatchPrices;

          } catch (error) {
            console.error(`Error fetching batch token prices for chain ${chainIndex} (batch ${batchIndex + 1}):`, error);
            console.error(`Batch addresses (${batchAddresses.length}):`, batchAddresses);

            // Try to fetch individual prices for failed batch as fallback
            const individualPrices: ApiTokenPriceInfo[] = [];
            for (const address of batchAddresses) {
              try {
                // Ensure address is still considered valid before attempting individual fetch
                if (this.isValidTokenAddress(address)) {
                  const priceInfo = await this.fetchAndCacheIndividualTokenPrice(chainIndex, address);
                  if (priceInfo) {
                    individualPrices.push(priceInfo);
                  }
                }
              } catch (individualError) {
                console.warn(`Failed to fetch individual price for ${address} during fallback:`, individualError);
              }
            }
            if (individualPrices.length > 0) {
              console.log(`✅ Recovered ${individualPrices.length}/${batchAddresses.length} prices using individual requests for batch ${batchIndex + 1}`);
            }
            return individualPrices; // Return recovered prices or empty array
          }
        }).catch(error => {
          console.error(`Batch ${batchIndex + 1} failed with rate limiter error:`, error);
          return []; // Return empty array on failure
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      let successfulBatches = 0;
      let failedBatches = 0;

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const batchPrices = result.value as ApiTokenPriceInfo[]; // Cast here
          allPriceInfo.push(...batchPrices.filter(p => p && p.tokenContractAddress));
          if (batchPrices.length > 0) {
            successfulBatches++;
          } else {
            // This could be a batch that successfully returned an empty array (e.g. all fallbacks failed)
            // Consider if this should count as failed or just empty. For now, if it fulfilled, it's not a "failed batch" in terms of promise rejection.
          }
        } else {
          failedBatches++;
          console.error(`Batch ${index + 1}/${batches.length} was rejected or value was null/undefined:`, result.status === 'rejected' ? result.reason : 'Fulfilled with no value');
        }
      });
      console.log(`✅ Parallel batch processing completed: ${successfulBatches} successful promise resolutions out of ${batches.length} batches, ${allPriceInfo.length} total prices fetched/recovered`);
      if (failedBatches > 0) {
        console.warn(`⚠️ ${failedBatches}/${batches.length} batches were rejected or had issues during parallel processing.`);
      }

    } else { // Single batch processing for smaller requests (uncachedAddresses.length <= MAX_ADDRESSES_PER_BATCH)
      const batchAddresses = uncachedAddresses;
      const singleBatchResult = await globalRateLimiter.executeRequest(async () => {
        try {
          if (shouldSkipApiCall('getBatchTokenPrice')) {
            return [];
          }
          const requestBody = batchAddresses.map(address => ({ chainIndex, tokenContractAddress: address }));
          let currentBatchPrices: ApiTokenPriceInfo[] = [];

          if (typeof window === 'undefined') {
            const requestPath = '/api/v5/dex/market/price-info';
            const bodyString = JSON.stringify(requestBody);
            const headers = this.getHeaders('POST', requestPath, bodyString);
            const okxUrl = `${this.config.baseUrl}${requestPath}`;
            const response = await this.makeApiRequest(okxUrl, { method: 'POST', headers, body: bodyString });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`OKX DEX API error (single batch): ${response.status} ${response.statusText} - ${errorText}`); }
            const data = await response.json();
            if (data.code !== '0') { const errorMsg = data.msg || data.message || 'Unknown error'; const errorDetails = data.data ? JSON.stringify(data.data) : ''; throw new Error(`OKX DEX API error (single batch): Code ${data.code} - ${errorMsg}${errorDetails ? ` - Details: ${errorDetails}` : ''}`);}
            currentBatchPrices = data.data || [];
          } else {
            const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price-info`);
            const response = await this.makeApiRequest(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`OKX DEX API error via proxy (single batch): ${response.status} ${response.statusText} - ${errorText}`); }
            const data = await response.json();
            if (data.code !== '0') { const errorMsg = data.msg || data.message || 'Unknown error'; const errorDetails = data.data ? JSON.stringify(data.data) : ''; throw new Error(`OKX DEX API error via proxy (single batch): Code ${data.code} - ${errorMsg}${errorDetails ? ` - Details: ${errorDetails}` : ''}`);}
            currentBatchPrices = data.data || [];
          }

          currentBatchPrices.forEach((priceInfo: ApiTokenPriceInfo) => {
            if (priceInfo && priceInfo.tokenContractAddress) {
                const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${chainIndex}-${priceInfo.tokenContractAddress}`);
                this.setCache(cacheKey, priceInfo, this.DEFAULT_CACHE_TTL);
            }
          });
          return currentBatchPrices;
        } catch (error) {
          console.error(`Error fetching single batch token prices for chain ${chainIndex}:`, error);
          console.error(`Single Batch addresses (${batchAddresses.length}):`, batchAddresses);
          const individualPrices: ApiTokenPriceInfo[] = [];
          for (const address of batchAddresses) {
            try {
              if (this.isValidTokenAddress(address)) {
                 const priceInfo = await this.fetchAndCacheIndividualTokenPrice(chainIndex, address);
                 if (priceInfo) {
                    individualPrices.push(priceInfo);
                 }
              }
            } catch (individualError) {
              console.warn(`Failed to fetch individual price for ${address} during fallback (single batch):`, individualError);
            }
          }
          if (individualPrices.length > 0) {
            console.log(`✅ Recovered ${individualPrices.length}/${batchAddresses.length} prices using individual requests (single batch)`);
          }
          return individualPrices;
        }
      });
      allPriceInfo.push(...(singleBatchResult || []).filter(p => p && p.tokenContractAddress));
    }

    // Combine cached and newly fetched prices.
    // Ensure allPriceInfo only contains valid, successfully fetched prices before merging.
    const finalResults = [...cachedPrices];
    const newUniquePrices = new Map<string, ApiTokenPriceInfo>();

    // Add cached prices to map to ensure they are prioritized and unique
    cachedPrices.forEach(p => {
        if (p && p.tokenContractAddress) {
            newUniquePrices.set(`${p.chainIndex}-${p.tokenContractAddress}`, p);
        }
    });

    // Add new/recovered prices, potentially overwriting older cache stubs if full info was fetched
    allPriceInfo.forEach(p => {
        if (p && p.tokenContractAddress) {
            newUniquePrices.set(`${p.chainIndex}-${p.tokenContractAddress}`, p);
        }
    });

    return Array.from(newUniquePrices.values());
  }

  // Helper method to fetch and cache individual token price, returns ApiTokenPriceInfo or null
  private async fetchAndCacheIndividualTokenPrice(chainIndex: string, tokenContractAddress: string): Promise<ApiTokenPriceInfo | null> {
    if (shouldSkipApiCall('getTokenPrice')) {
      return null;
    }
    const cacheKey = this.getCacheKey('POST', '/api/v5/dex/market/price-info', `${chainIndex}-${tokenContractAddress}`);
    const cachedResult = this.getFromCache(cacheKey);

    if (cachedResult !== null && typeof cachedResult === 'object' && cachedResult.tokenContractAddress && typeof cachedResult.price === 'string') {
        return cachedResult as ApiTokenPriceInfo;
    }
    if (cachedResult !== null && typeof cachedResult === 'number') {
        console.warn(`Legacy cache format (number) for ${tokenContractAddress} on chain ${chainIndex}, re-fetching for full ApiTokenPriceInfo.`);
    }

    const requestBody = [{ chainIndex, tokenContractAddress }];
    let priceInfo: ApiTokenPriceInfo | null = null;

    try {
        if (typeof window === 'undefined') { // Server-side
            const requestPath = '/api/v5/dex/market/price-info';
            const bodyString = JSON.stringify(requestBody);
            const headers = this.getHeaders('POST', requestPath, bodyString);
            const okxUrl = `${this.config.baseUrl}${requestPath}`;
            const response = await this.makeApiRequest(okxUrl, { method: 'POST', headers, body: bodyString });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OKX API error (fetchAndCache): ${response.status} - ${errorText}`);
            }
            const data: OKXDEXPriceResponse = await response.json();
            if (data.code === '0' && data.data && data.data.length > 0) {
                priceInfo = data.data[0] as ApiTokenPriceInfo;
            } else {
                 throw new Error(data.msg || `Failed to fetch price info from OKX (fetchAndCache) for ${tokenContractAddress}`);
            }
        } else { // Client-side (proxy)
            const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/price-info`);
            const response = await this.makeApiRequest(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Proxy API error (fetchAndCache): ${response.status} - ${errorText}`);
            }
            const data: OKXDEXPriceResponse = await response.json();
            if (data.code === '0' && data.data && data.data.length > 0) {
                priceInfo = data.data[0] as ApiTokenPriceInfo;
            } else {
                throw new Error(data.msg || `Failed to fetch price info from Proxy (fetchAndCache) for ${tokenContractAddress}`);
            }
        }

        if (priceInfo && priceInfo.tokenContractAddress) {
            this.setCache(cacheKey, priceInfo, this.DEFAULT_CACHE_TTL);
            return priceInfo;
        }
        return null; // Explicitly return null if no priceInfo was obtained
    } catch (error) {
        console.error(`Error in fetchAndCacheIndividualTokenPrice for ${tokenContractAddress} on chain ${chainIndex}:`, error);
        return null; // Return null on error
    }
  }

  // Enhanced batch price fetching with validation and detailed responses
  async getBatchTokenPrices(
    tokens: Array<{ chainIndex: string; tokenContractAddress: string; symbol?: string }>
  ): Promise<{
    success: boolean;
    data: Array<{
      symbol?: string;
      chainIndex: string;
      tokenContractAddress: string;
      price: number | null;
      error?: string;
    }>;
    totalRequested: number;
    totalSuccessful: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      data: [] as Array<{
        symbol?: string;
        chainIndex: string;
        tokenContractAddress: string;
        price: number | null;
        error?: string;
      }>,
      totalRequested: tokens.length,
      totalSuccessful: 0,
      errors: [] as string[]
    };

    try {
      // Validate input
      if (!Array.isArray(tokens) || tokens.length === 0) {
        result.errors.push('No tokens provided');
        return result;
      }

      if (tokens.length > 20) {
        result.errors.push('Maximum 20 tokens allowed per batch request');
        return result;
      }

      // Validate each token request
      const validTokens: Array<{ chainIndex: string; tokenContractAddress: string; symbol?: string }> = [];
      tokens.forEach((token, index) => {
        if (!token.chainIndex || !token.tokenContractAddress) {
          result.data.push({
            symbol: token.symbol,
            chainIndex: token.chainIndex || '',
            tokenContractAddress: token.tokenContractAddress || '',
            price: null,
            error: `Invalid token data at index ${index}`
          });
          result.errors.push(`Invalid token data at index ${index}`);
        } else {
          validTokens.push(token);
        }
      });

      if (validTokens.length === 0) {
        result.errors.push('No valid tokens to process');
        return result;
      }

      // Use existing method to get prices
      const requests: OKXDEXPriceRequest[] = validTokens.map(token => ({
        chainIndex: token.chainIndex,
        tokenContractAddress: token.tokenContractAddress
      }));

      const prices = await this.getMultipleTokenPrices(requests);

      // Process results
      validTokens.forEach(token => {
        const key = `${token.chainIndex}-${token.tokenContractAddress}`;
        const price = prices[key] || null;

        result.data.push({
          symbol: token.symbol,
          chainIndex: token.chainIndex,
          tokenContractAddress: token.tokenContractAddress,
          price,
          error: price === null ? 'Price not available' : undefined
        });

        if (price !== null) {
          result.totalSuccessful++;
        }
      });

      result.success = result.totalSuccessful > 0;

      if (result.totalSuccessful === 0) {
        result.errors.push('No prices fetched successfully');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(errorMessage);
      console.error('Error in getBatchTokenPrices:', error);
      return result;
    }
  }

  private isValidTokenAddress = (address: string): boolean => {
    if (!address || typeof address !== 'string') {
      return false;
    }

    const trimmedAddress = address.trim();

    if (trimmedAddress.length === 0) {
      return false;
    }

    // SystemProgram ID for Solana, not a typical token.
    if (trimmedAddress === '11111111111111111111111111111111') {
        console.warn(`Identified Solana SystemProgram ID, treating as invalid for token price: ${trimmedAddress}`);
        return false;
    }

    // Additional known invalid addresses
    const knownInvalidAddresses = [
      '0x0000000000000000000000000000000000000000', // Ethereum zero address
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // This should be valid USDC, removing this
    ];

    if (knownInvalidAddresses.includes(trimmedAddress)) {
      console.warn(`Identified known invalid address: ${trimmedAddress}`);
      return false;
    }

    // Other common placeholder/burn addresses (examples)
    if (/^0x0+$/.test(trimmedAddress) || trimmedAddress.toLowerCase() === '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead') {
        return false;
    }


    // Basic structural checks based on common patterns
    if (trimmedAddress.startsWith('0x')) { // EVM-like
        if (trimmedAddress.length !== 42) return false; // 0x + 40 hex chars
        if (!/^[0-9a-fA-F]+$/.test(trimmedAddress.substring(2))) return false;
    } else { // Potentially Solana or other non-EVM
        // Solana addresses are base58 and typically 32-44 chars.
        // This is a loose check; a dedicated base58 validator would be better for Solana.
        if (trimmedAddress.length < 32 || trimmedAddress.length > 44) {
            // This might be too restrictive if other chain address formats are expected here
            // without more context on which chains are passed to this generic validator.
            // For now, let's assume if it's not EVM-like, it might be Solana-like.
            // console.warn(\`Address \${trimmedAddress} has non-standard length for Solana-like address: \${trimmedAddress.length}\`);
            // return false; // Uncomment if strict Solana length is required for non-EVM
        }
        // A simple check for likely invalid characters if not EVM hex
        if (/[^1-9A-HJ-NP-Za-km-z0-9]/i.test(trimmedAddress) && !trimmedAddress.startsWith('0x')) {
             console.warn(`Address ${trimmedAddress} contains potentially invalid characters for non-EVM address.`);
            // return false; // This could be too aggressive
        }
    }
    return true;
  };

  private validateTokenAddresses(addresses: string[]): string[] {
    const validAddresses: string[] = [];
    const invalidAddresses: string[] = [];

    addresses.forEach((address, index) => {
      const trimmedAddress = address ? address.trim() : '';
      if (this.isValidTokenAddress(trimmedAddress)) {
        validAddresses.push(trimmedAddress);
      } else {
        invalidAddresses.push(address); // Log the original address for clarity
        console.warn(`Invalid token address at index ${index}: "${address}"`);
      }
    });

    if (invalidAddresses.length > 0) {
      console.warn(`Found ${invalidAddresses.length} invalid token addresses: [${invalidAddresses.map(addr => `"${addr}"`).join(', ')}]`);
    }
    return validAddresses;
  }
}

export const okxDEXService = new OKXDEXService();
