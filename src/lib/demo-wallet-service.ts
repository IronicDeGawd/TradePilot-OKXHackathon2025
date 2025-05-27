import demoWalletData from '../data/demo-wallet.json';

export interface DemoToken {
  symbol: string;
  mint: string;
  amount: number;
  decimals: number;
  price: number;
  change24h?: number;
}

export interface DemoWallet {
  address: string;
  balance: number;
  tokens: DemoToken[];
}

export class DemoWalletService {
  generateDemoWallet(): DemoWallet {
    // Return static demo wallet data from JSON file instead of generating random data
    return demoWalletData as DemoWallet;
  }
}

export const demoWalletService = new DemoWalletService();
