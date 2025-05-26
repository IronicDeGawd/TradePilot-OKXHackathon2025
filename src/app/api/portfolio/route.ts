import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') || process.env.SOLANA_WALLET_ADDRESS;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'No wallet address provided' },
        { status: 400 }
      );
    }

    const portfolio = await okxService.getPortfolio(walletAddress);

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
