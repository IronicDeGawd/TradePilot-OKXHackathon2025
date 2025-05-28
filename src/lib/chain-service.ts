// Chain Management Service for React
import { okxDEXExtended } from './okx-dex-extended';
import { shouldSkipApiCall, isBrowser } from './environment';
import type { ChainData, ExtendedTokenData, TokenPriceData } from '../types';

class ChainService {
  private supportedChains: ChainData[] = [];
  private selectedChain: ChainData | null = null;
  private tokensForSelectedChain: ExtendedTokenData[] = [];
  private tokenPrices: Record<string, TokenPriceData> = {};
  private isLoading: boolean = false;
  private error: string | null = null;
  private listeners: Set<() => void> = new Set();

  private readonly SUPPORTED_CHAIN_INDICES = ['1', '56', '501']; // Ethereum, BSC, and Solana

  constructor() {
    // Only auto-initialize in browser or during development
    // Skip during build time to prevent API calls to non-existent server
    if (isBrowser()) {
      // Delay initialization to avoid blocking during static generation
      setTimeout(() => {
        this.initializeChains().catch(console.error);
      }, 100);
    }
  }

  // Event listener management
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Getters
  getSupportedChains(): ChainData[] {
    return [...this.supportedChains];
  }

  getSelectedChain(): ChainData | null {
    return this.selectedChain;
  }

  getTokensForSelectedChain(): ExtendedTokenData[] {
    return [...this.tokensForSelectedChain];
  }

