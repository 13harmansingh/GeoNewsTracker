# Knew - Location-Based News Application

## Overview
Knew is a professional location-based news platform demonstrating TRL 7 capabilities for EIC grant. The application provides worldwide news coverage with multilingual support (5 languages), AI-powered bias detection, and comprehensive error handling. Built with React/TypeScript frontend and Express/PostgreSQL backend, it features an iOS 26-inspired glassmorphism design optimized for the Replit deployment platform.

## Recent Changes (October 27, 2025)

### TRL 7 Enhancements

- **AI Neutral Summaries** (October 27, 2025): Raw news without agenda
  - HuggingFace BART model (`facebook/bart-large-cnn`) for 80-word neutral summaries
  - Prompt: "Summarize this headline neutrally, no opinion"
  - Dedicated `/api/ai/summary/:id` endpoint with caching
  - Extractive fallback (first 80 words) when API unavailable
  - Displayed in BiasAnalysisForm component with AI prediction
  - Combined with bias detection for comprehensive AI analysis

- **Multilingual Support**: Added 5 languages (English, Portuguese, Spanish, French, German)
  - Language dropdown in NavigationBar with flag icons
  - Language context provider for global state management
  - Language-specific news fetching from NewsAPI with country mapping
  - Multilingual mock data fallback (all 5 languages)
  - Separate caching per language for optimal performance
  - Geographic region filtering (German only in Europe, Portuguese in South America + Europe, etc.)

- **Enhanced Error Handling**: Comprehensive try/catch blocks across all API calls
  - Multi-source fallback: NewsAPI.org → NewsData.io → Mock Data
  - Graceful error messages ready for toast notifications
  - Smart caching (5-minute TTL) to minimize API failures
  - User-friendly error alerts when APIs are unavailable

- **Production Optimization**: Deployed for Replit public URL
  - HTTPS-only Replit Auth (localhost removed, Replit domains only)
  - Optimized for `https://[username].geonewstracker.replit.app`
  - Environment variable validation for production readiness
  - Comprehensive README with EIC demo notes

