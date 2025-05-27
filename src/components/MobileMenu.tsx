"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  MessageSquare,
  Wallet,
  TrendingUp,
  BarChart3,
  Home,
} from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  { href: "/portfolio", icon: Wallet, label: "Portfolio" },
  { href: "/arbitrage", icon: BarChart3, label: "Arbitrage" },
  { href: "/trending", icon: TrendingUp, label: "Trending" },
];

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-300 hover:text-white p-2 bg-gray-800/70 rounded-lg hover:bg-gray-700 transition-all"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed top-[4.5rem] left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/80 z-50 shadow-2xl animate-fadeIn h-screen">
          <div className="px-4 py-4 space-y-2 max-w-sm mx-auto">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm border"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/70"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 ${
                      isActive ? "text-blue-400" : "text-gray-400"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
