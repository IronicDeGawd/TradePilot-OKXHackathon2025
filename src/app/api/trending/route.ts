import { NextRequest, NextResponse } from 'next/server';
import { okxService } from '@/lib/okx';
import { trendingService } from '@/lib/trending-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const timeframe = searchParams.get('timeframe') || '24h';
    const chains = searchParams.get('chains');
    const multiChain = searchParams.get('multiChain') === 'true';

    let trendingTokens;

    if (multiChain) {
      // Use multi-chain analysis
      const chainIndices = chains ? chains.split(',').map(c => c.trim()) : ['501', '1', '56'];
      console.log(`Fetching multi-chain trending tokens for chains: ${chainIndices.join(', ')}`);
      trendingTokens = await trendingService.analyzeTrendingTokensMultiChain(chainIndices);
    } else {
      // Single chain (backward compatibility)
      const chainIndex = searchParams.get('chainIndex') || '501';
      console.log(`Fetching trending tokens for single chain: ${chainIndex}`);
      trendingTokens = await trendingService.analyzeTrendingTokens(chainIndex);
    }

    // Apply limit
    const limitedTokens = trendingTokens.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedTokens,
      totalFound: trendingTokens.length,
      limit,
      multiChain,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trending tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
