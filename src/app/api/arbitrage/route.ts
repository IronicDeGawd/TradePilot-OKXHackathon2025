import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';

export const revalidate = 0; // Disable Next.js cache for this route

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const minProfit = parseFloat(searchParams.get('minProfit') || '0.5');

    const opportunities = await okxService.getArbitrageOpportunities();

    // Set cache-control headers to prevent browser caching
    return NextResponse.json(opportunities, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Arbitrage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch arbitrage opportunities' },
      { status: 500 }
    );
  }
}
