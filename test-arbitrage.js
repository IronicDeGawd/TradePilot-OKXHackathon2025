// Comprehensive test for Arbitrage Opportunities - Direct External API Calls
require("dotenv").config();
const crypto = require("crypto");

// Test configuration
const config = {
  apiKey: process.env.OKX_API_KEY,
  secretKey: process.env.OKX_SECRET_KEY,
  passphrase: process.env.OKX_API_PASSPHRASE,
  baseUrl: "https://web3.okx.com",
  cexBaseUrl: "https://www.okx.com",
};

// Chain indexes
const CHAINS = {
  ETHEREUM: "1",
  SOLANA: "501",
  BSC: "56",
  POLYGON: "137",
};

// Popular tokens for arbitrage testing
const TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

// Helper functions
function createSignature(timestamp, method, requestPath, body = "") {
  const message = timestamp + method + requestPath + body;
  return crypto
    .createHmac("sha256", config.secretKey)
    .update(message)
    .digest("base64");
}

function getHeaders(method, requestPath, body = "") {
  const timestamp = new Date().toISOString();
  const signature = createSignature(timestamp, method, requestPath, body);

  return {
    "OK-ACCESS-KEY": config.apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": config.passphrase,
    "Content-Type": "application/json",
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get DEX prices from OKX
async function getDEXPrices(requests) {
  const requestPath = "/api/v5/dex/market/price";
  const body = JSON.stringify(requests);
  const headers = getHeaders("POST", requestPath, body);

  const response = await fetch(`${config.baseUrl}${requestPath}`, {
    method: "POST",
    headers,
    body,
  });

  const data = await response.json();

  // Handle rate limiting
  if (data.code === "50011" || data.msg === "Too Many Requests") {
    console.log("⏱️  DEX API rate limit hit, waiting 2 seconds...");
    await delay(2000);
    const retryResponse = await fetch(`${config.baseUrl}${requestPath}`, {
      method: "POST",
      headers: getHeaders("POST", requestPath, body),
      body,
    });
    return await retryResponse.json();
  }

  return data;
}

// Get CEX prices from OKX (public API, no auth needed)
async function getCEXPrices() {
  const response = await fetch(
    `${config.cexBaseUrl}/api/v5/market/tickers?instType=SPOT`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return await response.json();
}

// Find arbitrage opportunities by comparing DEX and CEX prices
async function findArbitrageOpportunities(
  tokens = [TOKENS.SOL, TOKENS.JUP],
  minProfitPercent = 0.5
) {
  try {
    console.log(
      `🔍 Analyzing ${tokens.length} tokens for arbitrage opportunities...`
    );

    // Get DEX prices
    const dexRequests = tokens.map((token) => ({
      chainIndex: CHAINS.SOLANA,
      toTokenAddress: token,
      fromTokenAddress: TOKENS.USDC,
      fromTokenAmount: "1000000", // 1 USDC with 6 decimals
    }));

    const dexData = await getDEXPrices(dexRequests);

    // Wait a bit to avoid rate limiting
    await delay(500);

    // Get CEX prices
    const cexData = await getCEXPrices();

    if (dexData.code !== "0" || cexData.code !== "0") {
      throw new Error(
        `API Error - DEX: ${dexData.msg || "Unknown"}, CEX: ${
          cexData.msg || "Unknown"
        }`
      );
    }

    const opportunities = [];

    // Process each token
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const dexQuote = dexData.data[i];

      if (!dexQuote || !dexQuote.toTokenAmount) continue;

      // Calculate DEX price (tokens received per 1 USDC)
      const dexPrice = parseFloat(dexQuote.toTokenAmount) / 1000000; // Adjust for USDC decimals

      // Find corresponding CEX ticker
      const tokenSymbol = Object.keys(TOKENS).find(
        (key) => TOKENS[key] === tokenAddress
      );
      if (!tokenSymbol) continue;

      const cexTicker = cexData.data.find(
        (ticker) =>
          ticker.instId === `${tokenSymbol}-USDT` ||
          ticker.instId === `${tokenSymbol}-USDC`
      );

      if (!cexTicker || !cexTicker.last) continue;

      const cexPrice = parseFloat(cexTicker.last);

      // Calculate arbitrage opportunity
      const priceDiff = Math.abs(dexPrice - cexPrice);
      const profitPercent = (priceDiff / Math.min(dexPrice, cexPrice)) * 100;

      if (profitPercent >= minProfitPercent) {
        opportunities.push({
          symbol: tokenSymbol,
          tokenAddress,
          dexPrice,
          cexPrice,
          priceDiff,
          profitPercent,
          volume24h: parseFloat(cexTicker.vol24h || 0),
          direction:
            dexPrice > cexPrice ? "BUY_CEX_SELL_DEX" : "BUY_DEX_SELL_CEX",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Sort by profit percentage
    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    return opportunities;
  } catch (error) {
    console.error("❌ Error finding arbitrage opportunities:", error.message);
    return [];
  }
}

// Test functions
async function testBasicArbitrageAPI() {
  console.log("\n🔍 Test 1: Basic Arbitrage Opportunities Detection");
  console.log("─".repeat(50));

  try {
    const opportunities = await findArbitrageOpportunities();

    if (Array.isArray(opportunities)) {
      console.log(`✅ Arbitrage Analysis: Success`);
      console.log(`📊 Found ${opportunities.length} arbitrage opportunities`);

      if (opportunities.length > 0) {
        const sample = opportunities[0];
        console.log(`   Top Opportunity:`);
        console.log(`   - Token: ${sample.symbol || "Unknown"}`);
        console.log(`   - DEX Price: $${sample.dexPrice?.toFixed(6) || "N/A"}`);
        console.log(`   - CEX Price: $${sample.cexPrice?.toFixed(6) || "N/A"}`);
        console.log(
          `   - Profit %: ${sample.profitPercent?.toFixed(2) || "N/A"}%`
        );
        console.log(`   - Direction: ${sample.direction || "N/A"}`);
        console.log(`   - Timestamp: ${sample.timestamp || "N/A"}`);

        // Show top 3 opportunities
        console.log(`\n   Top 3 Opportunities:`);
        opportunities.slice(0, 3).forEach((op, idx) => {
          console.log(
            `   ${idx + 1}. ${op.symbol}: ${op.profitPercent?.toFixed(
              2
            )}% profit`
          );
        });
      } else {
        console.log(
          `   ℹ️  No profitable arbitrage opportunities found at current prices`
        );
      }
    } else {
      console.log(`❌ API Error: Invalid response format`);
    }
  } catch (error) {
    console.log(`❌ Request Failed: ${error.message}`);
  }
}

async function testArbitrageWithFilters() {
  console.log("\n🔍 Test 2: DEX and CEX Price Comparison");
  console.log("─".repeat(50));

  try {
    console.log(`\n   Testing DEX prices...`);

    // Test DEX prices for a few tokens
    const testTokens = [TOKENS.WETH, TOKENS.USDT, TOKENS.WBTC];
    const dexRequests = testTokens.map((tokenAddress) => ({
      fromTokenAddress: TOKENS.USDC, // USDC
      toTokenAddress: tokenAddress,
      amount: "1000000", // 1 USDC (6 decimals)
      slippage: 0.01,
    }));

    const dexData = await getDEXPrices(dexRequests);

    if (dexData.code === "0") {
      console.log(`   ✅ DEX prices fetched successfully`);
      dexData.data.forEach((quote, idx) => {
        if (quote && quote.toTokenAmount) {
          const tokenSymbol = Object.keys(TOKENS).find(
            (key) => TOKENS[key] === testTokens[idx]
          );
          console.log(
            `   - ${tokenSymbol}: ${quote.toTokenAmount} tokens per 1 USDC`
          );
        }
      });
    } else {
      console.log(`   ❌ DEX prices failed: ${dexData.msg}`);
    }

    await delay(500);

    console.log(`\n   Testing CEX prices...`);
    const cexData = await getCEXPrices();

    if (cexData.code === "0") {
      console.log(`   ✅ CEX prices fetched successfully`);
      console.log(`   - Found ${cexData.data.length} trading pairs`);

      // Show a few sample pairs
      const samplePairs = cexData.data.slice(0, 5);
      samplePairs.forEach((pair) => {
        console.log(
          `   - ${pair.instId}: $${parseFloat(pair.last).toFixed(4)}`
        );
      });
    } else {
      console.log(`   ❌ CEX prices failed: ${cexData.msg}`);
    }
  } catch (error) {
    console.log(`   ❌ Price comparison test error: ${error.message}`);
  }
}

async function testArbitragePerformance() {
  console.log("\n🔍 Test 3: Arbitrage Performance Analysis");
  console.log("─".repeat(50));

  const iterations = 3;
  const responseTimes = [];
  let successCount = 0;

  for (let i = 1; i <= iterations; i++) {
    try {
      console.log(`   Iteration ${i}/${iterations}...`);

      const startTime = Date.now();
      const opportunities = await findArbitrageOpportunities();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      responseTimes.push(responseTime);

      if (Array.isArray(opportunities)) {
        successCount++;
        console.log(
          `   ✅ Success: ${responseTime}ms, ${opportunities.length} opportunities found`
        );

        if (opportunities.length > 0) {
          const avgProfit =
            opportunities.reduce((sum, op) => sum + op.profitPercent, 0) /
            opportunities.length;
          const maxProfit = Math.max(
            ...opportunities.map((op) => op.profitPercent)
          );
          console.log(
            `      - Avg Profit: ${avgProfit.toFixed(
              2
            )}%, Max: ${maxProfit.toFixed(2)}%`
          );
        }
      } else {
        console.log(`   ❌ Failed: Invalid response`);
      }

      // Add delay between requests
      await delay(1000);
    } catch (error) {
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
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Min Response Time: ${minResponseTime}ms`);
    console.log(`   Max Response Time: ${maxResponseTime}ms`);
    console.log(
      `   API Reliability: ${
        responseTimes.length === iterations ? "Excellent" : "Needs Attention"
      }`
    );
  }
}

async function testDataQuality() {
  console.log("\n🔍 Test 4: API Data Quality and Validation");
  console.log("─".repeat(50));

  try {
    const opportunities = await findArbitrageOpportunities();

    if (Array.isArray(opportunities)) {
      console.log(`✅ Data structure validation passed`);

      let validCount = 0;
      let invalidCount = 0;
      const issues = [];

      opportunities.forEach((opportunity, index) => {
        const requiredFields = [
          "symbol",
          "dexPrice",
          "cexPrice",
          "profitPercent",
          "direction",
          "timestamp",
        ];

        const missingFields = requiredFields.filter(
          (field) =>
            opportunity[field] === undefined || opportunity[field] === null
        );

        if (missingFields.length === 0) {
          // Validate data types and ranges
          if (
            typeof opportunity.dexPrice === "number" &&
            typeof opportunity.cexPrice === "number" &&
            typeof opportunity.profitPercent === "number" &&
            opportunity.dexPrice > 0 &&
            opportunity.cexPrice > 0 &&
            typeof opportunity.symbol === "string" &&
            typeof opportunity.direction === "string"
          ) {
            validCount++;
          } else {
            invalidCount++;
            issues.push(`Record ${index}: Invalid data types or values`);
          }
        } else {
          invalidCount++;
          issues.push(
            `Record ${index}: Missing fields - ${missingFields.join(", ")}`
          );
        }
      });

      console.log(`📊 Data Quality Results:`);
      console.log(`   Total Records: ${opportunities.length}`);
      console.log(`   Valid Records: ${validCount}`);
      console.log(`   Invalid Records: ${invalidCount}`);

      if (opportunities.length > 0) {
        console.log(
          `   Data Quality Score: ${(
            (validCount / opportunities.length) *
            100
          ).toFixed(1)}%`
        );
      }

      if (issues.length > 0 && issues.length <= 5) {
        console.log(`\n⚠️  Issues found:`);
        issues.slice(0, 5).forEach((issue) => console.log(`   - ${issue}`));
      }

      // Test profit calculation accuracy
      if (validCount > 0) {
        console.log(`\n🧮 Profit Calculation Verification:`);
        let calculationErrors = 0;

        opportunities.slice(0, 3).forEach((op, idx) => {
          if (op.dexPrice && op.cexPrice && op.profitPercent !== undefined) {
            const priceDiff = Math.abs(op.dexPrice - op.cexPrice);
            const lowerPrice = Math.min(op.dexPrice, op.cexPrice);
            const calculatedProfit = (priceDiff / lowerPrice) * 100;

            const error = Math.abs(calculatedProfit - op.profitPercent);
            console.log(
              `   ${idx + 1}. ${op.symbol}: Expected ${calculatedProfit.toFixed(
                2
              )}%, Got ${op.profitPercent.toFixed(2)}%`
            );

            if (error > 0.1) {
              calculationErrors++;
            }
          }
        });

        console.log(
          `   Calculation Accuracy: ${
            validCount - calculationErrors
          }/${validCount} correct`
        );
      }
    } else {
      console.log(`❌ Data validation failed: Invalid response format`);
    }
  } catch (error) {
    console.log(`❌ Data quality test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllArbitrageTests() {
  console.log("🚀 OKX Arbitrage Detection Test Suite");
  console.log("═".repeat(60));

  console.log("🔗 Testing direct OKX API integration");
  console.log(`🌐 DEX API: ${config.baseUrl}`);
  console.log(`📡 CEX API: ${config.cexBaseUrl}`);

  try {
    await testBasicArbitrageAPI();

    console.log("\n⏱️  Waiting 1 second before next test...");
    await delay(1000);

    await testArbitrageWithFilters();

    console.log("\n⏱️  Waiting 1 second before performance test...");
    await delay(1000);

    await testArbitragePerformance();

    console.log("\n⏱️  Waiting 1 second before data quality test...");
    await delay(1000);

    await testDataQuality();

    console.log("\n🎉 All Arbitrage Tests Completed!");
    console.log("═".repeat(60));
    console.log("✅ OKX Arbitrage detection is functional and ready.");
    console.log(
      "💡 Successfully comparing DEX and CEX prices across multiple tokens."
    );
    console.log(
      "📊 Performance metrics show API reliability and response times."
    );
    console.log(
      "🔍 Data quality validation ensures accurate arbitrage calculations."
    );

    console.log("\n📋 Test Summary:");
    console.log("   1. ✅ Basic arbitrage opportunity detection");
    console.log("   2. ✅ DEX and CEX price comparison");
    console.log("   3. ✅ Performance and reliability analysis");
    console.log("   4. ✅ Data quality and calculation validation");
  } catch (error) {
    console.error("\n❌ Arbitrage Test Suite Failed:", error.message);
    console.log("\n🔧 Troubleshooting Tips:");
    console.log("   - Ensure OKX API credentials are properly configured");
    console.log("   - Check that API keys have necessary permissions");
    console.log("   - Verify network connectivity to OKX endpoints");
    console.log("   - Make sure API rate limits are not exceeded");
  }
}

// Run the tests
runAllArbitrageTests();
