// Test for OKX DEX API endpoints
require("dotenv").config();
const crypto = require("crypto");

const config = {
  apiKey: process.env.OKX_API_KEY,
  secretKey: process.env.OKX_SECRET_KEY,
  passphrase: process.env.OKX_API_PASSPHRASE,
  baseUrl: "https://web3.okx.com",
};

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

async function testBatchPriceEndpoint() {
  console.log(
    "=== Testing Official Batch Price Endpoint (Multiple Tokens) ==="
  );
  const requestPath = "/api/v5/dex/market/price-info";

  // Test with multiple popular Solana tokens
  const requests = [
    {
      chainIndex: "501",
      tokenContractAddress: "So11111111111111111111111111111111111111112", // SOL
    },
    {
      chainIndex: "501",
      tokenContractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    },
    {
      chainIndex: "501",
      tokenContractAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
    },
    {
      chainIndex: "501",
      tokenContractAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
    },
    {
      chainIndex: "501",
      tokenContractAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    },
  ];

  const body = JSON.stringify(requests);
  const headers = getHeaders("POST", requestPath, body);

  console.log(`Testing ${requests.length} tokens...`);

  try {
    const response = await fetch(`${config.baseUrl}${requestPath}`, {
      method: "POST",
      headers,
      body,
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();

    if (data.code === "0" && data.data) {
      console.log(`✅ Successfully fetched ${data.data.length} token prices:`);
      data.data.forEach((token, index) => {
        const tokenNames = ["SOL", "USDC", "JUP", "RAY", "BONK"];
        console.log(
          `  ${tokenNames[index] || "Unknown"}: $${token.price} (24h: ${
            token.priceChange24H || "N/A"
          }%)`
        );
      });
    } else {
      console.log("❌ API Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function testComprehensiveBatchRequest() {
  console.log("\n=== Testing Comprehensive Batch Request (20 Tokens) ===");
  const requestPath = "/api/v5/dex/market/price-info";

  // Test with maximum batch size of popular Solana tokens
  const requests = [
    {
      chainIndex: "501",
      tokenContractAddress: "So11111111111111111111111111111111111111112",
    }, // SOL
    {
      chainIndex: "501",
      tokenContractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    }, // USDC
    {
      chainIndex: "501",
      tokenContractAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    }, // USDT
    {
      chainIndex: "501",
      tokenContractAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    }, // JUP
    {
      chainIndex: "501",
      tokenContractAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    }, // RAY
    {
      chainIndex: "501",
      tokenContractAddress: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    }, // ORCA
    {
      chainIndex: "501",
      tokenContractAddress: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    }, // JTO
    {
      chainIndex: "501",
      tokenContractAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    }, // BONK
    {
      chainIndex: "501",
      tokenContractAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    }, // WIF
    {
      chainIndex: "501",
      tokenContractAddress: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    }, // PYTH
    {
      chainIndex: "501",
      tokenContractAddress: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    }, // RND
    {
      chainIndex: "501",
      tokenContractAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    }, // ETH
    {
      chainIndex: "501",
      tokenContractAddress: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    }, // mSOL
    {
      chainIndex: "501",
      tokenContractAddress: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    }, // jitoSOL
    {
      chainIndex: "501",
      tokenContractAddress: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    }, // bSOL
    {
      chainIndex: "501",
      tokenContractAddress: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
    }, // TNSR
    {
      chainIndex: "501",
      tokenContractAddress: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
    }, // HNT
    {
      chainIndex: "501",
      tokenContractAddress: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
    }, // WEN
    {
      chainIndex: "501",
      tokenContractAddress: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    }, // MEW
    {
      chainIndex: "501",
      tokenContractAddress: "A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM",
    }, // USDCet
  ];

  const tokenNames = [
    "SOL",
    "USDC",
    "USDT",
    "JUP",
    "RAY",
    "ORCA",
    "JTO",
    "BONK",
    "WIF",
    "PYTH",
    "RND",
    "ETH",
    "mSOL",
    "jitoSOL",
    "bSOL",
    "TNSR",
    "HNT",
    "WEN",
    "MEW",
    "USDCet",
  ];

  const body = JSON.stringify(requests);
  const headers = getHeaders("POST", requestPath, body);

  console.log(`Testing maximum batch size: ${requests.length} tokens...`);

  try {
    const response = await fetch(`${config.baseUrl}${requestPath}`, {
      method: "POST",
      headers,
      body,
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();

    if (data.code === "0" && data.data) {
      console.log(`✅ Successfully fetched ${data.data.length} token prices:`);

      // Sort data by price (highest first) for better display
      const sortedData = data.data.sort(
        (a, b) => parseFloat(b.price) - parseFloat(a.price)
      );

      sortedData.forEach((token, index) => {
        const tokenIndex = requests.findIndex(
          (req) => req.tokenContractAddress === token.tokenContractAddress
        );
        const tokenName = tokenNames[tokenIndex] || "Unknown";
        const price = parseFloat(token.price);
        const change24h = token.priceChange24H
          ? parseFloat(token.priceChange24H).toFixed(2)
          : "N/A";

        console.log(
          `  ${tokenName.padEnd(8)}: $${price
            .toFixed(price < 1 ? 6 : 2)
            .padStart(10)} (24h: ${change24h}%)`
        );
      });

      // Summary statistics
      const totalValue = sortedData.reduce(
        (sum, token) => sum + parseFloat(token.price),
        0
      );
      console.log(`\n📊 Batch Summary:`);
      console.log(`  Total tokens: ${data.data.length}`);
      console.log(`  Combined value: $${totalValue.toFixed(2)}`);
      console.log(
        `  Highest priced: ${
          tokenNames[
            requests.findIndex(
              (req) =>
                req.tokenContractAddress === sortedData[0].tokenContractAddress
            )
          ]
        } ($${parseFloat(sortedData[0].price).toFixed(2)})`
      );
    } else {
      console.log("❌ API Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting OKX DEX API Tests...\n");

  // Check if API credentials are configured
  if (!config.apiKey || !config.secretKey || !config.passphrase) {
    console.warn("⚠️  Warning: OKX API credentials not fully configured");
    console.log("Some tests may fail without proper authentication\n");
  }

  await testBatchPriceEndpoint();
  await sleep(2000); // Rate limiting delay

  await testComprehensiveBatchRequest();

  console.log("\n✅ All tests completed!");
}

// Helper function for rate limiting
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

runTests();
