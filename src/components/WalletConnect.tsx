"use client";

import { useState, useEffect } from "react";
import { Wallet, LogOut, ExternalLink, PieChart } from "lucide-react";
import Link from "next/link";
import { solanaWallet } from "@/lib/solana-wallet";
import { isMobileDevice } from "@/lib/device-utils";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  network: "solana" | "ethereum" | "demo" | null;
  isDemo?: boolean;
}

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    network: null,
    isDemo: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoDisconnectTimer, setAutoDisconnectTimer] =
    useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Check if mobile device
    setIsMobile(isMobileDevice());
    // Check if already connected
    checkExistingConnection();
    // Set up auto-disconnect timer
    setupAutoDisconnect();

    // Cleanup timer on unmount
    return () => {
      if (autoDisconnectTimer) {
        clearTimeout(autoDisconnectTimer);
      }
    };
  }, []);

  // Auto-disconnect after 1 hour (3600000 ms)
  const setupAutoDisconnect = () => {
    // Clear any existing timer
    if (autoDisconnectTimer) {
      clearTimeout(autoDisconnectTimer);
      setAutoDisconnectTimer(null);
    }

    if (typeof window !== "undefined") {
      const connectionTime = localStorage.getItem("walletConnectionTime");
      const now = Date.now();

      if (connectionTime) {
        const timeElapsed = now - parseInt(connectionTime);
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        if (timeElapsed >= oneHour) {
          // Connection has expired, disconnect immediately
          disconnectWallet();
          return;
        }

        // Set timer for remaining time
        const remainingTime = oneHour - timeElapsed;
        const timer = setTimeout(() => {
          console.log("Auto-disconnecting wallet after 1 hour of inactivity");
          disconnectWallet();
        }, remainingTime);

        setAutoDisconnectTimer(timer);
        console.log(
          `Wallet will auto-disconnect in ${Math.round(
            remainingTime / 1000 / 60
          )} minutes`
        );
      }
    }
  };

  const setConnectionTime = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("walletConnectionTime", Date.now().toString());
    }
  };

  const clearConnectionTime = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("walletConnectionTime");
    }
  };

  const updateTimeRemaining = () => {
    if (typeof window !== "undefined") {
      const connectionTime = localStorage.getItem("walletConnectionTime");
      if (connectionTime) {
        const now = Date.now();
        const timeElapsed = now - parseInt(connectionTime);
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        const remaining = oneHour - timeElapsed;

        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(null);
        }
      }
    }
  };

  // Update time remaining every minute
  useEffect(() => {
    if (wallet.isConnected) {
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [wallet.isConnected]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const checkExistingConnection = async () => {
    try {
      // Check if we were in demo mode
      if (typeof window !== "undefined") {
        const walletMode = localStorage.getItem("walletMode");
        if (walletMode === "demo") {
          await connectDemoWallet();
          return;
        }
      }

      // Check for real wallet connections
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
            isDemo: false,
          });
          // Set connection time for existing connections
          setConnectionTime();
          setupAutoDisconnect(); // Restart auto-disconnect timer
        }
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
    }
  };

  const connectDemoWallet = async () => {
    try {
      // Get demo wallet data from API to ensure consistency
      const response = await fetch("/api/portfolio?demo=true");
      if (response.ok) {
        const portfolioData = await response.json();
        setWallet({
          isConnected: true,
          address: portfolioData.walletAddress,
          balance:
            portfolioData.tokens.find((t: any) => t.symbol === "SOL")
              ?.balance || 5,
          network: "demo",
          isDemo: true,
        });

        // Store demo mode in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("walletMode", "demo");
          setConnectionTime();
        }
        setupAutoDisconnect(); // Restart auto-disconnect timer
      } else {
        // Fallback to local generation if API fails
        const demoWallet = solanaWallet.generateDemoWallet();
        setWallet({
          isConnected: true,
          address: demoWallet.address,
          balance: demoWallet.balance,
          network: "demo",
          isDemo: true,
        });

        // Store demo mode in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("walletMode", "demo");
          setConnectionTime();
        }
        setupAutoDisconnect(); // Restart auto-disconnect timer
      }
    } catch (error) {
      console.error("Error connecting demo wallet:", error);
      // Fallback to local generation
      const demoWallet = solanaWallet.generateDemoWallet();
      setWallet({
        isConnected: true,
        address: demoWallet.address,
        balance: demoWallet.balance,
        network: "demo",
        isDemo: true,
      });

      // Store demo mode in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("walletMode", "demo");
        setConnectionTime();
      }
      setupAutoDisconnect(); // Restart auto-disconnect timer
    }
  };

  const connectSolanaWallet = async () => {
    setIsConnecting(true);

    // Set a timeout to reset the connecting state if the user cancels the wallet dialog
    const connectionTimeout = setTimeout(() => {
      setIsConnecting(false);
    }, 30000); // 30 seconds timeout

    try {
      const connection = await solanaWallet.connectPhantomWallet();
      clearTimeout(connectionTimeout);

      if (connection) {
        setWallet({
          isConnected: true,
          address: connection.address,
          balance: connection.balance,
          network: "solana",
          isDemo: false,
        });

        // Store real wallet mode in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("walletMode", "real");
        }

        setConnectionTime(); // Set connection time
        setupAutoDisconnect(); // Restart auto-disconnect timer
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
            isDemo: false,
          });

          // Store real wallet mode in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("walletMode", "real");
          }

          setConnectionTime(); // Set connection time
          setupAutoDisconnect(); // Restart auto-disconnect timer
        } else {
          console.error(
            "No Phantom wallet found and no environment wallet configured"
          );
        }
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // If the error includes "user rejected", it's a user cancellation
      if (
        error instanceof Error &&
        (error.message.includes("user rejected") ||
          error.message.includes("User rejected"))
      ) {
        console.log("User cancelled wallet connection");
      }
    } finally {
      clearTimeout(connectionTimeout);
      setIsConnecting(false);
    }
  };

  const connectEthereumWallet = async () => {
    setIsConnecting(true);

    // Set a timeout to reset the connecting state if the user cancels the wallet dialog
    const connectionTimeout = setTimeout(() => {
      setIsConnecting(false);
    }, 30000); // 30 seconds timeout

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });

        clearTimeout(connectionTimeout);

        if (accounts.length > 0) {
          setWallet({
            isConnected: true,
            address: accounts[0],
            balance: 1.25,
            network: "ethereum",
            isDemo: false,
          });

          // Store real wallet mode in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("walletMode", "real");
          }

          setConnectionTime(); // Set connection time
          setupAutoDisconnect(); // Restart auto-disconnect timer
        }
      }
    } catch (error) {
      console.error("Failed to connect Ethereum wallet:", error);

      // Check for user rejection errors (MetaMask specific error codes and messages)
      if (error instanceof Error) {
        if (
          error.message.includes("User rejected") ||
          error.message.includes("user rejected") ||
          (error as any).code === 4001
        ) {
          console.log("User cancelled Ethereum wallet connection");
        }
      }
    } finally {
      clearTimeout(connectionTimeout);
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    // Clear auto-disconnect timer
    if (autoDisconnectTimer) {
      clearTimeout(autoDisconnectTimer);
      setAutoDisconnectTimer(null);
    }

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
      isDemo: false,
    });

    // Clear wallet mode and connection time from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("walletMode");
      localStorage.removeItem("walletConnectionTime");
    }
  };

  const formatAddress = (address: string) => {
    return solanaWallet.formatAddress(address);
  };

  const openInExplorer = () => {
    if (!wallet.address || wallet.isDemo) return;

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
          {/* Connected Wallet UI - Both Mobile & Desktop */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-800/80 to-green-700/60 border border-emerald-600/50 rounded-lg px-3 py-2 hover:from-emerald-700 hover:to-green-600/70 transition-all shadow-md">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-glow"></div>
              <Link href="/portfolio" className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-emerald-300" />
                {!isMobile && (
                  <>
                    <span className="text-sm text-emerald-300 font-medium">
                      {wallet.isDemo
                        ? "Demo Wallet"
                        : formatAddress(wallet.address!)}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-sm font-medium text-white">
                      {wallet.balance.toFixed(3)}{" "}
                      {wallet.network === "solana"
                        ? "SOL"
                        : wallet.network === "ethereum"
                        ? "ETH"
                        : "SOL"}
                    </span>
                    {timeRemaining && !wallet.isDemo && (
                      <>
                        <span className="text-xs text-gray-400">|</span>
                        <span
                          className="text-xs text-gray-400"
                          title="Auto-disconnect in"
                        >
                          🕒 {formatTimeRemaining(timeRemaining)}
                        </span>
                      </>
                    )}
                  </>
                )}
                {isMobile && (
                  <span className="text-sm text-emerald-300">
                    {wallet.isDemo ? "Demo" : "Portfolio"}
                  </span>
                )}
              </Link>
              {!wallet.isDemo && !isMobile && (
                <button
                  onClick={openInExplorer}
                  className="text-gray-300 hover:text-blue-400 transition-colors ml-1"
                  title="View in Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Enhanced Disconnect Button */}
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to disconnect your wallet? Your session will be cleared from cache and browser."
                  )
                ) {
                  disconnectWallet();
                }
              }}
              className="flex items-center space-x-1 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all bg-gray-800/50 rounded-lg border border-red-500/30 hover:border-red-400/50 shadow-sm"
              title="Disconnect Wallet"
            >
              <LogOut className="w-4 h-4" />
              {!isMobile && (
                <span className="text-xs font-medium">Disconnect</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Connect Wallet Dropdown UI - Both Mobile & Desktop */}
          <button
            onClick={() => setShowWalletOptions(!showWalletOptions)}
            className="flex items-center space-x-2 bg-gradient-connect hover:opacity-90 shadow-lg shadow-indigo-900/30 disabled:opacity-70 text-white px-4 py-2 rounded-lg transition-all border border-indigo-500/30"
            disabled={isConnecting}
          >
            <Wallet className="w-4 h-4" />
            <span className={`${isMobile ? "hidden sm:inline" : ""}`}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </span>
            {isMobile && <span className="inline sm:hidden">Connect</span>}
            <svg
              className={`w-4 h-4 text-white transition-transform duration-200 ${
                showWalletOptions ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown for both mobile and desktop */}
          {showWalletOptions && (
            <div className="fixed md:absolute md:right-0 top-20 md:top-12 left-0 md:left-auto right-0 z-50 md:w-64 px-4 md:px-0">
              <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700/80 rounded-md shadow-xl p-4 flex flex-col space-y-3 animate-dropdown-open origin-top-right">
                <button
                  onClick={() => {
                    connectSolanaWallet();
                    setShowWalletOptions(false);
                  }}
                  disabled={isConnecting}
                  className="flex items-center justify-between space-x-2 bg-gradient-solana hover:opacity-90 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-all shadow-md border border-purple-500/30"
                >
                  <span className="font-medium">Connect Solana</span>
                  <img
                    src="https://solana.com/favicon-32x32.png"
                    alt="Solana"
                    className="w-5 h-5"
                  />
                </button>
                <button
                  onClick={() => {
                    connectEthereumWallet();
                    setShowWalletOptions(false);
                  }}
                  disabled={isConnecting}
                  className="flex items-center justify-between space-x-2 bg-gradient-ethereum hover:opacity-90 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-all shadow-md border border-blue-500/30"
                >
                  <span className="font-medium">Connect Ethereum</span>
                  <img
                    src="https://ethereum.org/favicon-32x32.png"
                    alt="Ethereum"
                    className="w-5 h-5"
                  />
                </button>
                <button
                  onClick={async () => {
                    await connectDemoWallet();
                    setShowWalletOptions(false);
                  }}
                  disabled={isConnecting}
                  className="flex items-center justify-between space-x-2 bg-gradient-demo hover:opacity-90 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-all shadow-md border border-green-500/30"
                >
                  <span className="font-medium">Demo Wallet</span>
                  <PieChart className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
