// Extended OKX DEX API service for trending analysis and trading data
import crypto from 'crypto';
import { globalRateLimiter } from './rate-limiter';
import { constructApiUrl } from './url-utils';
import { shouldSkipApiCall } from './environment';
import { okxDEXService } from './okx-dex-api';
import type { ChainData, ExtendedTokenData, TokenPriceData, ApiChainInfo, ApiTokenInfo, ApiTokenPriceInfo } from '../types';

export interface OKXTradeData {
  id: string;
  chainIndex: string;
  tokenContractAddress: string;
  type: 'buy' | 'sell';
  price: string;
  volume: string;
  time: string;
}

export interface OKXCandlestickData {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
  volUsd: string;
  confirm: string;
}

class OKXDEXExtended {
  private config = {
    apiKey: process.env.OKX_API_KEY || '',
    secretKey: process.env.OKX_SECRET_KEY || '',
    passphrase: process.env.OKX_API_PASSPHRASE || '',
    baseUrl: 'https://web3.okx.com'
  };

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // Changed from 3000ms to 2000ms

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeApiRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    try {
      console.log(`Making API request to: ${url} (attempt ${retryCount + 1})`);

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
          console.warn(`API request failed with status ${response.status}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          await this.delay(retryDelay);
          return this.makeApiRequest(url, options, retryCount + 1);
        }
      }

      return response;
    } catch (error) {
      console.error(`API request failed:`, error);

      if (retryCount < this.MAX_RETRIES) {
        const retryDelay = this.RETRY_DELAY * Math.pow(2, retryCount);

        // Handle different types of errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn(`Request timed out, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          } else if (error.message.includes('Failed to fetch')) {
            console.warn(`Network error (Failed to fetch), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          } else {
            console.warn(`Request failed with error: ${error.message}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          }
        }

        await this.delay(retryDelay);
        return this.makeApiRequest(url, options, retryCount + 1);
      }

