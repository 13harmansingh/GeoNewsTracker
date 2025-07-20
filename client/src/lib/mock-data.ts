import type { NewsArticle } from "@shared/schema";

export const mockNewsData: NewsArticle[] = [
  {
    id: 1,
    title: "Major Infrastructure Development Announced",
    summary: "City officials have announced a significant infrastructure project that will transform the downtown area with new transit lines and public spaces.",
    content: "The comprehensive infrastructure development plan includes new subway lines, expanded bus routes, and the creation of several public parks. The project is expected to be completed over the next three years, with an investment of $2.5 billion. Mayor Johnson emphasized that this initiative will create thousands of jobs and significantly improve the quality of life for residents. The first phase will begin construction next month, focusing on the central transit hub.",
    category: "BREAKING",
    latitude: 40.7589,
    longitude: -73.9851,
    imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    isBreaking: true,
    views: 1200,
    publishedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    location: "Downtown Manhattan"
  },
  {
    id: 2,
    title: "New Community Center Opens",
    summary: "The long-awaited community center has officially opened its doors to residents with state-of-the-art facilities and programs.",
    content: "The new community center features a gymnasium, library, computer lab, and meeting rooms. It will serve as a hub for local activities and programs including youth sports, senior citizen activities, and educational workshops. The facility cost $15 million to build and was funded through a combination of city funds and community donations.",
    category: "LOCAL",
    latitude: 40.7505,
    longitude: -73.9934,
    imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    isBreaking: false,
    views: 850,
    publishedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    location: "Chelsea"
  },
  {
    id: 3,
    title: "Traffic Pattern Changes Downtown",
    summary: "New traffic flow improvements are being implemented to reduce congestion and improve pedestrian safety in the business district.",
    content: "The changes include new bike lanes, adjusted traffic light timing, and improved crosswalk signals. The initiative aims to reduce commute times by 15% and make the area more pedestrian-friendly. The Department of Transportation has been working on this project for over a year, conducting extensive traffic studies.",
    category: "CIVIC",
    latitude: 40.7614,
    longitude: -73.9776,
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    isBreaking: false,
    views: 650,
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    location: "Midtown East"
  },
  {
    id: 4,
    title: "Local Team Advances to Championships",
    summary: "The city's professional team has secured their spot in the upcoming championship series after a decisive victory last night.",
    content: "In a thrilling match that went into overtime, the team demonstrated exceptional skill and teamwork. The championship series begins next month, and tickets are already selling fast. Coach Martinez praised the team's dedication and hard work throughout the season.",
    category: "SPORTS",
    latitude: 40.7282,
    longitude: -73.7949,
    imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    isBreaking: false,
    views: 2100,
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    location: "Queens"
  }
];
