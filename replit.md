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
- **News Orchestration**: True location-based news with 4-tier fallback chain: **World News API with location-filter** (primary: lat/lng + 100km radius + language) → NewsAPI.org (fallback 1: country+language) → GNews.io (fallback 2: country+language) → NewsData.io (fallback 3: worldwide) → Bias-tagged mock articles (final fallback). All tiers ensure schema compliance with sentiment field. Supports Nominatim reverse geocoding (lat/lng → country code). Articles saved to database BEFORE bias analyses to prevent foreign key errors.
- **Background Jobs**: BullMQ + Redis for async bias detection and summary generation (concurrency=50, 100 jobs/sec rate limit, automatic retry, exponential backoff).
- **Caching**: Redis layer with 5-minute TTL for news articles and AI results, using language-specific cache keys.
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

## External Dependencies

- **Database**: Neon PostgreSQL
- **Maps**: Leaflet.js, Nominatim API (OpenStreetMap) for reverse geocoding
- **UI Components**: Radix UI, shadcn/ui
- **Form Handling**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns
- **News APIs**: World News API with location-filter (primary: true lat/lng + radius filtering), NewsAPI.org (fallback 1: country-based), GNews.io (fallback 2: country-based), NewsData.io (fallback 3: worldwide), bias-tagged mock data (final fallback ensures demo never breaks)
- **AI Analysis**: HuggingFace Inference API (for bias detection and neutral summaries)
- **Authentication**: Replit Auth (OpenID Connect)