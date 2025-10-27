# KNEW - Knowledge Nexus for Every Witness

**Free AI Demo for EIC Grant | TRL 7 Target**

A professional location-based news analysis platform demonstrating advanced TRL 7 capabilities with worldwide coverage, multilingual support (5 languages), and AI-powered bias detection.

## 🌍 TRL 7 Features

### Multilingual Support (NEW)
- **5 Languages**: English, Portuguese, Spanish, French, German
- Real-time language switching via dropdown in navigation
- Geographic news distribution based on language preference
- Language-specific mock data fallback when API limits reached
- Separate caching per language for optimal performance

### AI-Powered Analysis (Free Tier)
- **Bias Detection**: HuggingFace-powered analysis with confidence scores
  - Automatic pre-tagging (LEFT/CENTER/RIGHT)
  - Manual bias tagging with AI suggestions
  - Neutral AI-generated summaries
  
- **Media Ownership Mapping**: Interactive ownership charts showing who controls the news
  - Chart.js pie charts with distinct colors
  - Mock ownership data for major sources (CNN, BBC, Fox News, etc.)
  - Transparency on ownership percentages
  
- **Advanced Analytics**: Access to full bias analysis and ownership insights

### Interactive Map Interface
- **Worldwide Distribution**: News markers from 15+ major global cities
- **Location-Based Discovery**: Click anywhere to discover local news
- **Custom Pins**: Create witness reports at any location
- **Category Filters**: My Pins, Global, Trending, Recent, Sports, Tech, Science

### Enhanced Error Handling (TRL 7)
- **Graceful Fallback**: Automatic switch to mock data on API failures
- **Multi-Source**: NewsAPI.org → NewsData.io → Mock Data
- **Comprehensive Try/Catch**: All API calls protected with error handling
- **User Alerts**: Clear error messages (ready for toast notifications)
- **Smart Caching**: 5-minute cache per language to minimize API calls

### Modern UX/UI
- iOS 26-inspired glassmorphism design
- Dark Pro theme optimized for professionals
- Smooth animations and transitions
- Responsive mobile-first layout
- Anonymous Witness Reports with mock usernames
- Event History timeline

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (auto-configured on Replit)

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## 🔧 Configuration

Add the following secrets in your Replit Secrets panel (or `.env` file):

### Required for Full Functionality

#### NewsAPI (Primary Source - Country Headlines)
```
NEWS_API_KEY=your_newsapi_key_here
```
- Get your key at: https://newsapi.org/register
- Free tier: 100 requests/day
- Supports multilingual news via country mapping
- Required for: Top headlines by language/country

#### NewsData.io (Fallback Source - Global News)
```
NEWSDATA_API_KEY=your_newsdata_key_here
```
- Get your key at: https://newsdata.io/register
- Free tier: 200 requests/day
- Required for: Worldwide news coverage fallback

#### HuggingFace (AI Bias Detection)
```
HUGGINGFACE_API_KEY=your_huggingface_token_here
```
- Get your token at: https://huggingface.co/settings/tokens
- Model: `cardiffnlp/twitter-roberta-base-bias-detection`
- Free for non-commercial use
- Required for: AI bias analysis

