# Knew - Location-Based News Application

## Overview

Knew is a modern, location-based news application that displays news articles on an interactive map. Users can explore news by geographic location, filter by categories, and search for specific content. The application features a mobile-first design with iOS-inspired UI components and real-time news updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Library**: Custom components built on Radix UI primitives
- **Map Integration**: React Leaflet for interactive maps
- **Build Tool**: Vite with TypeScript support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Authentication**: Replit Auth with OpenID Connect (Passport.js)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Development**: In-memory storage fallback for development

## Key Components

### Data Layer
- **Schema**: Shared TypeScript schemas using Drizzle ORM and Zod validation
- **Tables**: 
  - Users (varchar ID with UUID for Replit Auth)
  - Sessions (for session storage)
  - NewsArticles with geographic coordinates
- **Storage Interface**: Abstract storage layer with dual implementation:
  - DatabaseStorage for production (when DATABASE_URL is available)
  - MemStorage for development (fallback when database not configured)

### Frontend Components
- **Interactive Map**: Full-screen map with custom markers for news articles
- **News Panel**: Sliding panel for article details with loading states
- **Navigation Bar**: Top navigation with glassmorphism design
- **Search Bar**: Real-time search with debouncing
- **Action Bar**: Category filters (Breaking, Local, Sports, Weather)
- **Map Controls**: Zoom and location centering controls

### API Endpoints
**News Endpoints:**
- `GET /api/news` - Fetch all news articles
- `GET /api/news/location` - Location-based news filtering
- `GET /api/news/category/:category` - Category-filtered news

**Authentication Endpoints:**
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/logout` - Logout and end session
- `GET /api/callback` - OAuth callback handler
- `GET /api/auth/user` - Get current authenticated user (protected)

## Data Flow

1. **Client Request**: React Query manages API requests with automatic caching and refetching
2. **Server Processing**: Express routes handle requests and interact with storage layer
3. **Data Storage**: PostgreSQL database accessed through Drizzle ORM
4. **Response**: JSON data returned with appropriate HTTP status codes
5. **Client Rendering**: Components update automatically via React Query's reactive updates

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL with connection pooling
- **Maps**: Leaflet.js for map rendering and interaction
- **UI Components**: Radix UI primitives for accessibility
- **Form Handling**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns for date formatting and manipulation

### Development Tools
- **Database Migrations**: Drizzle Kit for schema management
- **Development Server**: Vite with HMR and error overlay
- **TypeScript**: Full type safety across frontend and backend
- **Replit Integration**: Custom plugins for development environment

## Deployment Strategy

### Development Environment
- Uses Vite development server with middleware mode
- Memory-based storage for rapid prototyping
- Hot module replacement for frontend components
- Concurrent frontend and backend development

### Production Build
- **Frontend**: Static assets built with Vite and served by Express
- **Backend**: Bundled with esbuild for optimized Node.js execution
- **Database**: PostgreSQL connection via environment variables
- **Environment**: Production-ready Express server serving both API and static files

### Key Features
- **Real NewsData.io Integration**: Live worldwide news from authentic sources with source links
- **Enhanced Glassmorphism**: iOS 26-inspired design with premium blur effects and depth
- **Interactive Area News**: Click anywhere on map to fetch news from that location
- **Proper Geographic Positioning**: Accurate country/city-based news placement on map
- **Source Link Functionality**: Direct links to original news articles in new tabs
- **Infinite Map Prevention**: Bounded map view to prevent endless scrolling
- **Category Filtering**: Breaking news, local, sports, weather with real API data
- **Search Functionality**: Real-time worldwide news search with NewsData.io
- **Location-based News**: Click map areas to discover regional news coverage
- **Mobile-first Design**: Touch-optimized iOS-style interactions and controls

## Recent Changes

### October 9, 2025 - Authentication Integration
- ✅ Integrated Replit Auth with OpenID Connect for user authentication
- ✅ Added session management with PostgreSQL-backed sessions
- ✅ Implemented conditional auth setup - gracefully handles missing environment variables
- ✅ Created landing page for unauthenticated users
- ✅ Added logout functionality to navigation bar
- ✅ Implemented dual storage system - DatabaseStorage with MemStorage fallback
- ✅ Updated database schema with users and sessions tables for auth
- ✅ Added useAuth React hook for authentication state management

**Authentication Flow:**
- Logged-out users see a landing page with login button
- Logged-in users access the interactive news map
- Sessions stored in PostgreSQL for persistence
- Graceful fallback when auth environment variables not configured

### July 21, 2025 - News API Integration
- ✅ Integrated NewsData.io API for authentic worldwide news coverage
- ✅ Fixed source URL functionality with proper error handling and visual states
- ✅ Added click-to-fetch area news with geographic coordinate system
- ✅ Improved news positioning accuracy using real country/city coordinates
- ✅ Prevented infinite map repetition with proper bounds and noWrap settings
- ✅ Enhanced glassmorphism effects with deeper blur and shadow depth
- ✅ Updated UI positioning for premium, professional appearance
- ✅ Added fallback system that gracefully handles API rate limits

The application now provides authentic global news coverage with user authentication, proper source attribution, and external link functionality.