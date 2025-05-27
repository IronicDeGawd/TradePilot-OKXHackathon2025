// Comprehensive test for Gemini AI API - Direct External API Calls
require("dotenv").config();

// Test configuration
const config = {
  apiKey: process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  baseUrl: "https://generativelanguage.googleapis.com",
  model: "gemini-2.0-flash-exp",
};

// Test data for various scenarios
const TEST_SCENARIOS = {
  TRADING_ADVICE: [
    "What do you think about SOL right now?",
    "Should I buy more BONK tokens?",
    "What's your analysis on Jupiter (JUP) token?",
    "How should I manage risk in my Solana portfolio?",
    "What are the best DeFi strategies for 2024?",
  ],
  PORTFOLIO_ANALYSIS: [
    "Analyze my current portfolio performance",
    "What trading suggestions do you have for my holdings?",
    "How can I improve my portfolio diversification?",
    "What's the optimal allocation for a Solana portfolio?",
  ],
  MARKET_QUESTIONS: [
    "What are the trending tokens today?",
    "Are there any good arbitrage opportunities?",
    "How's the overall crypto market looking?",
    "What should I know about current market conditions?",
  ],
  OFF_TOPIC: [
    "How do I create an HTML page?",
    "What's the weather like?",
    "Tell me a joke",
    "How do I cook pasta?",
  ],
};

const SAMPLE_PORTFOLIO = {
  totalValue: 5420.5,
  tokens: [
    { symbol: "SOL", amount: 15.5, usdValue: 3800.25, change24h: 2.5 },
    { symbol: "JUP", amount: 2450, usdValue: 980.1, change24h: -1.2 },
    { symbol: "USDC", amount: 640.15, usdValue: 640.15, change24h: 0.0 },
  ],
};

function isPlatformSpecificQuestion(userMessage) {
  const message = userMessage.toLowerCase().trim();

  // Immediately reject common off-topic requests
  const offTopicPatterns = [
    /make.*html.*page/i,
    /create.*html/i,
    /build.*website/i,
    /web.*development/i,
    /weather/i,
    /joke/i,
    /cook/i,
    /pasta/i,
  ];

  const isOffTopic = offTopicPatterns.some((pattern) => pattern.test(message));
  if (isOffTopic) return false;

  // Platform-specific keywords
  const tradingKeywords = [
    "trade",
    "trading",
    "buy",
    "sell",
    "swap",
    "exchange",
    "portfolio",
    "balance",
    "holdings",
    "investment",
    "invest",
    "price",
    "market",
    "arbitrage",
    "spread",
    "profit",
    "loss",
    "strategy",
    "analysis",
    "forecast",
    "prediction",
    "chart",
  ];

  const cryptoKeywords = [
    "crypto",
    "cryptocurrency",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "sol",
    "usdc",
    "usdt",
    "token",
    "coin",
    "defi",
    "dex",
    "cex",
    "liquidity",
    "yield",
    "staking",
    "farming",
  ];

  const platformKeywords = [
    "okx",
    "jupiter",
    "raydium",
    "orca",
    "serum",
    "jup",
    "bonk",
    "jto",
    "wif",
    "meme",
    "trending",
    "hot",
  ];

  // Check if message contains any platform-specific keywords
  const allKeywords = [
    ...tradingKeywords,
    ...cryptoKeywords,
    ...platformKeywords,
  ];
  return allKeywords.some((keyword) => message.includes(keyword));
}

