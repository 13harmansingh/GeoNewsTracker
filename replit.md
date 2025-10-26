# Knew - Location-Based News Application

## Overview
Knew is a modern, location-based news application that displays news articles on an interactive map. Users can explore news by geographic location, filter by categories, and search for specific content. The application features a mobile-first design with iOS-inspired UI components and real-time news updates from authentic sources like NewsData.io. It aims to provide a seamless and engaging news discovery experience, with a focus on geographic relevance and user interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **Styling**: Tailwind CSS with shadcn/ui components, Radix UI primitives
- **State Management**: TanStack Query (server state), React hooks (local state)
- **Map Integration**: React Leaflet
- **Build Tool**: Vite
- **UI/UX**: iOS 26-inspired light mode glassmorphism design with premium blur effects, depth, and animations. Features include custom markers with category-specific gradients, a sliding news panel, top navigation, search bar with debouncing, and category filters.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon Database
- **Authentication**: Replit Auth with OpenID Connect (Passport.js), PostgreSQL-backed sessions (connect-pg-simple)
- **Data Storage**: Abstract layer with `DatabaseStorage` (production) and `MemStorage` (development fallback)

### Key Components
- **Data Layer**: Shared TypeScript schemas using Drizzle ORM and Zod. Tables for Users, Sessions, and NewsArticles (with geographic coordinates, `userId`, `isUserCreated`).
- **Frontend Components**: Interactive Map (full-screen, custom markers), News Panel (sliding, article details, loading states), Navigation Bar (glassmorphism), Search Bar (real-time, debouncing), Action Bar (category filters: My Pins, Global, Trending, Recent), Map Controls.
- **API Endpoints**:
    - **News**: `GET /api/news`, `GET /api/news/location`, `GET /api/news/category/:category`
    - **Authentication**: `GET /api/login`, `GET /api/logout`, `GET /api/callback`, `GET /api/auth/user`
- **Data Flow**: Client requests (React Query) -> Server (Express) -> Data Storage (PostgreSQL via Drizzle ORM) -> JSON Response -> Client Rendering.
- **Multi-Provider News System**: Primary: NewsData.io, Fallback 1: NewsAPI.org, Fallback 2: PostgreSQL database. Includes a news orchestrator for category detection, 5-minute caching, and deduplication.
- **AI Features**: Auto-apply AI bias tags (high-confidence predictions), cached AI summaries.

### Deployment Strategy
- **Development**: Vite server, memory-based storage, HMR.
- **Production**: Frontend assets built with Vite, served by Express. Backend bundled with esbuild. PostgreSQL via environment variables.

## External Dependencies

- **Database**: Neon PostgreSQL
- **Maps**: Leaflet.js
- **UI Components**: Radix UI
- **Form Handling**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns
- **News APIs**: NewsData.io, NewsAPI.org
- **Authentication**: Replit Auth