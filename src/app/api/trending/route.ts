import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || '24h';
    
    const trendingTokens = await okxService.getTrendingTokens();
    
    return NextResponse.json(trendingTokens);
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tokens' },
      { status: 500 }
    );
  }
}
