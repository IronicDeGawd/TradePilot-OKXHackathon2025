'use client';

import { useState, useEffect } from 'react';
import { chainService } from './chain-service';
import type { ChainData, ExtendedTokenData, TokenPriceData } from '../types';

export function useChainService() {
  const [supportedChains, setSupportedChains] = useState<ChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainData | null>(null);
  const [tokensForSelectedChain, setTokensForSelectedChain] = useState<ExtendedTokenData[]>([]);
  const [tokenPrices, setTokenPrices] = useState<Record<string, TokenPriceData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to chain service updates
    const unsubscribe = chainService.subscribe(() => {
      setSupportedChains(chainService.getSupportedChains());
      setSelectedChain(chainService.getSelectedChain());
      setTokensForSelectedChain(chainService.getTokensForSelectedChain());
      setTokenPrices(chainService.getTokenPrices());
      setIsLoading(chainService.getIsLoading());
      setError(chainService.getError());
    });

    // Initial sync with current state
    setSupportedChains(chainService.getSupportedChains());
    setSelectedChain(chainService.getSelectedChain());
    setTokensForSelectedChain(chainService.getTokensForSelectedChain());
    setTokenPrices(chainService.getTokenPrices());
    setIsLoading(chainService.getIsLoading());
    setError(chainService.getError());

    return () => {
      unsubscribe();
    };
  }, []);

  const selectChain = async (chainIndex: string) => {
    await chainService.selectChain(chainIndex);
  };

  const refreshPrices = async () => {
    await chainService.refreshPricesForCurrentChain();
  };

  const getTokenPrice = (tokenAddress: string) => {
    return chainService.getTokenPrice(tokenAddress);
  };

  const getTokenInfo = (tokenAddress: string) => {
    return chainService.getTokenInfo(tokenAddress);
  };

  return {
    supportedChains,
    selectedChain,
    tokensForSelectedChain,
    tokenPrices,
    isLoading,
    error,
    isInitialized: chainService.isInitialized(),
    selectChain,
    refreshPrices,
    getTokenPrice,
    getTokenInfo,
  };
}
