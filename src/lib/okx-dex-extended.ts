// Extended OKX DEX API service for trending analysis and trading data
import crypto from 'crypto';
import { globalRateLimiter } from './rate-limiter';
import { constructApiUrl } from './url-utils';

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
  private readonly RETRY_DELAY = 3000; // 3 seconds between retries

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
      'Content-Type': 'application/json'
    };
  }

  async getTrades(chainIndex: string, tokenContractAddress: string, limit = 100): Promise<OKXTradeData[]> {
    return globalRateLimiter.executeRequest(async () => {
      try {
        // Use our proxy API to avoid CORS issues
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
        // Use our proxy API to avoid CORS issues
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
}

export const okxDEXExtended = new OKXDEXExtended();
