"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Wallet,
  TrendingUp,
  BarChart3,
  Home,
  ArrowLeftRight,
} from "lucide-react";
import WalletConnect from "./WalletConnect";
import MobileMenu from "./MobileMenu";
import ChainSelector from "./ChainSelector";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  { href: "/portfolio", icon: Wallet, label: "Portfolio" },
  { href: "/swap", icon: ArrowLeftRight, label: "Swap" },
  { href: "/arbitrage", icon: BarChart3, label: "Arbitrage" },
  { href: "/trending", icon: TrendingUp, label: "Trending" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gradient-nav border-b border-gray-700/80 sticky top-0 z-40 shadow-xl backdrop-blur-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 py-3">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center"
            >
              <svg
                className="w-8 h-8 mr-2 text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              TradePilot AI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-2">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-400/10 text-blue-400 border-blue-500/50 shadow-md border"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mr-2 ${
                        isActive ? "text-blue-400" : "text-gray-400"
                      }`}
                    />
                    {label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center space-x-4 pl-4 border-l border-gray-700/50">
              <ChainSelector />
              <WalletConnect />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-3">
            <ChainSelector />
            <WalletConnect />
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
