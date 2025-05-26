import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const minProfit = parseFloat(searchParams.get('minProfit') || '0.5');
    
    const opportunities = await okxService.getArbitrageOpportunities();
    
    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Arbitrage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch arbitrage opportunities' },
      { status: 500 }
    );
  }
}
