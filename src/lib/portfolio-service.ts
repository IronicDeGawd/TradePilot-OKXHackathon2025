// Portfolio service using OKX Balance APIs
import crypto from 'crypto';

export interface TokenBalance {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  isRiskToken: boolean;
  address: string;
}

class PortfolioService {
  private config = {
    apiKey: process.env.OKX_API_KEY || '',
    secretKey: process.env.OKX_SECRET_KEY || '',
    passphrase: process.env.OKX_API_PASSPHRASE || '',
    baseUrl: 'https://web3.okx.com'
  };

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

  async getTotalValue(address: string, chains?: string): Promise<{ totalValue: string }> {
    try {
      // Use our proxy API to avoid CORS issues
      const baseUrl = process.env.NODE_ENV === 'development' ? '' : '';
      let proxyUrl = `${baseUrl}/api/okx-proxy?endpoint=balance/total-value&address=${address}`;
      if (chains) proxyUrl += `&chains=${chains}`;

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      return data.code === '0' && data.data?.length > 0
        ? { totalValue: data.data[0].totalValue }
        : { totalValue: '0' };
    } catch (error) {
      console.error('Error fetching total value:', error);
      return { totalValue: '0' };
    }
  }

  async getAllTokenBalances(address: string, chains: string[]): Promise<TokenBalance[]> {
    try {
      const chainString = chains.join(',');
      // Use our proxy API to avoid CORS issues
      const baseUrl = process.env.NODE_ENV === 'development' ? '' : '';
      const proxyUrl = `${baseUrl}/api/okx-proxy?endpoint=balance/all-token-balances-by-address&address=${address}&chains=${chainString}`;

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      return data.code === '0' && data.data?.length > 0
        ? data.data[0].tokenAssets || []
        : [];
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  }
}

export const portfolioService = new PortfolioService();
