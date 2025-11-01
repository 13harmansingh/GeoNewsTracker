# Knew - Location-Based News Application

## Overview
Knew is a professional location-based news platform showcasing TRL 7 capabilities for EIC grant. It offers worldwide news coverage with multilingual support (5 languages), AI-powered bias analysis, neutral summarization, sentiment tracking via "KNEW Global Mood Meter," and media ownership transparency. The application features scalable background job processing using BullMQ with Redis and WebSocket real-time updates. Knew demonstrates a clear business vision for delivering unbiased, globally aware news, with market potential in professional news analysis and public information sectors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS with shadcn/ui components, Radix UI primitives
- **State Management**: TanStack Query V5 (server state), React hooks (local state), Language Context
- **Map Integration**: React Leaflet
- **UI/UX**: iOS 26-inspired glassmorphism design with premium blur effects, depth, and animations. Features custom markers with category-specific gradients, a sliding news panel, top navigation with language selector, search bar with debouncing, and category filters. Interactive map allows clicking to reverse geocode and fetch country-specific news.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon Database
- **Authentication**: Replit Auth with OpenID Connect (Passport.js), PostgreSQL-backed sessions
- **News Orchestration**: Smart 3-tier fallback with quota management: **World News API** (primary: first 50 calls/day with lat/lng + radius filtering) → **NewsAPI.org** (fallback 1: 54 countries for English, language-aware) → **NewsData.io** (fallback 2: 206 countries, all 5 languages). All tiers ensure schema compliance with sentiment field. Supports Nominatim reverse geocoding (lat/lng → country code). Articles saved to database BEFORE bias analyses to prevent foreign key errors.
- **Quota Management**: PostgreSQL-backed QuotaManager with atomic quota reservation (50 calls/day limit enforced via `UPDATE ... WHERE count < limit`). Daily reset at midnight UTC. Falls back to in-memory tracking if database unavailable.
- **Background Jobs**: pg-boss with PostgreSQL backend for async bias detection and summary generation (teamSize: 3 workers for safe concurrency). Jobs return results for persistence, with automatic retry and WebSocket notifications.
- **Caching**: In-memory Map cache with 5-minute TTL for news articles (resets on app restart).
- **Real-Time**: WebSocket server at `/ws/bias-updates` for live job status notifications (queued, completed, failed).

### Key Components
- **Data Layer**: Shared TypeScript schemas using Drizzle ORM and Zod for Users, Sessions, and NewsArticles (including geographic coordinates, userId, isUserCreated, language).
- **Language Management**: `LanguageContext` provider, `SupportedLanguage` type, `LANGUAGES` constant with flag icons, and LocalStorage persistence. Supports English, Portuguese, Spanish, French, and German with specific country mappings for news fetching.
- **AI Features**:
    - **Bias Detection**: `cardiffnlp/twitter-roberta-base-bias-detection` model.
    - **Neutral Summaries**: HuggingFace BART model (`facebook/bart-large-cnn`) for 80-word neutral summaries, presented as collapsible sections.
    - **Sentiment Analysis**: Per-article sentiment scores (-1 to +1) from World News API, displayed as "KNEW Mood" badges with visual indicators.
    - Background processing for AI tasks via BullMQ, with real-time updates via WebSockets.

### Deployment Strategy
- Optimized for Replit public URL deployments, utilizing HTTPS-only Replit Auth. Frontend assets built with Vite, served by Express. Backend bundled with esbuild. PostgreSQL and Redis configurations via environment variables.

## Recent Changes (November 1, 2025)
- **Proactive Country-Level Heatmaps**: Revolutionary aggregated visualization showing all available news by country
  - Automatically groups all news articles by country with intensity-based visualization
  - Shows one heatmap per country with blue→red gradient (intensity = article count)
  - Clicking country heatmap opens drawer with all articles for that country (no API fetch required)
  - Replaces reactive "click to fetch" with proactive "all news already visible" paradigm
  - Uses CountryAggregation utility to extract country from location, calculate center, and normalize intensity
- **Multi-Heatmap System with Smart Caching**: Revolutionary persistent visualization with zero redundant fetches
  - **Global Heatmap** (red→yellow): Shows all current news, clickable to display nearby articles instantly (no fetch)
  - **Country Heatmaps** (blue→red): Aggregated view of all available news grouped by country
  - **Fetched Zone Heatmaps** (blue→cyan): Location-based fetches create persistent colored overlays
  - **LocalStorage Caching**: All fetched zones saved to browser with 24-hour auto-expiry
  - **Instant Restore**: Page refreshes reload all cached heatmaps without re-fetching
  - **Multi-Layer Rendering**: Global, country, and all fetched zones visible simultaneously for rich geographic context
  - Zones deduplicated by country + language to prevent redundant storage
