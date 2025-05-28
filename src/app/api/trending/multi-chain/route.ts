import { NextRequest, NextResponse } from 'next/server';
import { trendingService } from '@/lib/trending-service';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainsParam = searchParams.get('chains');
    const limitParam = searchParams.get('limit');

    // Parse chains parameter - defaults to all supported chains
    let chains: string[] = ['1', '56', '501']; // Ethereum, BSC, Solana
    if (chainsParam) {
      chains = chainsParam.split(',').map(c => c.trim()).filter(Boolean);
    }

    // Parse limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit must be between 1 and 50'
        },
        { status: 400 }
      );
    }

    // Validate chain indices
    const validChains = ['1', '56', '501'];
    const invalidChains = chains.filter(chain => !validChains.includes(chain));
    if (invalidChains.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chain indices: ${invalidChains.join(', ')}. Supported chains: ${validChains.join(', ')}`
        },
        { status: 400 }
      );
    }

    console.log(`Processing multi-chain trending request for chains: ${chains.join(', ')}, limit: ${limit}`);

    const result = await trendingService.analyzeTrendingTokensMultiChain(chains);

    if (!result || result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No trending tokens found'
        },
        { status: 404 }
      );
    }

    // Apply limit to results
    const limitedResult = result.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: limitedResult,
        metadata: {
          totalTokens: limitedResult.length,
          totalFound: result.length,
          chainsAnalyzed: chains,
          limit,
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        }
      }
    );

  } catch (error) {
    console.error('Multi-chain trending API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch multi-chain trending tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const { chains = ['1', '56', '501'], limit = 10, options = {} } = body;

    if (!Array.isArray(chains) || chains.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'chains array is required with at least one chain'
        },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit must be between 1 and 50'
        },
        { status: 400 }
      );
    }

    // Validate chain indices
    const validChains = ['1', '56', '501'];
    const invalidChains = chains.filter(chain => !validChains.includes(chain));
    if (invalidChains.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chain indices: ${invalidChains.join(', ')}. Supported chains: ${validChains.join(', ')}`
        },
        { status: 400 }
      );
    }

    console.log(`Processing multi-chain trending POST request for chains: ${chains.join(', ')}, limit: ${limit}`);

    const result = await trendingService.analyzeTrendingTokensMultiChain(chains);

    if (!result || result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No trending tokens found'
        },
        { status: 404 }
      );
    }

    // Apply limit to results
    const limitedResult = result.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: limitedResult,
        metadata: {
          totalTokens: limitedResult.length,
          totalFound: result.length,
          chainsAnalyzed: chains,
          limit,
          options,
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        }
      }
    );

  } catch (error) {
    console.error('Multi-chain trending POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch multi-chain trending tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
