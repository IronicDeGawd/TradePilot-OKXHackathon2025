'use client';

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class SolanaWalletService {
  private connection: Connection;

  constructor() {
    // Use public RPC endpoint for read-only operations
    this.connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
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
