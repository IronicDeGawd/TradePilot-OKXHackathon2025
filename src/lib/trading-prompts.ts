export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'analysis' | 'strategy' | 'arbitrage' | 'trending';
  icon: string;
}

export const TRADING_PROMPTS: PromptTemplate[] = [
  {
    id: 'portfolio-analysis',
    title: 'Analyze My Portfolio',
    description: 'Get detailed analysis of your current holdings and risk assessment',
    prompt: 'Please analyze my current portfolio holdings. What are the risks and opportunities? Should I rebalance anything?',
    category: 'analysis',
    icon: '📊'
  },
  {
    id: 'what-to-trade',
    title: 'What Should I Trade Today?',
    description: 'Get personalized trading suggestions based on market conditions',
    prompt: 'Based on current market conditions and my portfolio, what trading opportunities should I consider today?',
    category: 'strategy',
    icon: '🎯'
  },
  {
    id: 'arbitrage-opportunities',
    title: 'Find Arbitrage Opportunities',
    description: 'Discover profitable price differences between DEX and CEX',
    prompt: 'Show me the best arbitrage opportunities between OKX DEX and CEX right now. Which ones have the highest profit potential?',
    category: 'arbitrage',
    icon: '⚡'
  },
  {
    id: 'trending-analysis',
    title: 'Trending Token Analysis',
    description: 'Analyze trending tokens and their momentum',
    prompt: 'Analyze the current trending tokens. Which ones have sustainable momentum vs. which are just hype?',
    category: 'trending',
    icon: '🔥'
  },
  {
    id: 'risk-management',
    title: 'Risk Management Strategy',
    description: 'Get advice on managing portfolio risk and setting stops',
    prompt: 'Help me create a risk management strategy for my portfolio. Where should I set stop losses and take profits?',
    category: 'strategy',
    icon: '🛡️'
  },
  {
    id: 'dca-strategy',
    title: 'DCA Strategy',
    description: 'Dollar-cost averaging recommendations',
    prompt: 'I want to DCA into some tokens. Which ones should I consider and what schedule would you recommend?',
    category: 'strategy',
    icon: '📈'
  },
  {
    id: 'meme-coin-analysis',
    title: 'Meme Coin Analysis',
    description: 'Analyze meme coins and their trading potential',
    prompt: 'Analyze the current meme coin landscape on Solana. Which ones have trading potential vs. which are too risky?',
    category: 'trending',
    icon: '🐕'
  },
  {
    id: 'market-sentiment',
    title: 'Market Sentiment',
    description: 'Current market sentiment and what it means for trading',
    prompt: 'What is the current market sentiment and how should it influence my trading decisions today?',
    category: 'analysis',
    icon: '🌡️'
  }
];

export const getPromptsByCategory = (category: PromptTemplate['category']) => {
  return TRADING_PROMPTS.filter(prompt => prompt.category === category);
};

export const getPromptById = (id: string) => {
  return TRADING_PROMPTS.find(prompt => prompt.id === id);
};