#### Stripe (Payment Processing - Optional)
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```
- Get test keys at: https://dashboard.stripe.com/apikeys
- Use test keys for development (start with `pk_test_` and `sk_test_`)
- Required for: Pro subscription checkout
- **Note**: App works in demo mode without Stripe keys (auto-unlocks all features)

### Optional (Production)
```
STRIPE_WEBHOOK_SECRET=whsec_...
```
- For production Stripe webhook verification

## 🗺️ How to Use

### 1. Select Language (NEW)
- Click the **globe icon** 🌍 next to "Sign In" in the navigation bar
- Choose from: English 🇺🇸, Português 🇵🇹, Español 🇪🇸, Français 🇫🇷, Deutsch 🇩🇪
- News automatically refreshes in selected language
- Each language has separate caching for performance

### 2. Browse Worldwide News
- **Default view**: Shows news from 15+ major global cities
- **Auto-refresh**: News updates every 5 minutes
- **Smart caching**: Reduces API calls and improves speed

### 3. Discover Local News
- **Click anywhere** on the map to discover news for that location
- **View markers**: Click pins to read full articles
- **AI Analysis**: Each article shows bias detection and ownership info

### 4. Filter by Category
- **Global**: International and worldwide news
- **Trending**: Viral and breaking news
- **Sports**: Championships, games, and athletics
- **Tech**: Technology innovation and startups
- **Science**: Research and discoveries
- **My Pins**: Your witness reports

### 5. Create Witness Reports
- Click **"My Pins"** to create location-based reports
- Add title, description, and optional image
- Reports appear on the map for all users

### 6. Search News
- Use the **search bar** to find news by keywords
- Map auto-centers on searched locations
- Debounced for optimal performance

## 🎨 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query V5** for server state management
- **Tailwind CSS** + shadcn/ui components
- **Chart.js** for ownership visualization
- **React Leaflet** for interactive maps
- **Language Context** for multilingual support

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Replit Auth** with OpenID Connect (supports Google, GitHub, X, Apple, email/password)
- **Stripe** for payment processing
- **News Orchestrator** with multi-API fallback system
- **HuggingFace Inference API** for AI analysis

### Data Architecture
```
User Request → Language Context → React Query → Express Routes → 
News Orchestrator → NewsAPI/NewsData.io → PostgreSQL Cache → 
Client (with language-specific data)
```

## 📊 TRL Progress: 6 → 7

### ✅ Completed TRL 7 Enhancements

1. **Multilingual Support**: 5 languages (English, Portuguese, Spanish, French, German)
2. **Language-Specific Caching**: Separate cache per language
3. **Comprehensive Error Handling**: Try/catch on all API calls
4. **Graceful Fallbacks**: Multi-source fallback with mock data
5. **Production Optimization**: Optimized for Replit public URL deployment
6. **Professional Documentation**: Complete setup instructions

### Target TRL 7 Metrics
- ✅ **Languages**: 5/5 supported
- ✅ **Error Handling**: Comprehensive with fallbacks
- ✅ **AI Features**: Bias detection unlocked (free tier)
- ✅ **Deployment Ready**: Optimized for Replit platform
- ✅ **User Experience**: iOS 26-inspired glassmorphism
- ✅ **Authentication**: Replit Auth with multiple providers

### Roadmap to Beyond TRL 7
1. Scale to 10+ languages (currently 5)
2. Expand to 10,000+ news sources
3. Achieve 95% bias detection accuracy
4. Implement real-time fact-checking
5. Add cross-platform mobile apps

## 🌐 API Endpoints

### News Endpoints
- `GET /api/news?language=en` - Fetch worldwide news
- `GET /api/news/location-fresh?lat=40.7&lng=-74&language=pt` - Location news
- `GET /api/news/category/:category?language=es` - Category-filtered news
- `GET /api/news/search?q=climate&language=fr` - Search news

### AI Endpoints
- `POST /api/ai/detect-bias` - Analyze article bias
- `GET /api/ai/summary/:id` - Get neutral summary

### Auth Endpoints
- `GET /api/login` - Initiate Replit Auth login
- `GET /api/logout` - Logout user
- `GET /api/auth/user` - Get current user

## 🗺️ Deployment

### Replit (Recommended for EIC Demo)
The app is optimized for Replit's platform with:
- Automatic database provisioning
- Built-in secrets management
- One-click deployment
- HTTPS by default
- Free hosting tier

**To Publish:**
1. Add all API keys in Replit Secrets
2. Click "Publish" button in Replit
3. Your app will be live at: `https://[your-repl].replit.app`

**Live Demo URL Structure:**
```
https://username.geonewstracker.replit.app
```

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🎯 EIC Demo Notes

### **System Prototype Demonstration in Operational Environment (TRL 7)**

✅ **Demonstrated Capabilities:**
1. **Multi-language News Aggregation**: 5 languages with real-time switching
2. **Geographic News Distribution**: Worldwide coverage from 15+ cities
3. **AI-Powered Analysis**: Free tier bias detection via HuggingFace
4. **Robust Error Handling**: Multi-source fallback (NewsAPI → NewsData → Mock)
5. **Production Deployment**: Optimized for Replit public URL
6. **User Authentication**: Replit Auth with multiple providers
7. **Database Persistence**: PostgreSQL with Drizzle ORM

✅ **Free Tier Architecture:**
- **NewsAPI.org**: 100 requests/day
- **NewsData.io**: 200 requests/day  
- **HuggingFace**: Free inference API
- **Replit**: Free hosting + database
- **Total Cost**: $0 for demo/testing

✅ **Performance Optimizations:**
- 5-minute caching per language
- Smart API call reduction
- Automatic fallback system
- Mock data for testing without API keys

## 🔐 Security Notes

- Never commit API keys to version control
- Always use environment variables/secrets
- Test mode Stripe keys are safe for development
- Production keys should only be on secure servers
- Replit Auth handles secure authentication
- PostgreSQL sessions with 1-week TTL

## 🤝 Support

For issues or questions:
1. Check the console for error messages
2. Verify all API keys are correctly set in Replit Secrets
3. Ensure database migrations are up to date (`npm run db:push`)
4. Test multilingual support by switching languages
5. Contact Replit support for platform-specific issues

## 📄 License

Built for EIC Grant demonstration. All rights reserved.

---

**KNEW** - Knowledge Nexus for Every Witness  
**Free AI Demo | TRL 7 Target | Multilingual Support**

Empowering every witness with knowledge and transparency across 5 languages.