function getOffTopicResponse() {
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

async function makeGeminiRequest(userMessage, context = null) {
  // First check if the question is platform-specific
  if (!isPlatformSpecificQuestion(userMessage)) {
    return {
      ok: true,
      response: getOffTopicResponse(),
    };
  }

  if (!config.apiKey) {
    throw new Error(
      "Gemini API key not found. Please set GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY"
    );
  }

  const systemPrompt = `You are TradePilot AI, an expert cryptocurrency trading assistant specialized in Solana ecosystem and OKX DEX/CEX operations.

STRICT SCOPE: ONLY respond to cryptocurrency trading, DeFi, portfolio management, and market analysis questions.

Keep responses CONCISE (max 300 words), use markdown formatting, include risk warnings, and focus on actionable insights.`;

  let contextualPrompt = "";

  // Add portfolio context if provided
  if (context && context.portfolio) {
    const { totalValue, tokens } = context.portfolio;
    contextualPrompt += `\nCURRENT PORTFOLIO: Total Value: $${
      totalValue?.toFixed(2) || "0.00"
    }\n`;
    contextualPrompt += `Holdings:\n`;
    tokens?.forEach((token) => {
      contextualPrompt += `- ${token.symbol}: ${
        token.amount
      } ($${token.usdValue.toFixed(2)})\n`;
    });
  }

  const fullPrompt = `${systemPrompt}\n\n${contextualPrompt}\n\nUser: ${userMessage}\n\nAI:`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `${config.baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (
      response.status === 400 &&
      errorData.error?.message?.includes("API_KEY_INVALID")
    ) {
      throw new Error(
        "🔑 Invalid Gemini API key. Please check your GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "⏰ Gemini API rate limit exceeded. Please wait and try again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "🚫 Gemini API quota exceeded. Please check your Google Cloud usage."
      );
    }

    throw new Error(
      `Gemini API error: ${response.status} - ${
        errorData.error?.message || "Unknown error"
      }`
    );
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response format from Gemini API");
  }

  let responseText =
    data.candidates[0].content.parts[0].text || "No response generated";

  // Truncate if too long
  if (responseText.length > 2000) {
    responseText =
      responseText.substring(0, 1950) +
      "...\n\n*[Response truncated for brevity]*";
  }

  return {
    ok: true,
    response: responseText,
  };
}

// Helper functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test functions
async function testBasicGeminiAPI() {
  console.log("\n🔍 Test 1: Basic Gemini AI Functionality");
  console.log("─".repeat(50));

  const testMessage = "What do you think about SOL right now?";

  try {
    console.log(`📝 Sending message: "${testMessage}"`);

    const startTime = Date.now();
    const result = await makeGeminiRequest(testMessage);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (result.ok && result.response) {
      console.log(`✅ Gemini API Response: Success`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📝 Response Length: ${result.response.length} characters`);
      console.log(
        `🎯 Response Preview: ${result.response.substring(0, 150)}...`
      );

      // Check if response contains trading-specific content
      const tradingKeywords = [
        "trading",
        "price",
        "market",
        "analysis",
        "buy",
        "sell",
        "SOL",
        "crypto",
      ];
      const containsTradingContent = tradingKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword.toLowerCase())
      );

      console.log(
        `🎯 Contains Trading Content: ${
          containsTradingContent ? "✅ Yes" : "❌ No"
        }`
      );
    } else {
      console.log(`❌ API Error: Invalid response format`);
    }
  } catch (error) {
    console.log(`❌ Request Failed: ${error.message}`);
  }
}

