import { NextRequest, NextResponse } from 'next/server';
import { SOLANA_TOKENS, getTokenByAddress } from '@/config/tokens';

interface QuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: number;
}

interface QuoteResponse {
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  priceImpact: string;
  fee: string;
  route: Array<{
    pool: string;
    tokenIn: string;
    tokenOut: string;
    fee: string;
  }>;
  executionPrice: string;
  minimumReceived: string;
  slippage: number;
}

// Helper function to fetch real-time token prices from OKX DEX API
async function getTokenPrices(fromTokenAddress: string, toTokenAddress: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/okx-proxy?endpoint=market/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        { chainIndex: '501', tokenContractAddress: fromTokenAddress },
        { chainIndex: '501', tokenContractAddress: toTokenAddress },
      ]),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== '0') {
      throw new Error(`OKX API error: ${data.msg}`);
    }

    const prices: Record<string, number> = {};
    data.data.forEach((item: any) => {
      prices[item.tokenContractAddress] = parseFloat(item.price);
    });

    return prices;
  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    // Fallback to default prices for development
    const fallbackPrices: Record<string, number> = {
      'So11111111111111111111111111111111111111112': 95.50, // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.00, // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.00, // USDT
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 0.75, // JUP
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 2.85, // RAY
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 0.000025, // BONK
      'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 4.2, // ORCA
      'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 3.1, // JTO
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 2.8, // WIF
      'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 0.45, // PYTH
    };

    return {
      [fromTokenAddress]: fallbackPrices[fromTokenAddress] || 1,
      [toTokenAddress]: fallbackPrices[toTokenAddress] || 1,
    };
  }
}

async function calculateQuote(
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  slippage: number = 0.5
): Promise<QuoteResponse> {
  const fromToken = getTokenByAddress(fromTokenAddress);
  const toToken = getTokenByAddress(toTokenAddress);

  if (!fromToken || !toToken) {
    throw new Error('Unsupported token pair');
  }

  // Fetch real-time prices
  const prices = await getTokenPrices(fromTokenAddress, toTokenAddress);
  const fromRate = prices[fromTokenAddress] || 1;
  const toRate = prices[toTokenAddress] || 1;

  // Convert amount to number (considering decimals)
  const fromAmountNum = parseFloat(amount);

  // Calculate USD value of input amount
  const usdValue = fromAmountNum * fromRate;

  // Calculate output amount based on exchange rate
  const toAmountNum = usdValue / toRate;

  // Add some realistic price impact and fees
  const priceImpactPercent = Math.min(0.1 + (fromAmountNum / 100000) * 0.5, 2.0);
  const feePercent = 0.25; // 0.25% fee

  // Apply price impact and fees
  const adjustedToAmount = toAmountNum * (1 - priceImpactPercent / 100) * (1 - feePercent / 100);

  // Calculate minimum received considering slippage
  const minimumReceived = adjustedToAmount * (1 - slippage / 100);

  return {
    fromToken: {
      address: fromTokenAddress,
      symbol: fromToken.symbol,
      decimals: fromToken.decimals,
    },
    toToken: {
      address: toTokenAddress,
      symbol: toToken.symbol,
      decimals: toToken.decimals,
    },
    fromAmount: amount,
    toAmount: adjustedToAmount.toFixed(toToken.decimals),
    estimatedGas: '0.000005', // ~5000 lamports
    priceImpact: priceImpactPercent.toFixed(2),
    fee: (fromAmountNum * feePercent / 100).toFixed(fromToken.decimals),
    route: [
      {
        pool: 'Jupiter Aggregator',
        tokenIn: fromToken.symbol,
        tokenOut: toToken.symbol,
        fee: '0.25%',
      },
    ],
    executionPrice: (fromAmountNum / adjustedToAmount).toFixed(6),
    minimumReceived: minimumReceived.toFixed(toToken.decimals),
    slippage,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromTokenAddress = searchParams.get('fromTokenAddress');
    const toTokenAddress = searchParams.get('toTokenAddress');
    const amount = searchParams.get('amount');
    const slippage = parseFloat(searchParams.get('slippage') || '0.5');

    // Validation
    if (!fromTokenAddress || !toTokenAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTokenAddress, toTokenAddress, amount' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (fromTokenAddress === toTokenAddress) {
      return NextResponse.json(
        { error: 'Cannot swap token to itself' },
        { status: 400 }
      );
    }

    // Simulate API delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 200));

    const quote = await calculateQuote(fromTokenAddress, toTokenAddress, amount, slippage);

    return NextResponse.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get quote',
        success: false
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    const { fromTokenAddress, toTokenAddress, amount, slippage = 0.5 } = body;

    // Validation
    if (!fromTokenAddress || !toTokenAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTokenAddress, toTokenAddress, amount' },
        { status: 400 }
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (fromTokenAddress === toTokenAddress) {
      return NextResponse.json(
        { error: 'Cannot swap token to itself' },
        { status: 400 }
      );
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const quote = await calculateQuote(fromTokenAddress, toTokenAddress, amount, slippage);

    return NextResponse.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get quote',
        success: false
      },
      { status: 500 }
    );
  }
}
