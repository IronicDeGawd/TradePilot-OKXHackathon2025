const axios = require("axios");
const { exec } = require("child_process");

/**
 * Test script for local API endpoints
 * To run this script, ensure your server is running first with:
 * npm run dev (or the appropriate command to start your server)
 */

async function testLocalEndpoints() {
  console.log("=== FINAL BATCH API VERIFICATION ===\n");

  try {
    // Test Trending Multi-Chain API
    console.log("✅ Trending Multi-Chain API:");
    const trendingResponse = await axios.get(
      "http://localhost:3000/api/trending?multiChain=true&limit=3"
    );
    const trendingData = trendingResponse.data;
    console.log(
      `Success: ${trendingData.success}, Count: ${trendingData.data.length}\n`
    );

    // Test Batch Price API
    console.log("✅ Batch Price API:");
    const batchPriceResponse = await axios.post(
      "http://localhost:3000/api/batch-price",
      [
        {
          chainIndex: "501",
          tokenContractAddress: "So11111111111111111111111111111111111111112",
        },
        {
          chainIndex: "501",
          tokenContractAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        },
      ],
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    const batchPriceData = batchPriceResponse.data;
    console.log(
      `Success: ${batchPriceData.success}, Successful: ${batchPriceData.totalSuccessful}\n`
    );

    // Test Arbitrage API
    console.log("✅ Arbitrage API:");
    const arbitrageResponse = await axios.get(
      "http://localhost:3000/api/arbitrage?chains=501&tokens=3"
    );
    const arbitrageData = arbitrageResponse.data;
    console.log(`Success: true, Opportunities: ${arbitrageData.length}\n`);
  } catch (error) {
    console.error("Error testing endpoints:", error.message);
  }
}

testLocalEndpoints();
