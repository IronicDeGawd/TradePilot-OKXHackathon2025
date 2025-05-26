import { client } from '../DexClient';

/**
 * Example: Get supported chains, tokens, and liquidity sources
 */
async function getInfo() {
  try {
    // Get Solana tokens
    console.log('Getting Solana tokens...');
    const tokens = await client.dex.getTokens('501');
    console.log(`Found ${tokens.data.length} tokens on Solana.`);
    console.log('First 5 tokens:');
    console.log(JSON.stringify(tokens.data.slice(0, 5), null, 2));

    // Get liquidity sources
    console.log('\nGetting liquidity sources...');
    const liquidity = await client.dex.getLiquidity('501');
    console.log('Liquidity sources:');
    console.log(JSON.stringify(liquidity, null, 2));

    // Display supported chain information
    console.log('\nSupported chain information:');
    console.log('Chain Index: 501 (Solana)');
    console.log('Network: Solana');

    return { tokens, liquidity };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error getting information:', error.message);
      // API errors include details in the message
      if (error.message.includes('API Error:')) {
        const match = error.message.match(/API Error: (.*)/);
        if (match) console.error('API Error Details:', match[1]);
      }
    }
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  getInfo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { getInfo };
