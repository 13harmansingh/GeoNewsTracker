# GeoNews - Location-Based News Application

## Overview

GeoNews is a modern, location-based news application that displays news articles on an interactive map. Users can explore news by geographic location, filter by categories, and search for specific content. The application features a mobile-first design with iOS-inspired UI components and real-time news updates.

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
- **Development**: In-memory storage fallback for development

## Key Components

### Data Layer
- **Schema**: Shared TypeScript schemas using Drizzle ORM and Zod validation
- **Tables**: Users and NewsArticles with geographic coordinates
- **Storage Interface**: Abstract storage layer with memory-based implementation for development

### Frontend Components
- **Interactive Map**: Full-screen map with custom markers for news articles
- **News Panel**: Sliding panel for article details with loading states
- **Navigation Bar**: Top navigation with glassmorphism design
- **Search Bar**: Real-time search with debouncing
- **Action Bar**: Category filters (Breaking, Local, Sports, Weather)
- **Map Controls**: Zoom and location centering controls

### API Endpoints
- `GET /api/news` - Fetch all news articles
- `GET /api/news/location` - Location-based news filtering
- `GET /api/news/category/:category` - Category-filtered news

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
- **Responsive Design**: Mobile-first approach with iOS-inspired UI
- **Real-time Updates**: Automatic news refresh every 30 seconds
- **Geolocation**: Location-based news filtering and user positioning
- **Category Filtering**: Breaking news, local, sports, and weather categories
- **Search Functionality**: Real-time search with minimum 3-character queries
- **Interactive Maps**: Custom markers with category-specific styling
- **Glassmorphism UI**: Modern translucent design elements
- **Touch Optimization**: Mobile-friendly interactions and gestures

The application prioritizes user experience with smooth animations, loading states, and responsive design patterns suitable for both mobile and desktop usage.