### Previous Changes
- Fixed authentication setup to use Replit domains exclusively (HTTPS required)
- Simplified navigation bar: black "Sign In" text on left, language dropdown center-left, logout icon on right
- Added ocean-colored background (#AAD3DF) to map matching water tiles
- Limited map zoom out to 50% beyond world boundaries (minZoom: 2)
- Fixed bias analysis for ephemeral location-fresh articles (negative IDs skip database persistence)
- Enhanced authentication logging for easier debugging

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS with shadcn/ui components, Radix UI primitives
- **State Management**: TanStack Query V5 (server state), React hooks (local state), Language Context
- **Map Integration**: React Leaflet
- **Build Tool**: Vite
- **UI/UX**: iOS 26-inspired glassmorphism design with premium blur effects, depth, and animations. Features include custom markers with category-specific gradients, a sliding news panel, top navigation with language selector, search bar with debouncing, and category filters.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon Database
- **Authentication**: Replit Auth with OpenID Connect (Passport.js), PostgreSQL-backed sessions (connect-pg-simple)
- **Data Storage**: Abstract layer with `DatabaseStorage` (production) and `MemStorage` (development fallback)
- **News Orchestration**: Multi-source fallback system with language support

### Key Components
- **Data Layer**: Shared TypeScript schemas using Drizzle ORM and Zod. Tables for Users, Sessions, and NewsArticles (with geographic coordinates, `userId`, `isUserCreated`, `language`).
- **Language Management**: 
  - `LanguageContext` provider for global state
  - `SupportedLanguage` type: "en" | "pt" | "es" | "fr" | "de"
  - `LANGUAGES` constant with flag icons and display names
  - LocalStorage persistence for language preference
- **Frontend Components**: 
  - Interactive Map (full-screen, custom markers)
  - News Panel (sliding, article details, loading states)
  - Navigation Bar (glassmorphism, language dropdown, auth buttons)
  - Search Bar (real-time, debouncing)
  - Action Bar (category filters: My Pins, Global, Trending, Recent)
  - Map Controls
- **API Endpoints**:
    - **News**: 
      - `GET /api/news?language=en`
      - `GET /api/news/location-fresh?lat=40&lng=-74&language=pt`
      - `GET /api/news/category/:category?language=es`
      - `GET /api/news/search?q=query&language=fr`
    - **Authentication**: 
      - `GET /api/login`
      - `GET /api/logout`
      - `GET /api/callback`
      - `GET /api/auth/user`
    - **AI**: 
      - `POST /api/ai/detect-bias` - Returns bias prediction, confidence, and 80-word neutral summary
      - `GET /api/ai/summary/:id` - Get cached neutral summary for article (checks bias analysis first)
- **Data Flow**: Client requests (React Query with language) → Server (Express) → News Orchestrator (language-aware) → NewsAPI/NewsData/Mock → PostgreSQL Cache → Client Rendering.
- **Multi-Provider News System**: 
  - Primary: NewsAPI.org (language via country mapping)
  - Fallback 1: NewsData.io
  - Fallback 2: Multilingual mock data
  - Includes news orchestrator for category detection, 5-minute caching per language, and deduplication
- **AI Features**: 
  - **Bias Detection**: `cardiffnlp/twitter-roberta-base-bias-detection` model
  - **Neutral Summaries**: `facebook/bart-large-cnn` model (80 words, no opinions)
  - Auto-apply AI bias tags (high-confidence predictions)
  - Cached AI summaries in bias analysis table
  - HuggingFace integration (free tier)
  - Extractive fallback when API unavailable

### Multilingual Architecture
```
Language Selection (UI) → LanguageContext → useNews Hooks → 
API Routes (with language param) → News Orchestrator → 
NewsAPI (country mapping) → Multilingual Mock Data → 
Cached Results (per language) → Client Display
```

**Language to Country Mapping:**
- English (en): US, GB, AU, CA, IN
- Portuguese (pt): BR, PT
- Spanish (es): ES, MX, AR, CO
- French (fr): FR, CA, BE
- German (de): DE, AT, CH

### Deployment Strategy
- **Development**: Vite server, language hot-reload, HMR, memory-based storage
- **Production**: Frontend assets built with Vite, served by Express. Backend bundled with esbuild. PostgreSQL via environment variables. Replit Auth (HTTPS only). Optimized for public Replit URL.

## External Dependencies

- **Database**: Neon PostgreSQL
- **Maps**: Leaflet.js
- **UI Components**: Radix UI, shadcn/ui
- **Form Handling**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns
- **News APIs**: NewsAPI.org (primary), NewsData.io (fallback)
- **AI Analysis**: HuggingFace Inference API (bias detection model: cardiffnlp/twitter-roberta-base-bias-detection)
- **Authentication**: Replit Auth (OpenID Connect)
- **Charts**: Chart.js (ownership visualization)

## TRL 7 Status

### Target: System Prototype Demonstration in Operational Environment

✅ **Achieved Capabilities:**
1. Multilingual news aggregation (5 languages)
2. Real-time language switching with UI dropdown
3. Geographic news distribution worldwide
4. AI-powered bias detection (free tier)
5. Comprehensive error handling with multi-source fallback
6. Production deployment optimization for Replit
7. User authentication with multiple providers
8. Database persistence with caching

✅ **Free Tier Infrastructure:**
- NewsAPI.org: 100 requests/day
- NewsData.io: 200 requests/day
- HuggingFace: Free inference API
- Replit: Free hosting + PostgreSQL database
- **Total Cost**: $0 for demonstration

### Next Steps to TRL 8+
- Scale to 10+ languages
- Expand to 10,000+ news sources
- Implement real-time fact-checking
- Add cross-platform mobile apps
- Achieve 95% bias detection accuracy

## Environment Variables

### Required
- `NEWS_API_KEY`: NewsAPI.org key
- `NEWSDATA_API_KEY`: NewsData.io key (optional with fallback)
- `HUGGINGFACE_API_KEY`: HuggingFace token for bias detection

### Optional
- `VITE_STRIPE_PUBLIC_KEY`: Stripe public key (demo works without)
- `STRIPE_SECRET_KEY`: Stripe secret key (demo works without)

### Auto-Configured (Replit)
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure session key
- `REPLIT_DOMAINS`: Deployment domains
- `REPL_ID`: Replit app identifier

## Performance Optimizations

- **Caching Strategy**: 5-minute TTL per language
- **Smart Fallback**: NewsAPI → NewsData → Mock (no errors to user)
- **Query Deduplication**: React Query prevents duplicate requests
- **Language Isolation**: Separate cache keys per language
- **Debounced Search**: 300ms delay for optimal UX
- **Lazy Loading**: News Panel slides in on demand

## Known Limitations

- NewsAPI free tier: 100 requests/day (falls back to mock data)
- NewsData.io free tier: 200 requests/day (falls back to mock data)
- HuggingFace free tier: Rate limits apply (falls back to mock analysis)
- Replit Auth: HTTPS required (no localhost support)

## Development Notes

- Always use `npm run db:push` for schema changes (never manual SQL migrations)
- Test multilingual support by switching language dropdown
- Check console logs for API fallback behavior
- Verify error handling by temporarily removing API keys
- Authentication only works on Replit domain (HTTPS), not localhost
