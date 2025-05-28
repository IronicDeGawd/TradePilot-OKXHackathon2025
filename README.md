# TradePilot AI - OKX DEX Trading Platform

> **🏆 Built for OKX DEX API Integration Challenge**

TradePilot AI is a comprehensive trading platform that combines the power of OKX DEX APIs with AI-driven insights to provide traders with real-time arbitrage opportunities, portfolio analytics, and market intelligence on the Solana ecosystem.

## 🌟 Demo

**Live Demo:** [https://trade-pilot-ten.vercel.app](https://trade-pilot-ten.vercel.app)

### Quick Start Demo
```bash
# Clone and run locally
git clone https://github.com/IronicDeGawd/TradePilot-OKXHackathon2025
cd TradePilot-OKXHackathon2025
npm install
npm run dev
# Visit http://localhost:3000
```

## 🚀 Core Features

### 1. **AI-Powered Trading Chat** 🤖
- **Gemini AI Integration**: Natural language trading assistance
- **Contextual Analysis**: AI understands your portfolio and market conditions
- **Smart Suggestions**: Personalized trading recommendations
- **Interactive Prompts**: Quick access to common trading queries

### 2. **Real-Time Arbitrage Scanner** ⚖️
- **OKX DEX ↔ CEX Price Comparison**: Find profit opportunities between platforms
- **Live Price Monitoring**: Real-time price feeds from both DEX and CEX
- **Profit Calculations**: Automatic spread and profit percentage calculations
- **Risk Assessment**: Low/Medium/High risk categorization
- **Volume Analysis**: 24h volume data for liquidity assessment

### 3. **Trending Token Radar** 📈
- **Social Buzz Analysis**: Track tokens with high social mentions
- **Price Momentum Detection**: Identify tokens with significant price movements
- **Volume Surge Tracking**: Spot unusual trading activity
- **Trend Scoring**: Proprietary algorithm for trend strength (0-100)
- **Market Cap Analysis**: Real-time market capitalization data

### 4. **Portfolio Management** 💼
- **Multi-Chain Support**: Solana, Ethereum, and more
- **Real-Time Valuations**: Live portfolio worth calculations
- **Performance Tracking**: 24h change analysis
- **Diversification Metrics**: Portfolio allocation insights
- **AI-Generated Suggestions**: Smart rebalancing recommendations

### 5. **Advanced Market Intelligence** 📊
- **Cross-Chain Price Comparison**: Compare token prices across different blockchains
- **Liquidity Analysis**: Deep dive into token liquidity pools
- **Market Overview Dashboard**: Comprehensive market statistics
- **Technical Indicators**: Volume, volatility, and trend analysis

## 🔧 OKX DEX API Integration

This project extensively uses the OKX DEX API ecosystem:

### **DEX APIs Used:**
- **Market Price API**: Real-time token pricing across multiple chains
- **Market Data API**: Trading volume, liquidity, and market statistics
- **Cross-Chain API**: Multi-blockchain price comparison
- **Trading Data API**: Historical trades and candlestick data

### **CEX APIs Used:**
- **Market Ticker API**: Centralized exchange price data
- **Trading Volume API**: CEX trading statistics
- **Market Depth API**: Order book analysis

### **Creative API Usage:**
1. **Arbitrage Detection Engine**: Combines DEX and CEX APIs to identify profit opportunities
2. **Trend Analysis Algorithm**: Uses multiple data points to calculate trend scores
3. **AI Context Integration**: Feeds real-time data to Gemini AI for intelligent recommendations
4. **Cross-Platform Price Discovery**: Compares prices across different trading venues

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **APIs**: OKX DEX API, OKX CEX API, Google Gemini AI
- **Blockchain**: Solana Web3.js integration
- **State Management**: React hooks with optimized caching
- **Performance**: Client-side caching, rate limiting, mobile optimization

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- OKX Developer Account

### 1. Clone Repository
```bash
git clone https://github.com/IronicDeGawd/TradePilot-OKXHackathon2025
cd TradePilot-OKXHackathon2025
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file:

```bash
# OKX API Configuration
OKX_PROJECT_ID=your_project_id
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_API_PASSPHRASE=your_passphrase

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Blockchain Configuration (Optional for Demo)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WALLET_ADDRESS=your_wallet_address
SOLANA_PRIVATE_KEY=your_private_key

# EVM Support (Optional)
EVM_WALLET_ADDRESS=your_evm_address
EVM_PRIVATE_KEY=your_evm_private_key
EVM_RPC_URL=your_rpc_url
```

### 4. Get OKX API Credentials

1. Visit [OKX Developer Portal](https://www.okx.com/web3/build/dev-portal)
2. Create an account and verify your identity
3. Generate API credentials with DEX permissions
4. Add your credentials to the `.env.local` file

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

Visit `http://localhost:3000` to see the application.

## 🎮 Usage Examples

### Command Line Examples (SDK)
```bash
# Get real-time quote (SOL → USDC)
npx ts-node src/examples/getQuote.ts

# Execute a swap
npx ts-node src/examples/executeSwap.ts 0.01 So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Get chain and token information
npx ts-node src/examples/getInfo.ts

# Test arbitrage detection
node test-arbitrage-complete.js

# Test Gemini AI integration
node test-gemini-complete.js
```

### Web Application Features

1. **AI Chat Interface**
   - Ask "What should I trade today?"
   - Get portfolio analysis: "Analyze my holdings"
   - Market insights: "Show me trending tokens"

2. **Arbitrage Scanner**
   - Real-time DEX vs CEX price comparison
   - Automated profit calculations
   - Risk assessment for each opportunity

3. **Portfolio Dashboard**
   - Live portfolio valuation
   - Performance tracking
   - AI-generated rebalancing suggestions

4. **Trending Analysis**
   - Social buzz tracking
   - Price momentum detection
   - Volume surge alerts

## 🔌 API Reference

### OKX DEX SDK Integration

```typescript
import { TradePilotClient } from './src/DexClient';

const client = new TradePilotClient();

// Get real-time arbitrage opportunities
const arbitrage = await client.getArbitrageOpportunities();

// Get trending tokens with AI analysis
const trending = await client.getTrendingTokens();

// Get portfolio with AI suggestions
const portfolio = await client.getPortfolio();

// Get AI trading advice
const advice = await client.getAITradingAdvice(
  "Should I buy more SOL?",
  portfolioData,
  marketData
);
```

### Core API Endpoints

```typescript
// Real-time price data
const price = await okxDEXService.getTokenPrice('501', tokenAddress);

// Multi-token price fetching
const prices = await okxDEXService.getMultipleTokenPrices(requests);

// Cross-chain price comparison
const crossChainPrices = await okxDEXService.getCrossChainPriceComparison(
  tokenAddress,
  ['1', '501', '56'] // ETH, SOL, BSC
);

// Trading data analysis
const trades = await okxDEXExtended.getTrades(chainIndex, tokenAddress);
const candles = await okxDEXExtended.getCandlesticks(chainIndex, tokenAddress);
```

## 🏗 Architecture

### Frontend Architecture
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes for backend integration
│   ├── chat/              # AI chat interface
│   ├── portfolio/         # Portfolio management
│   ├── arbitrage/         # Arbitrage scanner
│   └── trending/          # Trending tokens
├── components/            # Reusable UI components
├── lib/                   # Core business logic
│   ├── okx-dex-api.ts    # OKX DEX API integration
│   ├── okx-cex.ts        # OKX CEX API integration
│   ├── gemini.ts         # AI integration
│   └── trading-prompts.ts # AI prompt templates
└── types/                 # TypeScript definitions
```

### Key Services

1. **OKXDEXService**: Handles all DEX API calls with caching and rate limiting
2. **OKXCEXService**: Manages centralized exchange data
3. **GeminiService**: AI-powered trading insights and chat
4. **TrendingService**: Analyzes token trends and social buzz
5. **PortfolioService**: Manages wallet and portfolio data

## 📊 Performance Optimizations

- **Intelligent Caching**: 60-second cache for price data, longer for static data
- **Rate Limiting**: Built-in rate limiter to respect API limits
- **Mobile Optimization**: Adaptive rendering for mobile devices
- **Background Refresh**: Non-blocking data updates
- **Error Handling**: Comprehensive retry mechanisms and fallbacks

## 🔐 Security Features

- **API Key Protection**: Environment-based credential management
- **Request Signing**: Proper HMAC-SHA256 signing for authenticated requests
- **Input Validation**: Comprehensive input sanitization
- **Error Boundaries**: React error boundaries for graceful failures

## 🚨 Risk Disclaimers

⚠️ **Important Trading Warnings:**

- **Demo Mode**: The application includes demo wallets for testing
- **Real Trading**: Always verify prices on actual platforms before executing trades
- **Market Risks**: Cryptocurrency trading involves substantial risk of loss
- **API Limits**: Respect rate limits to avoid service interruptions
- **Arbitrage Risks**: Consider gas fees, slippage, and execution time

## 📈 Future Roadmap

### Phase 1 (Current)
- ✅ OKX DEX API Integration
- ✅ AI-Powered Chat Interface
- ✅ Real-time Arbitrage Detection
- ✅ Portfolio Analytics

### Phase 2 (Planned)
- 🔄 Advanced Technical Analysis
- 🔄 Multi-DEX Arbitrage
- 🔄 Automated Trading Bots
- 🔄 Social Media Sentiment Analysis

### Phase 3 (Vision)
- 🔮 Cross-Chain Arbitrage
- 🔮 DeFi Yield Farming Integration
- 🔮 Advanced Risk Management
- 🔮 Professional Trading Tools

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.


## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🎯 Built For OKX DEX Challenge

This project was specifically built for the OKX DEX API Integration Challenge, showcasing:

- **Creative API Usage**: Combining multiple OKX APIs for unique arbitrage detection
- **Real-World Application**: Practical trading tools that solve actual market problems
- **Technical Excellence**: Clean architecture, proper error handling, and performance optimization
- **User Experience**: Intuitive interface with AI-powered assistance

---

**⭐ Star this repo if you found it helpful!**

## 🔗 Quick Links

- [OKX Developer Portal](https://www.okx.com/web3/build/dev-portal)
- [OKX DEX API Documentation](https://www.okx.com/web3/build/docs/dex)
- [Solana Documentation](https://docs.solana.com/)
- [Next.js Documentation](https://nextjs.org/docs)
