"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Bot,
  User,
  ArrowLeft,
  Loader2,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkdownMessage from "@/components/MarkdownMessage";
import { geminiService } from "@/lib/gemini";
import { okxService } from "@/lib/okx";
import { TRADING_PROMPTS, getPromptsByCategory } from "@/lib/trading-prompts";
import type { ChatMessage } from "@/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: `# 🚀 Welcome to TradePilot AI

I'm your **expert trading copilot** for the Solana ecosystem and OKX platforms!

## What I can help you with:

• **Portfolio Analysis** - Get insights on your holdings and performance
• **Market Opportunities** - Discover trending tokens and arbitrage chances
• **Trading Strategies** - Personalized recommendations based on your risk profile
• **Risk Management** - Smart position sizing and stop-loss suggestions

## Quick Actions:
Try one of the prompts below or ask me anything about crypto trading!

⚠️ *Remember: All trading involves risk. Never invest more than you can afford to lose.*`,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: textToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setShowPrompts(false);

    try {
      // Prepare context from recent portfolio data
      const walletAddress = process.env.NEXT_PUBLIC_SOLANA_WALLET_ADDRESS;
      const portfolioData = await okxService.getPortfolio(walletAddress);
      const context = {
        portfolio: portfolioData,
        recentMessages: messages.slice(-5), // Last 5 messages for context
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleFormSubmit = () => {
    handleSendMessage();
  };

  const getContextData = async () => {
    try {
      // Use environment wallet address
      const walletAddress = process.env.NEXT_PUBLIC_SOLANA_WALLET_ADDRESS;
      const [portfolio, arbitrage, trending] = await Promise.all([
        okxService.getPortfolio(walletAddress),
        okxService.getArbitrageOpportunities(),
        okxService.getTrendingTokens(),
      ]);

      return { portfolio, arbitrage, trending };
    } catch (error) {
      console.error("Error getting context:", error);
      return {};
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "What should I trade today?",
    "Analyze my portfolio",
    "Show me trending tokens",
    "Find arbitrage opportunities",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Bot className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-xl font-bold">TradePilot AI</h1>
              <p className="text-sm text-gray-400">AI Trading Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Online
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start space-x-3 max-w-3xl ${
                  message.sender === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === "user" ? "bg-primary-600" : "bg-gray-700"
                  }`}
                >
                  {message.sender === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div className={`chat-message ${message.sender}`}>
                  {message.sender === "ai" ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="chat-message ai">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Smart Prompts */}
      {showPrompts && (
        <div className="p-4 border-t border-dark-border bg-dark-card/20">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-gray-400 mb-4">
              🎯 Smart Trading Prompts:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TRADING_PROMPTS.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handlePromptClick(template.prompt)}
                  className="text-left p-3 rounded-lg border border-dark-border hover:border-primary-500/50 bg-dark-card/50 hover:bg-dark-card transition-all group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm group-hover:text-primary-400 transition-colors">
                        {template.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowPrompts(false)}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Hide prompts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-dark-border bg-dark-card/30 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about trading, portfolio analysis, or market trends..."
                className="input-field w-full resize-none"
                rows={1}
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={handleFormSubmit}
              disabled={!inputMessage.trim() || isLoading}
              className="btn-primary h-11 w-11 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Powered by Gemini AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
