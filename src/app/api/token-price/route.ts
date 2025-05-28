import { NextRequest, NextResponse } from 'next/server';
import { okxDEXService } from '@/lib/okx-dex-api';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIndex = searchParams.get('chainIndex');
    const tokenAddress = searchParams.get('tokenAddress');

    if (!chainIndex || !tokenAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'chainIndex and tokenAddress parameters are required'
        },
        { status: 400 }
      );
    }

    // Get single token price
    const price = await okxDEXService.getTokenPrice(chainIndex, tokenAddress);

    if (price === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price not available for the specified token'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        price,
        chainIndex,
        tokenAddress,
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
    console.error('Token price API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch token price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Enhanced batch request support
    if (body.tokens && Array.isArray(body.tokens)) {
      // Validate batch request size
      if (body.tokens.length > 20) {
        return NextResponse.json(
          {
            success: false,
            error: 'Maximum 20 tokens allowed per batch request. Use /api/batch-price for larger batches.'
          },
          { status: 400 }
        );
      }

      // Validate each token in the batch
      for (let i = 0; i < body.tokens.length; i++) {
        const token = body.tokens[i];
        if (!token.chainIndex || !token.tokenContractAddress) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid token data at index ${i}: chainIndex and tokenContractAddress are required`
            },
            { status: 400 }
          );
        }
      }

      console.log(`Processing batch request for ${body.tokens.length} tokens`);
      const result = await okxDEXService.getBatchTokenPrices(body.tokens);

      return NextResponse.json({
        success: result.success,
        data: result.data,
        totalRequested: result.totalRequested,
        totalSuccessful: result.totalSuccessful,
        errors: result.errors,
        timestamp: new Date().toISOString(),
        batchProcessed: true
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    // Enhanced single token request support
    const { chainIndex, tokenAddress, tokenContractAddress } = body;

    // Support both tokenAddress and tokenContractAddress for backwards compatibility
    const address = tokenAddress || tokenContractAddress;

    if (!chainIndex || !address) {
      return NextResponse.json(
        {
          success: false,
          error: 'chainIndex and tokenAddress (or tokenContractAddress) are required'
        },
        { status: 400 }
      );
    }

    console.log(`Fetching single token price: ${address} on chain ${chainIndex}`);
    const price = await okxDEXService.getTokenPrice(chainIndex, address);

    if (price === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price not available for the specified token'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        price,
        chainIndex,
        tokenAddress: address,
        timestamp: new Date().toISOString(),
        batchProcessed: false
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
    console.error('Token price POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch token price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