      // After all retries failed, throw a more descriptive error
      throw new Error(`API request failed after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createSignature(timestamp: string, method: string, requestPath: string, body = ''): string {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', this.config.secretKey).update(message).digest('base64');
  }

  private getHeaders(method: string, requestPath: string, body = '') {
    const timestamp = new Date().toISOString();
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

  async getTrades(chainIndex: string, tokenContractAddress: string, limit = 100): Promise<OKXTradeData[]> {
    return globalRateLimiter.executeRequest(async () => {
      try {
        // Skip API calls during build time
        if (shouldSkipApiCall('getTrades')) {
          return [];
        }

        // For server-side requests, make direct OKX API calls
        if (typeof window === 'undefined') {
          const requestPath = `/api/v5/dex/market/trades?chainIndex=${chainIndex}&tokenContractAddress=${tokenContractAddress}&limit=${limit}`;
          const headers = this.getHeaders('GET', requestPath);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'GET',
            headers
          });

          const data = await response.json();
          return data.code === '0' ? data.data || [] : [];
        }

        // For client-side requests, use our proxy API to avoid CORS issues
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/trades&chainIndex=${chainIndex}&tokenContractAddress=${tokenContractAddress}&limit=${limit}`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();
        return data.code === '0' ? data.data || [] : [];
      } catch (error) {
        console.error('Error fetching trades:', error);
        return [];
      }
    });
  }

  async getCandlesticks(chainIndex: string, tokenContractAddress: string, bar = '1H', limit = 24): Promise<OKXCandlestickData[]> {
    return globalRateLimiter.executeRequest(async () => {
      try {
        // Skip API calls during build time
        if (shouldSkipApiCall('getCandlesticks')) {
          return [];
        }

        // For server-side requests, make direct OKX API calls
        if (typeof window === 'undefined') {
          const requestPath = `/api/v5/dex/market/candles?chainIndex=${chainIndex}&tokenContractAddress=${tokenContractAddress}&bar=${bar}&limit=${limit}`;
          const headers = this.getHeaders('GET', requestPath);
          const okxUrl = `${this.config.baseUrl}${requestPath}`;

          const response = await this.makeApiRequest(okxUrl, {
            method: 'GET',
            headers
          });

          const data = await response.json();

          if (data.code === '0') {
            return data.data.map((candle: string[]) => ({
              ts: candle[0],
              o: candle[1],
              h: candle[2],
              l: candle[3],
              c: candle[4],
              vol: candle[5],
              volUsd: candle[6],
              confirm: candle[7]
            }));
          }
          return [];
        }

        // For client-side requests, use our proxy API to avoid CORS issues
        const proxyUrl = constructApiUrl(`/api/okx-proxy?endpoint=market/candles&chainIndex=${chainIndex}&tokenContractAddress=${tokenContractAddress}&bar=${bar}&limit=${limit}`);

        const response = await this.makeApiRequest(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();

        if (data.code === '0') {
          return data.data.map((candle: string[]) => ({
            ts: candle[0],
            o: candle[1],
            h: candle[2],
            l: candle[3],
            c: candle[4],
            vol: candle[5],
            volUsd: candle[6],
            confirm: candle[7]
          }));
        }
        return [];
      } catch (error) {
        console.error('Error fetching candlesticks:', error);
        return [];
      }
    });
  }

  // New wrapper methods for Phase 1

  async getSupportedChains(): Promise<ChainData[]> {
    // Skip API calls during build time
    if (shouldSkipApiCall('getSupportedChains')) {
      return [];
    }

    try {
      const apiChains = await okxDEXService.getSupportedChains();
      return apiChains.map((chain: ApiChainInfo) => ({
        chainIndex: chain.chainIndex,
        name: chain.chainName,
        symbol: chain.chainSymbol
      }));
    } catch (error) {
      console.error('Error getting supported chains:', error);
      return [];
    }
  }

  async getAllTokens(chainIndex: string): Promise<ExtendedTokenData[]> {
    // Skip API calls during build time
    if (shouldSkipApiCall('getAllTokens')) {
      return [];
    }

    try {
      const apiTokens = await okxDEXService.getAllTokensForChain(chainIndex);

      // Filter out invalid addresses like SystemProgram ID
      const filteredTokens = apiTokens.filter((token: ApiTokenInfo) => {
        const address = token.tokenContractAddress?.trim();
        // Filter out known invalid addresses
        const invalidAddresses = [
          '11111111111111111111111111111111', // Solana SystemProgram ID
          '0x0000000000000000000000000000000000000000', // Ethereum zero address
        ];

        if (!address || invalidAddresses.includes(address)) {
          console.warn(`Filtering out invalid token address: ${address}`);
          return false;
        }

        return true;
      });

      return filteredTokens.map((token: ApiTokenInfo) => ({
        address: token.tokenContractAddress,
        name: token.tokenName,
        symbol: token.tokenSymbol,
        decimals: parseInt(token.decimals),
        logoUrl: token.tokenLogoUrl,
        chainIndex
      }));
    } catch (error) {
      console.error(`Error getting tokens for chain ${chainIndex}:`, error);
      return [];
    }
  }

  async getBatchTokenPrices(chainIndex: string, tokenAddresses: string[]): Promise<TokenPriceData[]> {
    if (!tokenAddresses || tokenAddresses.length === 0) {
      return [];
    }

    try {
      console.log(`📊 Fetching batch prices for ${tokenAddresses.length} tokens on chain ${chainIndex}`);
      const apiPrices = await okxDEXService.getBatchTokenPrice(chainIndex, tokenAddresses);

      const results = apiPrices.map((priceInfo: ApiTokenPriceInfo) => ({
        address: priceInfo.tokenContractAddress,
        chainIndex: priceInfo.chainIndex,
        price: parseFloat(priceInfo.price),
        priceChange5M: priceInfo.priceChange5M ? parseFloat(priceInfo.priceChange5M) : undefined,
        priceChange1H: priceInfo.priceChange1H ? parseFloat(priceInfo.priceChange1H) : undefined,
        priceChange4H: priceInfo.priceChange4H ? parseFloat(priceInfo.priceChange4H) : undefined,
        priceChange24H: priceInfo.priceChange24H ? parseFloat(priceInfo.priceChange24H) : undefined,
        volume5M: priceInfo.volume5M ? parseFloat(priceInfo.volume5M) : undefined,
        volume1H: priceInfo.volume1H ? parseFloat(priceInfo.volume1H) : undefined,
        volume4H: priceInfo.volume4H ? parseFloat(priceInfo.volume4H) : undefined,
        volume24H: priceInfo.volume24H ? parseFloat(priceInfo.volume24H) : undefined,
        marketCap: priceInfo.marketCap ? parseFloat(priceInfo.marketCap) : undefined,
        timestamp: parseInt(priceInfo.time)
      }));

      const successRate = Math.round((results.length / tokenAddresses.length) * 100);
      console.log(`📊 Batch price fetch completed: ${results.length}/${tokenAddresses.length} tokens (${successRate}%)`);

      if (successRate < 50) {
        console.warn(`⚠️ Low success rate for batch price fetch on chain ${chainIndex}`);
      }

      return results;
    } catch (error) {
      console.error(`❌ Error getting batch token prices for chain ${chainIndex}:`, error);

      // Return empty array but don't throw - let the calling code handle the lack of data
      return [];
    }
  }
}

export const okxDEXExtended = new OKXDEXExtended();
