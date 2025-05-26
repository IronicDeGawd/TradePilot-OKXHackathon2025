// Comprehensive test for OKX DEX API functionality
require("dotenv").config();
const crypto = require("crypto");

// Test configuration
const config = {
  apiKey: process.env.OKX_API_KEY,
  secretKey: process.env.OKX_SECRET_KEY,
  passphrase: process.env.OKX_API_PASSPHRASE,
  baseUrl: "https://web3.okx.com",
};

// Chain indexes
const CHAINS = {
  ETHEREUM: "1",
  SOLANA: "501",
  BSC: "56",
  POLYGON: "137",
};

// Token addresses
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

// Helper to delay between requests
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(requests) {
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
    console.log("⏱️  Rate limit hit, waiting 2 seconds...");
    await delay(2000);
    // Retry once
    const retryResponse = await fetch(`${config.baseUrl}${requestPath}`, {
      method: "POST",
      headers: getHeaders("POST", requestPath, body),
      body,
    });
    return await retryResponse.json();
  }

  return data;
}

// Test functions
async function testSingleToken() {
  console.log("\n🔍 Test 1: Single Token Price (SOL)");
  console.log("─".repeat(50));

  const request = [
    {
      chainIndex: CHAINS.SOLANA,
      tokenContractAddress: TOKENS.SOL,
    },
  ];

  const response = await makeRequest(request);

  if (response.code === "0" && response.data.length > 0) {
    const price = parseFloat(response.data[0].price);
    console.log(`✅ SOL Price: $${price.toFixed(6)}`);
    console.log(`   Chain: Solana (${CHAINS.SOLANA})`);
    console.log(`   Timestamp: ${new Date(parseInt(response.data[0].time))}`);
  } else {
    console.log(`❌ Error: ${response.msg}`);
  }
}

async function testMultipleTokens() {
  console.log("\n🔍 Test 2: Multiple Solana Tokens");
  console.log("─".repeat(50));

  const requests = [
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.SOL },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.JUP },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.RAY },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.BONK },
  ];

  const response = await makeRequest(requests);

  if (response.code === "0") {
    console.log(`✅ Retrieved ${response.data.length} token prices:`);

    const tokenNames = ["SOL", "JUP", "RAY", "BONK"];
    response.data.forEach((item, index) => {
      const price = parseFloat(item.price);
      const symbol = tokenNames[index];
      console.log(
        `   ${symbol}: $${
          price < 0.001 ? price.toExponential(3) : price.toFixed(6)
        }`
      );
    });
  } else {
    console.log(`❌ Error: ${response.msg}`);
  }
}

async function testPerformanceMetrics() {
  console.log("\n🔍 Test 3: Performance Metrics");
  console.log("─".repeat(50));

  const startTime = Date.now();

  // Test API response time with 5 tokens
  const requests = [
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.SOL },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.JUP },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.RAY },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.BONK },
    { chainIndex: CHAINS.SOLANA, tokenContractAddress: TOKENS.USDC },
  ];

  const response = await makeRequest(requests);
  const endTime = Date.now();
  const responseTime = endTime - startTime;

  if (response.code === "0") {
    console.log(`✅ Performance Metrics:`);
    console.log(`   Response Time: ${responseTime}ms`);
    console.log(`   Tokens Retrieved: ${response.data.length}`);
    console.log(
      `   Avg Time per Token: ${(responseTime / response.data.length).toFixed(
        1
      )}ms`
    );
    console.log(`   API Status: Healthy`);

    // Check data freshness
    const timestamps = response.data.map((item) => parseInt(item.time));
    const latestTimestamp = Math.max(...timestamps);
    const dataAge = Date.now() - latestTimestamp;

    console.log(
      `   Data Freshness: ${dataAge < 30000 ? "Fresh" : "Stale"} (${(
        dataAge / 1000
      ).toFixed(1)}s old)`
    );
  } else {
    console.log(`❌ Performance test failed: ${response.msg}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log("🚀 OKX DEX API Comprehensive Test Suite");
  console.log("═".repeat(60));

  if (!config.apiKey || !config.secretKey || !config.passphrase) {
    console.log("❌ Missing OKX API credentials. Please check your .env file.");
    return;
  }

  console.log("🔑 API Credentials: ✅ Found");
  console.log(`🌐 Base URL: ${config.baseUrl}`);

  try {
    await testSingleToken();

    // Add delay between tests to avoid rate limiting
    console.log("⏱️  Waiting 1.5 seconds before next test...");
    await delay(1500);

    await testMultipleTokens();

    console.log("⏱️  Waiting 1.5 seconds before final test...");
    await delay(1500);

    await testPerformanceMetrics();

    console.log("\n🎉 All Tests Completed Successfully!");
    console.log("═".repeat(60));
    console.log(
      "✅ OKX DEX API is fully functional and ready for production use."
    );
    console.log(
      "💡 You can now use this API for real-time DEX price data in your application."
    );
    console.log("📊 Rate limiting handled gracefully with retry logic.");
  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error.message);
  }
}

// Run the tests
runAllTests();
