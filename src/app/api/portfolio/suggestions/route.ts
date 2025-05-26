import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { portfolio } = await request.json();

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio data is required' },
        { status: 400 }
      );
    }

    // Generate AI-powered portfolio suggestions
    const suggestions = await geminiService.generatePortfolioSuggestions(portfolio);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating portfolio suggestions:', error);

    // Return fallback suggestions on error
    const fallbackSuggestions = [
      {
        action: "hold",
        toToken: "SOL",
        reason: "Continue holding SOL with DCA strategy during market fluctuations.",
        confidence: 85,
        riskLevel: "medium"
      },
      {
        action: "buy",
        toToken: "USDC",
        reason: "Consider increasing stablecoin allocation to 20-25% for portfolio stability.",
        confidence: 78,
        riskLevel: "low"
      }
    ];

    return NextResponse.json(fallbackSuggestions);
  }
}
