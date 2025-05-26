'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Wallet, TrendingUp, BarChart3, Home } from 'lucide-react';
import WalletConnect from './WalletConnect';
import MobileMenu from './MobileMenu';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { href: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { href: '/arbitrage', icon: BarChart3, label: 'Arbitrage' },
  { href: '/trending', icon: TrendingUp, label: 'Trending' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl md:text-2xl font-bold text-blue-400">
              TradePilot AI
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-8">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-300 hover:text-white hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Link>
                );
              })}
            </div>
            <WalletConnect />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-4">
            <WalletConnect />
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
