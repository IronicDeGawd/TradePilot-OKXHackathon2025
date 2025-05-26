import { GoogleGenAI } from '@google/genai';
import type { ChatMessage } from '@/types';

class GeminiAIService {
  private ai: GoogleGenAI | null = null;
  private apiKeyStatus: 'unknown' | 'valid' | 'invalid' | 'missing' = 'unknown';

  constructor() {
    // Initialize Gemini AI service
    const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      this.apiKeyStatus = 'missing';
    }
  }

  // Method to test API key validity
  async validateApiKey(): Promise<boolean> {
    if (!this.ai) {
      this.apiKeyStatus = 'missing';
      return false;
    }

    try {
      // Test with a simple prompt
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Test'
      });
      this.apiKeyStatus = 'valid';
      return true;
    } catch (error: any) {
      if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key not valid')) {
        this.apiKeyStatus = 'invalid';
      }
      return false;
    }
  }

  getApiKeyStatus(): string {
    return this.apiKeyStatus;
  }

  // Validate if the question is platform-specific and relevant
  private isPlatformSpecificQuestion(userMessage: string): boolean {
    const message = userMessage.toLowerCase().trim();

    // Immediately reject common off-topic requests
    const offTopicPatterns = [
      /make.*html.*page/i,
      /create.*html/i,
      /build.*website/i,
      /web.*development/i,
      /javascript.*tutorial/i,
      /css.*styling/i,
      /react.*component/i,
      /node\.js/i,
      /python.*script/i,
      /sql.*query/i,
      /database/i,
      /hello.*world/i,
      /how.*are.*you/i,
      /what.*is.*your.*name/i
    ];

    const isOffTopic = offTopicPatterns.some(pattern => pattern.test(message));
    if (isOffTopic) return false;

    // Platform-specific keywords
    const tradingKeywords = [
      'trade', 'trading', 'buy', 'sell', 'swap', 'exchange',
      'portfolio', 'balance', 'holdings', 'investment', 'invest',
      'price', 'market', 'arbitrage', 'spread', 'profit', 'loss',
      'strategy', 'analysis', 'forecast', 'prediction', 'chart',
      'technical analysis', 'fundamental analysis'
    ];

    const cryptoKeywords = [
      'crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth',
      'solana', 'sol', 'usdc', 'usdt', 'token', 'coin', 'defi',
      'dex', 'cex', 'liquidity', 'yield', 'staking', 'farming',
      'blockchain', 'wallet', 'address', 'transaction', 'hash'
    ];

    const platformKeywords = [
      'okx', 'jupiter', 'raydium', 'orca', 'serum', 'jup',
      'bonk', 'jto', 'wif', 'meme', 'trending', 'hot',
      'dca', 'dollar cost averaging', 'pump', 'dump', 'moon'
    ];

    const riskKeywords = [
      'risk', 'stop loss', 'take profit', 'leverage', 'margin',
      'volatility', 'slippage', 'gas', 'fee', 'commission',
      'liquidation', 'position size', 'risk management'
    ];

    // Check if message contains any platform-specific keywords
    const allKeywords = [...tradingKeywords, ...cryptoKeywords, ...platformKeywords, ...riskKeywords];
    const hasRelevantKeywords = allKeywords.some(keyword => message.includes(keyword));

    // Additional checks for common trading phrases
    const tradingPhrases = [
      'how much should i', 'should i buy', 'should i sell',
      'what do you think about', 'price target', 'market analysis',
      'trading advice', 'investment advice', 'portfolio review',
      'risk management', 'profit taking', 'entry point', 'exit strategy',
      'when to buy', 'when to sell', 'market sentiment', 'bull market',
      'bear market', 'crypto market', 'defi protocol', 'yield farming'
    ];

    const hasRelevantPhrases = tradingPhrases.some(phrase => message.includes(phrase));

    // For very short messages, be more strict
    if (message.length < 10) {
      return hasRelevantKeywords;
    }

    return hasRelevantKeywords || hasRelevantPhrases;
  }

  // Generate a polite redirect message for off-topic questions
  private getOffTopicResponse(): string {
    return `🤖 **I'm TradePilot AI** - your specialized cryptocurrency trading assistant!

I'm designed to help with:
• **Portfolio Analysis** - Review your crypto holdings and performance
• **Trading Strategies** - Solana ecosystem and OKX platform insights
• **Market Opportunities** - Arbitrage, trending tokens, and DeFi plays
• **Risk Management** - Position sizing and stop-loss recommendations

**Please ask me about:**
- Cryptocurrency trading and analysis
- Solana ecosystem (SOL, Jupiter, Raydium, etc.)
- OKX DEX/CEX opportunities
- Portfolio optimization and risk management
- DeFi strategies and trending tokens

For general questions outside of crypto trading, I'd recommend using a general-purpose AI assistant. Let's focus on maximizing your trading potential! 📈`;
  }

  async getChatResponse(userMessage: string, context?: any): Promise<string> {
    // First check if the question is platform-specific
    if (!this.isPlatformSpecificQuestion(userMessage)) {
      return this.getOffTopicResponse();
    }

    if (!this.ai) {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Gemini API key not found. Expected GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY');
        return 'AI service is not available. Please configure your Gemini API key in your environment variables.';
      }
      console.error('Gemini AI service failed to initialize despite having API key');
      return 'AI service initialization failed. Please check your configuration.';
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const contextualPrompt = this.addContextualInformation(userMessage, context);
      const fullPrompt = `${systemPrompt}\n\n${contextualPrompt}\n\nUser: ${userMessage}\n\nAI: Provide a concise, well-structured response using markdown formatting. Use headers, bullet points, and bold text for clarity. Keep it under 300 words and focus on actionable insights:`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: fullPrompt
      });

      let responseText = response.text || 'No response generated';

      // Post-process response to ensure it's well-formatted
      responseText = this.formatResponse(responseText);

      // Truncate if too long (roughly 300 words = ~2000 characters)
      if (responseText.length > 2000) {
        responseText = this.truncateResponse(responseText, 2000);
      }

      return responseText;
    } catch (error: any) {
      console.error('Gemini AI Error:', error);

      // Handle specific API key errors
      if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key not valid')) {
        return `🔑 **API Key Error**: Your Gemini API key is invalid or expired.

Please:
1. Get a valid API key from Google AI Studio (https://makersuite.google.com/app/apikey)
2. Set it in your environment variables as GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY
3. Restart your development server

Current key status: ${process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Present but invalid' : 'Not found'}`;
      }

      // Handle quota exceeded errors
      if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        return `⚠️ **API Quota Exceeded**: You've reached your Gemini API usage limit. Please check your Google Cloud console or wait for the quota to reset.`;
      }

      // Handle network/connectivity errors
      if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
        return `🌐 **Connection Error**: Unable to reach Gemini API. Please check your internet connection and try again.`;
      }

      return `❌ **AI Service Error**: I'm having trouble processing your request. Please try again later or check your API configuration.

Error details: ${error?.message || 'Unknown error'}`;
    }
  }

  private formatResponse(response: string): string {
    // Clean up and format the response
    let formatted = response.trim();

    // Ensure proper spacing around headers
    formatted = formatted.replace(/^(#{1,3})\s*(.+)$/gm, '$1 $2\n');

    // Ensure proper spacing around lists
    formatted = formatted.replace(/^(\s*[-*+])\s*(.+)$/gm, '$1 $2');
    formatted = formatted.replace(/^(\s*\d+\.)\s*(.+)$/gm, '$1 $2');

    // Clean up excessive newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Ensure bold text is properly formatted
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '**$1**');

    return formatted;
  }

  private truncateResponse(response: string, maxLength: number): string {
    if (response.length <= maxLength) {
      return response;
    }

    // Try to truncate at a natural break point (paragraph or sentence)
    const truncated = response.substring(0, maxLength);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    const lastSentence = truncated.lastIndexOf('. ');

    let cutPoint = maxLength;
    if (lastParagraph > maxLength * 0.7) {
      cutPoint = lastParagraph;
    } else if (lastSentence > maxLength * 0.7) {
      cutPoint = lastSentence + 1;
    }

    return truncated.substring(0, cutPoint).trim() + '\n\n*[Response truncated for readability]*';
  }

  private addContextualInformation(userMessage: string, context?: any): string {
    if (!context) return '';

    let contextInfo = '';

    // Add portfolio context
    if (context.portfolio) {
      const { totalValue, tokens } = context.portfolio;
      contextInfo += `\nCURRENT PORTFOLIO:\n`;
      contextInfo += `Total Value: $${totalValue?.toFixed(2) || '0.00'}\n`;
      contextInfo += `Holdings:\n`;
      tokens?.forEach((token: any) => {
        const amount = token.amount || 0;
        const usdValue = token.usdValue || 0;
        const change24h = token.change24h || 0;
        contextInfo += `- ${token.symbol || 'Unknown'}: ${amount} ($${usdValue.toFixed(2)}, ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)\n`;
      });
    }

    // Add market context for specific queries
    if (userMessage.toLowerCase().includes('arbitrage') || userMessage.toLowerCase().includes('spread')) {
      contextInfo += `\nMARKET CONDITIONS:\n`;
      contextInfo += `- SOL: High volume arbitrage opportunity (~0.85% spread)\n`;
      contextInfo += `- BONK: Strong arbitrage potential (~4.44% spread)\n`;
      contextInfo += `- Market volatility: Moderate\n`;
    }

    if (userMessage.toLowerCase().includes('trending') || userMessage.toLowerCase().includes('hot')) {
      contextInfo += `\nTRENDING TOKENS:\n`;
      contextInfo += `- JTO: +24.5% (Trend Score: 95) - Strong social momentum\n`;
      contextInfo += `- WIF: +12.8% (Trend Score: 92) - High volume spike\n`;
      contextInfo += `- BONK: +18.2% (Trend Score: 87) - Meme momentum\n`;
    }

    return contextInfo;
  }

  private buildSystemPrompt(context?: any): string {
    return `
You are TradePilot AI, an expert cryptocurrency trading assistant specialized in Solana ecosystem and OKX DEX/CEX operations.

STRICT SCOPE LIMITATIONS:
- ONLY respond to cryptocurrency trading, DeFi, portfolio management, and market analysis questions
- NEVER answer general programming, HTML, web development, or non-crypto related questions
- If asked about anything outside crypto/trading, politely redirect to your specialized expertise

CORE CAPABILITIES:
- Portfolio analysis and risk assessment
- Real-time arbitrage opportunity identification
- Trending token analysis with social sentiment
- Trading strategy recommendations
- Market condition interpretation

TRADING EXPERTISE:
- Solana DeFi protocols (Jupiter, Raydium, Orca, Serum)
- OKX DEX/CEX price spread analysis
- Meme coin momentum trading
- Risk management strategies
- DCA (Dollar Cost Averaging) optimization

RESPONSE FORMATTING RULES:
1. Keep responses CONCISE and well-structured (max 300 words)
2. Use clear bullet points and numbered lists
3. Use markdown formatting for better readability
4. Highlight key information with **bold** text
5. Use emojis sparingly for visual appeal
6. Break down complex information into digestible sections
7. Prioritize the most important information first

RESPONSE GUIDELINES:
1. Always provide specific, actionable advice
2. Include risk warnings for every suggestion (keep them brief)
3. Reference current market data when available
4. Explain reasoning behind recommendations
5. Suggest position sizing (never more than 5-10% for high-risk plays)
6. Include gas/slippage considerations
7. Mention relevant Solana protocols for execution

RISK WARNINGS (keep brief):
- ⚠️ High risk - only invest what you can afford to lose
- 📊 Not financial advice - DYOR
- 🌊 Market volatility and liquidity risks apply

TONE: Professional yet approachable, confident but cautious, data-driven

CURRENT FOCUS: Solana ecosystem, OKX trading pairs, arbitrage opportunities, trending meme coins
    `;
  }

  async getTradingSuggestions(portfolio: any): Promise<string[]> {
    const suggestions = [
      "Consider DCA into SOL during market dips",
      "Monitor BONK for potential meme coin momentum",
      "Check JTO arbitrage opportunities on OKX",
      "Rebalance portfolio if any single asset exceeds 40%",
      "Set stop-losses for volatile positions"
    ];

    // Add portfolio-specific suggestions
    if (portfolio?.tokens) {
      const solBalance = portfolio.tokens.find((t: any) => t.symbol === 'SOL');
      const usdcBalance = portfolio.tokens.find((t: any) => t.symbol === 'USDC');

      if (solBalance && (solBalance.usdValue / portfolio.totalValue) > 0.7) {
        suggestions.unshift("High SOL concentration - consider diversifying into USDC or other Solana tokens");
      }

      if (!usdcBalance || (usdcBalance.usdValue / portfolio.totalValue) < 0.2) {
        suggestions.unshift("Consider increasing stablecoin allocation to 20-30% for risk management");
      }
    }

    return suggestions.slice(0, 5);
  }

  async generatePortfolioSuggestions(portfolioData: any): Promise<any[]> {
    if (!this.ai) {
      console.error('Gemini AI service not available');
      return [];
    }

    try {
      const prompt = this.buildPortfolioAnalysisPrompt(portfolioData);

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      const responseText = response.text || '';

      // Parse the AI response into structured suggestions
      return this.parseTradingSuggestions(responseText, portfolioData);
    } catch (error) {
      console.error('Error generating AI portfolio suggestions:', error);
      return this.getFallbackSuggestions(portfolioData);
    }
  }

  private buildPortfolioAnalysisPrompt(portfolioData: any): string {
    const { totalValue, tokens } = portfolioData;

    let portfolioText = `PORTFOLIO ANALYSIS REQUEST\n\n`;
    portfolioText += `Total Portfolio Value: $${totalValue?.toFixed(2) || '0.00'}\n\n`;
    portfolioText += `Current Holdings:\n`;

    tokens?.forEach((token: any) => {
      const allocation = totalValue > 0 ? ((token.usdValue / totalValue) * 100).toFixed(1) : '0.0';
      portfolioText += `- ${token.symbol}: ${token.amount} tokens ($${token.usdValue?.toFixed(2) || '0.00'}, ${allocation}% allocation, ${token.change24h >= 0 ? '+' : ''}${token.change24h?.toFixed(2) || '0.00'}% 24h)\n`;
    });

    return `${portfolioText}

TASK: Analyze this Solana portfolio and provide 3-4 specific trading suggestions. For each suggestion, provide:
1. Action (buy/sell/hold/swap)
2. Token(s) involved
3. Clear reasoning (max 50 words)
4. Confidence level (0-100)
5. Risk level (low/medium/high)

FORMAT your response as JSON array like this:
[
  {
    "action": "buy",
    "toToken": "USDC",
    "reason": "Increase stablecoin allocation to 25% for risk management during volatile periods.",
    "confidence": 85,
    "riskLevel": "low"
  }
]

Focus on:
- Portfolio balance and diversification
- Risk management
- Current Solana ecosystem opportunities
- Position sizing recommendations

Provide actionable, specific advice only. No disclaimers or general market commentary.`;
  }

  private parseTradingSuggestions(responseText: string, portfolioData: any): any[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.slice(0, 4); // Max 4 suggestions
      }
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
    }

    // Fallback: parse manually if JSON parsing fails
    return this.getFallbackSuggestions(portfolioData);
  }

  private getFallbackSuggestions(portfolioData: any): any[] {
    const { totalValue, tokens } = portfolioData;
    const suggestions: any[] = [];

    // Analyze portfolio composition
    const solAllocation = tokens?.find((t: any) => t.symbol === 'SOL');
    const usdcAllocation = tokens?.find((t: any) => t.symbol === 'USDC');
    const solPercentage = solAllocation ? (solAllocation.usdValue / totalValue) * 100 : 0;
    const usdcPercentage = usdcAllocation ? (usdcAllocation.usdValue / totalValue) * 100 : 0;

    // High SOL concentration
    if (solPercentage > 70) {
      suggestions.push({
        action: "swap",
        fromToken: "SOL",
        toToken: "USDC",
        reason: "High SOL concentration detected. Consider diversifying 20-30% into stablecoins for risk management.",
        confidence: 88,
        riskLevel: "low"
      });
    }

    // Low stablecoin allocation
    if (usdcPercentage < 20) {
      suggestions.push({
        action: "buy",
        toToken: "USDC",
        reason: "Increase stablecoin allocation to 20-25% to provide stability during market volatility.",
        confidence: 82,
        riskLevel: "low"
      });
    }

    // DeFi opportunity
    suggestions.push({
      action: "swap",
      fromToken: "SOL",
      toToken: "JUP",
      reason: "Jupiter showing strong fundamentals with growing DEX volume. Consider 5-10% allocation.",
      confidence: 75,
      riskLevel: "medium"
    });

    // Hold SOL recommendation
    if (solPercentage > 0 && solPercentage < 60) {
      suggestions.push({
        action: "hold",
        toToken: "SOL",
        reason: "Solana ecosystem remains strong. Continue DCA strategy during market dips.",
        confidence: 90,
        riskLevel: "medium"
      });
    }

    return suggestions.slice(0, 3);
  }
}

export const geminiService = new GeminiAIService();