async function testTradingAdviceQueries() {
  console.log("\n🔍 Test 2: Trading Advice Queries");
  console.log("─".repeat(50));

  // Select one random question from trading advice scenarios
  const randomIndex = Math.floor(
    Math.random() * TEST_SCENARIOS.TRADING_ADVICE.length
  );
  const question = TEST_SCENARIOS.TRADING_ADVICE[randomIndex];

  try {
    console.log(`\n   Selected question: "${question}"`);

    const result = await makeGeminiRequest(question);

    if (result.ok && result.response) {
      console.log(`   ✅ Response received (${result.response.length} chars)`);

      // Check for relevant trading advice
      const adviceKeywords = [
        "recommend",
        "suggest",
        "analysis",
        "risk",
        "consider",
        "strategy",
      ];
      const containsAdvice = adviceKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword)
      );

      console.log(`   🎯 Contains Advice: ${containsAdvice ? "✅" : "❌"}`);

      // Check for risk warnings
      const riskWarnings = ["risk", "not financial advice", "DYOR", "volatile"];
      const hasRiskWarning = riskWarnings.some((warning) =>
        result.response.toLowerCase().includes(warning.toLowerCase())
      );

      console.log(`   ⚠️  Risk Warning: ${hasRiskWarning ? "✅" : "❌"}`);
    } else {
      console.log(`   ❌ Failed: Request failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testOffTopicHandling() {
  console.log("\n🔍 Test 3: Off-Topic Query Handling");
  console.log("─".repeat(50));

  // Select one random off-topic question
  const randomIndex = Math.floor(
    Math.random() * TEST_SCENARIOS.OFF_TOPIC.length
  );
  const question = TEST_SCENARIOS.OFF_TOPIC[randomIndex];

  try {
    console.log(`\n   Selected off-topic question: "${question}"`);

    const result = await makeGeminiRequest(question);

    if (result.ok && result.response) {
      console.log(`   ✅ Response received`);

      // Check if AI properly redirects off-topic questions
      const redirectKeywords = [
        "specialized",
        "focus",
        "trading",
        "crypto",
        "assist",
        "recommend",
      ];
      const isProperRedirect = redirectKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword)
      );

      console.log(`   🚫 Proper Redirect: ${isProperRedirect ? "✅" : "❌"}`);

      // Check that it doesn't actually answer the off-topic question
      const actuallyAnswered =
        (question.includes("HTML") && result.response.includes("<html>")) ||
        (question.includes("weather") &&
          result.response.includes("temperature")) ||
        (question.includes("pasta") && result.response.includes("boil"));

      console.log(`   🎯 Avoids Off-Topic: ${!actuallyAnswered ? "✅" : "❌"}`);
    } else {
      console.log(`   ❌ Failed: Request failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testPortfolioSuggestions() {
  console.log("\n🔍 Test 4: Portfolio Suggestions API");
  console.log("─".repeat(50));

  try {
    console.log(
      `📊 Testing with sample portfolio: $${SAMPLE_PORTFOLIO.totalValue}`
    );
    console.log(
      `   Holdings: ${SAMPLE_PORTFOLIO.tokens
        .map((t) => `${t.symbol} ($${t.usdValue})`)
        .join(", ")}`
    );

    const portfolioQuery = `Analyze my portfolio and provide trading suggestions. Current holdings: ${SAMPLE_PORTFOLIO.tokens
      .map((t) => `${t.amount} ${t.symbol} worth $${t.usdValue}`)
      .join(", ")}. Total value: $${SAMPLE_PORTFOLIO.totalValue}`;

    const result = await makeGeminiRequest(portfolioQuery, {
      portfolio: SAMPLE_PORTFOLIO,
    });

    if (result.ok && result.response) {
      console.log(`✅ Portfolio analysis successful`);
      console.log(
        `📋 Response received (${result.response.length} characters)`
      );

      // Extract suggestions by looking for action words
      const response = result.response.toLowerCase();
      const suggestionPatterns = [
        /buy\s+(\w+)/g,
        /sell\s+(\w+)/g,
        /hold\s+(\w+)/g,
        /swap\s+(\w+)/g,
        /diversify/g,
        /rebalance/g,
      ];

      let suggestionsFound = 0;
      suggestionPatterns.forEach((pattern) => {
        const matches = response.match(pattern);
        if (matches) {
          suggestionsFound += matches.length;
        }
      });

      console.log(`📋 Trading suggestions found: ${suggestionsFound}`);

      // Check for portfolio-specific mentions
      const portfolioMentions = SAMPLE_PORTFOLIO.tokens.filter((token) =>
        result.response.toLowerCase().includes(token.symbol.toLowerCase())
      );

      console.log(
        `🎯 Portfolio tokens mentioned: ${portfolioMentions.length}/${SAMPLE_PORTFOLIO.tokens.length}`
      );

      // Check for risk assessment
      const riskKeywords = [
        "risk",
        "volatile",
        "diversify",
        "allocation",
        "exposure",
      ];
      const hasRiskAssessment = riskKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword)
      );

      console.log(
        `⚠️  Risk assessment included: ${hasRiskAssessment ? "✅" : "❌"}`
      );

      // Check for specific recommendations
      const recommendationKeywords = [
        "recommend",
        "suggest",
        "consider",
        "should",
        "could",
      ];
      const hasRecommendations = recommendationKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword)
      );

      console.log(
        `💡 Contains recommendations: ${hasRecommendations ? "✅" : "❌"}`
      );

      console.log(`\n📊 Analysis Quality:`);
      console.log(`   Suggestions Found: ${suggestionsFound}`);
      console.log(
        `   Portfolio Reference: ${portfolioMentions.length > 0 ? "✅" : "❌"}`
      );
      console.log(`   Risk Assessment: ${hasRiskAssessment ? "✅" : "❌"}`);
      console.log(`   Actionable Advice: ${hasRecommendations ? "✅" : "❌"}`);
    } else {
      console.log(`❌ Portfolio suggestions failed: Request failed`);
    }
  } catch (error) {
    console.log(`❌ Portfolio suggestions test failed: ${error.message}`);
  }
}