  getTokenPrices(): Record<string, TokenPriceData> {
    return { ...this.tokenPrices };
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getError(): string | null {
    return this.error;
  }

  isInitialized(): boolean {
    return this.supportedChains.length > 0 && this.selectedChain !== null;
  }

  async initializeChains(): Promise<void> {
    // Skip initialization during build time
    if (shouldSkipApiCall('chain initialization')) {
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;
      this.notify();

      console.log('Initializing chain service...');

      // Fetch all supported chains
      const allChains = await okxDEXExtended.getSupportedChains();

      // Filter to only supported chains for now
      const filteredChains = allChains.filter(chain =>
        this.SUPPORTED_CHAIN_INDICES.includes(chain.chainIndex)
      );

      if (filteredChains.length === 0) {
        throw new Error('No supported chains found');
      }

      this.supportedChains = filteredChains;

      // Set Solana as default if available, otherwise Ethereum, otherwise first available
      const defaultChain = filteredChains.find(chain => chain.chainIndex === '501') ||
                          filteredChains.find(chain => chain.chainIndex === '1') ||
                          filteredChains[0];

      console.log(`Setting default chain to: ${defaultChain.name} (${defaultChain.chainIndex})`);

      // Select the default chain (this will trigger token and price fetching)
      await this.selectChain(defaultChain.chainIndex);

    } catch (error) {
      console.error('Error initializing chains:', error);
      this.error = error instanceof Error ? error.message : 'Failed to initialize chains';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async selectChain(chainIndex: string): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;
      this.notify();

      // Find the chain in supported chains
      const chain = this.supportedChains.find(c => c.chainIndex === chainIndex);
      if (!chain) {
        throw new Error(`Chain with index ${chainIndex} not found in supported chains`);
      }

      console.log(`Selecting chain: ${chain.name} (${chainIndex})`);

      // Update selected chain
      this.selectedChain = chain;

      // Clear previous chain data
      this.tokensForSelectedChain = [];
      this.tokenPrices = {};
      this.notify();

      // Fetch tokens for this chain
      console.log(`Fetching tokens for chain ${chainIndex}...`);
      const tokens = await okxDEXExtended.getAllTokens(chainIndex);

      if (tokens.length === 0) {
        console.warn(`No tokens found for chain ${chainIndex}`);
        this.tokensForSelectedChain = [];
        this.notify();
        return;
      }

      console.log(`Found ${tokens.length} tokens for chain ${chainIndex}`);
      this.tokensForSelectedChain = tokens;
      this.notify();

      // Fetch batch prices for tokens (use smaller batches to avoid API limits)
      const tokenAddresses = tokens.slice(0, 30).map(token => token.address); // Reduced from 50 to 30

      if (tokenAddresses.length > 0) {
        console.log(`Fetching prices for ${tokenAddresses.length} tokens...`);
        try {
          const prices = await okxDEXExtended.getBatchTokenPrices(chainIndex, tokenAddresses);

          // Convert array to record keyed by token address
          const priceRecord: Record<string, TokenPriceData> = {};
          prices.forEach(price => {
            priceRecord[price.address] = price;
          });

          console.log(`Received prices for ${prices.length} tokens (${Math.round((prices.length / tokenAddresses.length) * 100)}% success rate)`);
          this.tokenPrices = priceRecord;
          this.notify();

          // If we got significantly fewer prices than expected, try a smaller batch
          if (prices.length < tokenAddresses.length * 0.5 && tokenAddresses.length > 10) {
            console.warn(`Low success rate (${prices.length}/${tokenAddresses.length}), trying smaller batch...`);
            const smallerBatch = tokenAddresses.slice(0, 10);
            try {
              const retryPrices = await okxDEXExtended.getBatchTokenPrices(chainIndex, smallerBatch);
              retryPrices.forEach(price => {
                priceRecord[price.address] = price;
              });
              console.log(`Retry batch: received ${retryPrices.length} additional prices`);
              this.tokenPrices = priceRecord;
              this.notify();
            } catch (retryError) {
              console.error('Retry batch also failed:', retryError);
            }
          }
        } catch (priceError) {
          console.error('Error fetching token prices:', priceError);
          // Don't fail the entire chain selection if price fetching fails
          // Just proceed without prices
          this.tokenPrices = {};
          this.notify();
        }
      }

    } catch (error) {
      console.error(`Error selecting chain ${chainIndex}:`, error);
      this.error = error instanceof Error ? error.message : `Failed to select chain ${chainIndex}`;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async refreshPricesForCurrentChain(): Promise<void> {
    if (!this.selectedChain) {
      console.warn('No current chain selected for price refresh');
      return;
    }

    if (this.tokensForSelectedChain.length === 0) {
      console.warn('No tokens available for price refresh');
      return;
    }

    try {
      this.isLoading = true;
      this.notify();

      console.log(`Refreshing prices for ${this.tokensForSelectedChain.length} tokens on ${this.selectedChain.name}...`);

      // Fetch fresh prices for current tokens (limit to first 50)
      const tokenAddresses = this.tokensForSelectedChain.slice(0, 50).map(token => token.address);
      const prices = await okxDEXExtended.getBatchTokenPrices(this.selectedChain.chainIndex, tokenAddresses);

      // Convert array to record keyed by token address
      const priceRecord: Record<string, TokenPriceData> = {};
      prices.forEach(price => {
        priceRecord[price.address] = price;
      });

      console.log(`Refreshed prices for ${prices.length} tokens`);
      this.tokenPrices = priceRecord;

    } catch (error) {
      console.error('Error refreshing prices:', error);
      this.error = error instanceof Error ? error.message : 'Failed to refresh prices';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  // Utility methods
  getTokenPrice(tokenAddress: string): TokenPriceData | null {
    return this.tokenPrices[tokenAddress] || null;
  }

  getTokenInfo(tokenAddress: string): ExtendedTokenData | null {
    return this.tokensForSelectedChain.find(t => t.address === tokenAddress) || null;
  }

  // Multi-chain batch operations
  async getMultiChainTokenPrices(tokenRequests: Array<{
    chainIndex: string;
    tokenContractAddress: string;
    symbol?: string;
  }>): Promise<{
    success: boolean;
    data: Array<{
      symbol?: string;
      chainIndex: string;
      tokenContractAddress: string;
      price: number | null;
      error?: string;
    }>;
    totalRequested: number;
    totalSuccessful: number;
    errors: string[];
  }> {
    console.log(`Fetching prices for ${tokenRequests.length} tokens across multiple chains`);

    try {
      // Group requests by chain to optimize batch requests
      const requestsByChain = new Map<string, Array<{
        chainIndex: string;
        tokenContractAddress: string;
        symbol?: string;
      }>>();

      tokenRequests.forEach(req => {
        if (!requestsByChain.has(req.chainIndex)) {
          requestsByChain.set(req.chainIndex, []);
        }
        requestsByChain.get(req.chainIndex)!.push(req);
      });

      const allResults: Array<{
        symbol?: string;
        chainIndex: string;
        tokenContractAddress: string;
        price: number | null;
        error?: string;
      }> = [];

      let totalSuccessful = 0;
      const errors: string[] = [];

      // Process each chain's requests in parallel
      const chainPromises = Array.from(requestsByChain.entries()).map(async ([chainIndex, requests]) => {
        try {
          console.log(`Processing ${requests.length} tokens for chain ${chainIndex}`);

          const tokenAddresses = requests.map(req => req.tokenContractAddress);
          const prices = await okxDEXExtended.getBatchTokenPrices(chainIndex, tokenAddresses);

          // Create a price lookup map
          const priceMap = new Map<string, TokenPriceData>();
          prices.forEach(price => {
            priceMap.set(price.address, price);
          });

          // Map results back to requests
          return requests.map(req => {
            const priceData = priceMap.get(req.tokenContractAddress);
            const success = priceData && priceData.price !== undefined;

            if (success) totalSuccessful++;

            return {
              symbol: req.symbol,
              chainIndex: req.chainIndex,
              tokenContractAddress: req.tokenContractAddress,
              price: priceData?.price || null,
              error: success ? undefined : 'Price not available'
            };
          });
        } catch (error) {
          const errorMsg = `Failed to fetch prices for chain ${chainIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);

          // Return error results for this chain
          return requests.map(req => ({
            symbol: req.symbol,
            chainIndex: req.chainIndex,
            tokenContractAddress: req.tokenContractAddress,
            price: null,
            error: 'Chain request failed'
          }));
        }
      });

      const chainResults = await Promise.all(chainPromises);
      chainResults.forEach(results => allResults.push(...results));

      return {
        success: totalSuccessful > 0,
        data: allResults,
        totalRequested: tokenRequests.length,
        totalSuccessful,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error in multi-chain price fetch';
      console.error('Multi-chain price fetch error:', error);

      return {
        success: false,
        data: tokenRequests.map(req => ({
          symbol: req.symbol,
          chainIndex: req.chainIndex,
          tokenContractAddress: req.tokenContractAddress,
          price: null,
          error: errorMsg
        })),
        totalRequested: tokenRequests.length,
        totalSuccessful: 0,
        errors: [errorMsg]
      };
    }
  }

  async getAllSupportedChainsWithTokens(): Promise<Array<{
    chain: ChainData;
    tokenCount: number;
    sampleTokens: ExtendedTokenData[];
  }>> {
    const results = [];

    for (const chain of this.supportedChains) {
      try {
        const tokens = await okxDEXExtended.getAllTokens(chain.chainIndex);
        results.push({
          chain,
          tokenCount: tokens.length,
          sampleTokens: tokens.slice(0, 5) // First 5 tokens as samples
        });
      } catch (error) {
        console.error(`Error fetching tokens for chain ${chain.chainIndex}:`, error);
        results.push({
          chain,
          tokenCount: 0,
          sampleTokens: []
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const chainService = new ChainService();