- **Enhanced Search Experience**: Multi-keyword AND logic with static map visualization
  - Search splits keywords by space or comma, finds articles containing ALL keywords
  - Searches across title, summary, content, location, and category fields
  - Map and heatmaps remain static during search - only article list updates
  - Prevents confusing map state changes when user is just looking for specific articles
- **Read-Only AI Bias Predictions**: Removed manual bias tagging UI, predictions now display-only
  - Users can no longer manually tag articles with bias - only AI predictions shown
  - Removed error popups for bias saves - cleaner UX focused on analysis consumption
  - Added sentiment explanation tooltips to help users understand mood scores

## Previous Changes (October 31, 2025)
- **Major Performance Overhaul**: Dramatically improved site speed and responsiveness
  - Added database indexes on language, lat/lng, publishedAt, and composite language+publishedAt for 10x faster queries
  - Optimized database queries with SQL WHERE, ORDER BY DESC, and LIMIT (100 articles max) instead of in-memory filtering
  - Implemented React Query caching (5-minute staleTime, 10-minute gcTime) to eliminate duplicate API calls
  - Database queries now take ~50ms instead of 200-250ms
- **Snapchat-Style Heatmap Visualization**: Replaced individual point markers with organic heat blobs
  - Red (high news density) → yellow (low density) gradient for intuitive visualization
  - Large radius (35px) with high blur (25px) creates smooth, organic shapes
  - Interactive click support to open nearest article within 50km radius
  - Dramatically faster rendering (1 heatmap layer vs 20+ individual markers)
  - Works for both global news display and location-specific fetches
- **Fixed quota reset bug**: Quota manager now properly resets World News API quota at midnight UTC (was accumulating indefinitely)

## Previous Changes (October 30, 2025)
- **Migrated from Redis to PostgreSQL** (critical): Eliminated Redis quota limits (500k request cap) by migrating background job processing from BullMQ to pg-boss and quota tracking to PostgreSQL
- **PostgreSQL-backed job queue**: pg-boss now handles all background AI processing (bias detection + neutral summaries) with teamSize: 3 for safe concurrency, job result persistence, and WebSocket notifications
- **Atomic quota management**: QuotaManager uses PostgreSQL table with atomic `UPDATE ... WHERE count < limit` to prevent race conditions. Daily reset at midnight UTC. Survives app restarts.
- **Reduced job concurrency**: Lowered from 50 to 3 workers for safer resource usage and better database performance
- **AI result persistence**: Bias analyses now saved to database for cache hits, preventing redundant HuggingFace API calls
- **In-memory caching**: News cache now uses Map (5-minute TTL) instead of Redis - acceptable for single-instance deployments
- **Fixed seamless API fallback chain**: newsOrchestrator now properly passes language parameter through full fallback: World News API → NewsAPI.org → NewsData.io, ensuring all 5 languages work at every tier
- **Added mobile search button**: Search bar now shows blue arrow button for submitting searches (previously only had clear X button)
- **Expanded English to 54 countries worldwide**: NewsAPI.org now fetches from ALL supported countries (ae, ar, at, au, be, bg, br, ca, ch, cn, co, cu, cz, de, eg, fr, gb, gr, hk, hu, id, ie, il, in, it, jp, kr, lt, lv, ma, mx, my, ng, nl, no, nz, ph, pl, pt, ro, rs, ru, sa, se, sg, si, sk, th, tr, tw, ua, us, ve, za) covering all 7 continents
- **Fixed data integrity**: All news articles now preserve real `publishedAt` timestamps from source APIs (not defaulting to NOW())
- **Fixed router**: Added `/map` route so map page is accessible at correct URL
- **Created comprehensive blueprint**: `KNEW_APPLICATION_BLUEPRINT.md` documents complete architecture, API endpoints, data flows, and TRL 7 readiness
- **Schema improvement**: Made `publishedAt` optional in `insertNewsArticleSchema` to allow APIs to provide real publish dates while maintaining backward compatibility

## External Dependencies

- **Database**: Neon PostgreSQL (for data persistence, sessions, job queue, and quota tracking)
- **Job Queue**: pg-boss (PostgreSQL-based background job processing)
- **Maps**: Leaflet.js, Nominatim API (OpenStreetMap) for reverse geocoding
- **UI Components**: Radix UI, shadcn/ui
- **Form Handling**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns
- **News APIs**: World News API with location-filter (primary: first 50 calls/day with true lat/lng + radius filtering), NewsAPI.org (fallback 1: **54 countries for English** - TRUE worldwide coverage across all continents), NewsData.io (fallback 2: 206 countries, all 5 languages)
- **AI Analysis**: HuggingFace Inference API (for bias detection and neutral summaries)
- **Authentication**: Replit Auth (OpenID Connect)