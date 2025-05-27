import "./globals.css";
import { Inter } from "next/font/google";
import Navigation from "@/components/Navigation";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TradePilot AI - Your Trading Copilot",
  description: "Smart trading assistant with real-time data and AI insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-dark-bg to-slate-900">
          <Navigation />
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
