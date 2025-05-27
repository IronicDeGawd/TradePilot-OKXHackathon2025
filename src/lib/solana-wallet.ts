'use client';

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class SolanaWalletService {
  private connection: Connection;
  private demoTokens: any[] = [];

  constructor() {
    // Use public RPC endpoint for read-only operations
    this.connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  generateDemoWallet(): { address: string; balance: number; tokens: any[] } {
    // Generate demo tokens with random values
    const tokens = [
      {
        symbol: "SOL",
        mint: "So11111111111111111111111111111111111111112",
        amount: Math.random() * 10 + 1,
        decimals: 9,
        price: 180
      },
      {
        symbol: "USDC",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: Math.random() * 1000 + 100,
        decimals: 6,
        price: 1
      },
      {
        symbol: "RAY",
        mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        amount: Math.random() * 500 + 50,
        decimals: 6,
        price: 0.5
      },
      {
        symbol: "SRM",
        mint: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
        amount: Math.random() * 200 + 20,
        decimals: 6,
        price: 0.3
      },
    ];

    this.demoTokens = tokens;

    return {
      address: "Demo1234...5678",
      balance: tokens[0].amount, // SOL balance
      tokens
    };
  }

  getDemoTokens() {
    return this.demoTokens;
  }

  async connectPhantomWallet(): Promise<{ address: string; balance: number } | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).solana) {
        const phantom = (window as any).solana;

        if (phantom.isPhantom) {
          const response = await phantom.connect();
          const balance = await this.getBalance(response.publicKey.toString());

          return {
            address: response.publicKey.toString(),
            balance
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
      return null;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  async getTokenAccounts(address: string) {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        }
      );

      return tokenAccounts.value.map(account => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }));
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      return [];
    }
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}

export const solanaWallet = new SolanaWalletService();
