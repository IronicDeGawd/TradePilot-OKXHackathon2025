"use client";

import { useChainService } from "../lib/use-chain-service";

export default function ChainSelector() {
  const { supportedChains, selectedChain, isLoading, error, selectChain } =
    useChainService();

  const handleChainChange = async (chainIndex: string) => {
    if (chainIndex && chainIndex !== selectedChain?.chainIndex) {
      await selectChain(chainIndex);
    }
  };

  if (error) {
    return (
      <div className="text-red-500 text-sm">Error loading chains: {error}</div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedChain?.chainIndex || ""}
        onChange={(e) => handleChainChange(e.target.value)}
        disabled={isLoading || supportedChains.length === 0}
        className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {supportedChains.length === 0 ? (
          <option value="">Loading chains...</option>
        ) : (
          <>
            <option value="">Select Network</option>
            {supportedChains.map((chain) => (
              <option key={chain.chainIndex} value={chain.chainIndex}>
                {chain.name} ({chain.symbol})
              </option>
            ))}
          </>
        )}
      </select>

      {isLoading && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}
