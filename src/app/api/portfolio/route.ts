import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';
import { demoWalletService } from '@/lib/demo-wallet-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') || process.env.SOLANA_WALLET_ADDRESS;
    const isDemo = searchParams.get('demo') === 'true';

    if (!walletAddress && !isDemo) {
      return NextResponse.json(
        { error: 'No wallet address provided' },
        { status: 400 }
      );
    }

    let portfolio;

    if (isDemo || walletAddress === 'Demo1234...5678') {
      // Generate demo portfolio data
      const demoWallet = demoWalletService.generateDemoWallet();
      const totalValue = demoWallet.tokens.reduce((sum: number, token: any) =>
        sum + (token.amount * token.price), 0
      );

      portfolio = {
        walletAddress: 'Demo1234...5678',
        totalValue,
        tokens: demoWallet.tokens.map((token: any) => ({
          symbol: token.symbol,
          mint: token.mint,
          balance: token.amount,
          amount: token.amount.toString(),
          decimals: token.decimals,
          usdValue: token.amount * token.price,
          price: token.price,
          change24h: (Math.random() - 0.5) * 20 // Random percentage between -10% and +10%
        })),
        lastUpdated: new Date().toISOString(),
        isDemo: true
      };
    } else {
      // Only fetch real portfolio data for non-demo wallets
      portfolio = await okxService.getPortfolio(walletAddress);
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
