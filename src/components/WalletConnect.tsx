"use client";

import { useState, useEffect } from "react";
import { Wallet, LogOut, ExternalLink } from "lucide-react";
import { solanaWallet } from "@/lib/solana-wallet";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  network: "solana" | "ethereum" | null;
}

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    network: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if already connected
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).solana) {
        const phantom = (window as any).solana;
        if (phantom.isConnected) {
          const balance = await solanaWallet.getBalance(
            phantom.publicKey.toString()
          );
          setWallet({
            isConnected: true,
            address: phantom.publicKey.toString(),
            balance,
            network: "solana",
          });
        }
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
    }
  };

  const connectSolanaWallet = async () => {
    setIsConnecting(true);
    try {
      const connection = await solanaWallet.connectPhantomWallet();
      if (connection) {
        setWallet({
          isConnected: true,
          address: connection.address,
          balance: connection.balance,
          network: "solana",
        });
      } else {
        // Use environment wallet if Phantom is not available
        const envWalletAddress = process.env.NEXT_PUBLIC_SOLANA_WALLET_ADDRESS;
        if (envWalletAddress) {
          const balance = await solanaWallet.getBalance(envWalletAddress);
          setWallet({
            isConnected: true,
            address: envWalletAddress,
            balance: balance,
            network: "solana",
          });
        } else {
          console.error(
            "No Phantom wallet found and no environment wallet configured"
          );
        }
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectEthereumWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length > 0) {
          setWallet({
            isConnected: true,
            address: accounts[0],
            balance: 1.25,
            network: "ethereum",
          });
        }
      }
    } catch (error) {
      console.error("Failed to connect Ethereum wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (
      wallet.network === "solana" &&
      typeof window !== "undefined" &&
      (window as any).solana
    ) {
      (window as any).solana.disconnect();
    }

    setWallet({
      isConnected: false,
      address: null,
      balance: 0,
      network: null,
    });
  };

  const formatAddress = (address: string) => {
    return solanaWallet.formatAddress(address);
  };

  const openInExplorer = () => {
    if (!wallet.address) return;

    const explorerUrl =
      wallet.network === "solana"
        ? `https://solscan.io/account/${wallet.address}`
        : `https://etherscan.io/address/${wallet.address}`;

    window.open(explorerUrl, "_blank");
  };

  return (
    <div className="flex items-center space-x-3">
      {wallet.isConnected ? (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm text-green-300">
              {formatAddress(wallet.address!)}
            </span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm font-medium text-white">
              {wallet.balance.toFixed(3)}{" "}
              {wallet.network === "solana" ? "SOL" : "ETH"}
            </span>
            <button
              onClick={openInExplorer}
              className="text-gray-400 hover:text-blue-400 transition-colors"
              title="View in Explorer"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={disconnectWallet}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Disconnect Wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={connectSolanaWallet}
            disabled={isConnecting}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>{isConnecting ? "Connecting..." : "Connect Solana"}</span>
          </button>
          <button
            onClick={connectEthereumWallet}
            disabled={isConnecting}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>{isConnecting ? "Connecting..." : "Connect ETH"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