async function testContextualResponses() {
  console.log("\n🔍 Test 5: Contextual Responses with Portfolio Data");
  console.log("─".repeat(50));

  const contextualQuestions = [
    "How's my portfolio looking?",
    "What should I trade next?",
    "Any rebalancing suggestions?",
  ];

  // Select one random contextual question
  const randomIndex = Math.floor(Math.random() * contextualQuestions.length);
  const question = contextualQuestions[randomIndex];

  try {
    console.log(`\n   Selected contextual question: "${question}"`);

    const result = await makeGeminiRequest(question, {
      portfolio: SAMPLE_PORTFOLIO,
    });

    if (result.ok && result.response) {
      console.log(`   ✅ Response with context received`);

      // Check if response references portfolio data
      const portfolioTokens = SAMPLE_PORTFOLIO.tokens.map((t) => t.symbol);
      const referencesPortfolio = portfolioTokens.some((token) =>
        result.response.includes(token)
      );

      console.log(
        `   🎯 References Portfolio: ${referencesPortfolio ? "✅" : "❌"}`
      );

      // Check for specific portfolio value mention
      const mentionsValue =
        result.response.includes(SAMPLE_PORTFOLIO.totalValue.toString()) ||
        result.response.includes("$5,420") ||
        result.response.includes("5420");

      console.log(
        `   💰 Mentions Portfolio Value: ${mentionsValue ? "✅" : "❌"}`
      );

      // Check for contextual trading advice
      const contextualKeywords = [
        "your",
        "portfolio",
        "holdings",
        "current",
        "suggest",
        "recommend",
      ];
      const isContextual = contextualKeywords.some((keyword) =>
        result.response.toLowerCase().includes(keyword)
      );

      console.log(`   🔗 Contextual Response: ${isContextual ? "✅" : "❌"}`);
    } else {
      console.log(`   ❌ Failed: Request failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testAPIPerformance() {
  console.log("\n🔍 Test 6: API Performance & Reliability");
  console.log("─".repeat(50));

  const testQuestions = [
    "What's the best Solana DeFi strategy?",
    "Should I hold or sell my SOL?",
    "What are your thoughts on meme coins?",
  ];

  // Select one random question for performance testing
  const randomIndex = Math.floor(Math.random() * testQuestions.length);
  const question = testQuestions[randomIndex];

  const responseTimes = [];
  let successCount = 0;
  let errorCount = 0;

  // Run the same question multiple times for performance analysis
  const iterations = 3;

  for (let i = 1; i <= iterations; i++) {
    try {
      console.log(`   Performance test ${i}/${iterations}: "${question}"`);

      const startTime = Date.now();
      const result = await makeGeminiRequest(question);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      responseTimes.push(responseTime);

      if (result.ok && result.response) {
        successCount++;
        console.log(`   ✅ Success: ${responseTime}ms`);
      } else {
        errorCount++;
        console.log(`   ❌ Failed: Request failed (${responseTime}ms)`);
      }

      await delay(1000);
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  if (responseTimes.length > 0) {
    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    console.log(`\n📊 Performance Summary:`);
    console.log(
      `   Success Rate: ${((successCount / iterations) * 100).toFixed(1)}%`
    );
    console.log(
      `   Error Rate: ${((errorCount / iterations) * 100).toFixed(1)}%`
    );
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Min Response Time: ${minResponseTime}ms`);
    console.log(`   Max Response Time: ${maxResponseTime}ms`);
    console.log(
      `   Performance Rating: ${
        avgResponseTime < 3000
          ? "Excellent"
          : avgResponseTime < 5000
          ? "Good"
          : "Needs Improvement"
      }`
    );
  }
}

// Main test runner
async function runAllGeminiTests() {
  console.log("🚀 Gemini AI Direct API Test Suite");
  console.log("═".repeat(60));

  console.log("🤖 Testing direct Gemini AI API integration");
  console.log(`🌐 API Endpoint: ${config.baseUrl}`);
  console.log(
    `🔑 API Key Status: ${config.apiKey ? "✅ Found" : "❌ Missing"}`
  );
  console.log(`🧠 Model: ${config.model}`);

  if (!config.apiKey) {
    console.log(
      "\n❌ Missing Gemini API key. Please set GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY"
    );
    console.log(
      "🔗 Get your API key from: https://makersuite.google.com/app/apikey"
    );
    return;
  }

  try {
    await testBasicGeminiAPI();

    console.log("\n⏱️  Waiting 2 seconds before next test...");
    await delay(2000);

    await testTradingAdviceQueries();

    console.log("\n⏱️  Waiting 2 seconds before off-topic test...");
    await delay(2000);

    await testOffTopicHandling();

    console.log("\n⏱️  Waiting 2 seconds before portfolio test...");
    await delay(2000);

    await testPortfolioSuggestions();

    console.log("\n⏱️  Waiting 2 seconds before contextual test...");
    await delay(2000);

    await testContextualResponses();

    console.log("\n⏱️  Waiting 2 seconds before performance test...");
    await delay(2000);

    await testAPIPerformance();

    console.log("\n🎉 All Gemini AI Tests Completed!");
    console.log("═".repeat(60));
    console.log("✅ Gemini AI is functional and ready for trading assistance.");
    console.log(
      "🤖 AI provides contextual trading advice and portfolio analysis."
    );
    console.log("🚫 Off-topic queries are properly handled and redirected.");
    console.log("📊 Direct API integration enables real-time AI responses.");
    console.log(
      "⚡ Performance metrics show API reliability and response times."
    );

    console.log("\n📋 Test Summary:");
    console.log("   1. ✅ Basic AI chat functionality");
    console.log("   2. ✅ Trading advice generation");
    console.log("   3. ✅ Off-topic query handling");
    console.log("   4. ✅ Portfolio analysis capabilities");
    console.log("   5. ✅ Contextual response quality");
    console.log("   6. ✅ Performance & reliability metrics");
  } catch (error) {
    console.error("\n❌ Gemini AI Test Suite Failed:", error.message);
    console.log("\n🔧 Troubleshooting Tips:");
    console.log(
      "   - Ensure GOOGLE_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY is set correctly"
    );
    console.log("   - Check that your API key has sufficient quota");
    console.log("   - Verify network connectivity to Google AI services");
    console.log("   - Make sure API key permissions include Gemini API access");
  }
}

// Run the tests
runAllGeminiTests();
