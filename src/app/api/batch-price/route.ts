import { NextRequest, NextResponse } from 'next/server';
import { okxDEXService } from '@/lib/okx-dex-api';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both direct array and wrapped object formats
    let tokens;
    if (Array.isArray(body)) {
      // Direct array format: [{"chainIndex":"501","tokenContractAddress":"..."}]
      tokens = body;
    } else if (body.tokens && Array.isArray(body.tokens)) {
      // Wrapped format: {"tokens": [{"chainIndex":"501","tokenContractAddress":"..."}]}
      tokens = body.tokens;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Request must be either an array of tokens or an object with tokens array'
        },
        { status: 400 }
      );
    }

    // Validate tokens array
    if (tokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one token is required'
        },
        { status: 400 }
      );
    }

    // Validate each token request - support both naming conventions
    for (const token of tokens) {
      const chainIndex = token.chainIndex || token.chain;
      const tokenContractAddress = token.tokenContractAddress || token.address;

      if (!chainIndex || !tokenContractAddress) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each token must have either (chainIndex, tokenContractAddress) or (chain, address)'
          },
          { status: 400 }
        );
      }
    }

    // Check batch size limit
    if (tokens.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 20 tokens allowed per batch request'
        },
        { status: 400 }
      );
    }

    console.log(`Processing batch price request for ${tokens.length} tokens`);

    // Normalize token format - convert both naming conventions to expected format
    const normalizedTokens = tokens.map((token: any) => ({
      chainIndex: token.chainIndex || token.chain,
      tokenContractAddress: token.tokenContractAddress || token.address
    }));

    // Use the enhanced batch API
    const result = await okxDEXService.getBatchTokenPrices(normalizedTokens);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        totalRequested: result.totalRequested,
        totalSuccessful: result.totalSuccessful,
        errors: result.errors,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );

  } catch (error) {
    console.error('Batch price API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch batch token prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Support both naming conventions
    const chainIndex = searchParams.get('chainIndex') || searchParams.get('chain');
    const addresses = searchParams.get('addresses') || searchParams.get('tokenContractAddresses');

    if (!chainIndex || !addresses) {
      return NextResponse.json(
        {
          success: false,
          error: 'chainIndex/chain and addresses/tokenContractAddresses parameters are required'
        },
        { status: 400 }
      );
    }

    // Parse comma-separated addresses
    const tokenAddresses = addresses.split(',').map(addr => addr.trim()).filter(Boolean);

    if (tokenAddresses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one valid address is required'
        },
        { status: 400 }
      );
    }

    if (tokenAddresses.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 20 tokens allowed per batch request'
        },
        { status: 400 }
      );
    }

    console.log(`Processing batch price GET request for ${tokenAddresses.length} tokens on chain ${chainIndex}`);

    // Convert to the format expected by getBatchTokenPrices
    const tokens = tokenAddresses.map(address => ({
      chainIndex,
      tokenContractAddress: address
    }));

    const result = await okxDEXService.getBatchTokenPrices(tokens);

    return NextResponse.json(
      {
        success: result.success,
        data: result.data,
        totalRequested: result.totalRequested,
        totalSuccessful: result.totalSuccessful,
        errors: result.errors,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );

  } catch (error) {
    console.error('Batch price GET API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch batch token prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
