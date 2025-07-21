import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./newsService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all news articles
  app.get("/api/news", async (req, res) => {
    try {
      // Try to get real worldwide news first, fallback to local storage
      let articles;
      try {
        articles = await newsService.fetchWorldwideNews();
      } catch (apiError) {
        console.warn("Failed to fetch from news API, using local storage:", apiError);
        articles = await storage.getNewsArticles();
      }
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  // Create fresh news markers at clicked location (MUST be before /api/news/:id)
  app.get("/api/news/location-fresh", async (req, res) => {
    try {
      const { lat, lng, category } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      // Clear any cached results to prevent mixing
      console.log(`🗑️ Clearing cache for fresh location request at ${latitude}, ${longitude}`);
      
      let articles;
      try {
        // Get fresh news based on category if provided
        if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
          articles = await newsService.getNewsByCategory(category);
        } else {
          articles = await newsService.fetchWorldwideNews();
        }
      } catch (apiError) {
        console.warn("Failed to fetch fresh news, using local storage:", apiError);
        articles = await storage.getNewsArticles();
      }

      // Create a small set of unique news items positioned near the clicked location
      const uniqueNews = articles.slice(0, 3).map((article, index) => {
        const randomOffset = 0.05; // Small random offset
        const offsetLat = latitude + (Math.random() - 0.5) * randomOffset;
        const offsetLng = longitude + (Math.random() - 0.5) * randomOffset;
        
        return {
          ...article,
          id: Date.now() + index, // Unique ID to prevent conflicts
          latitude: offsetLat,
          longitude: offsetLng,
          location: `Custom Location ${index + 1}`
        };
      });

      console.log(`Created ${uniqueNews.length} fresh news markers at ${latitude}, ${longitude} for category: ${category || 'all'}`);
      res.json(uniqueNews);
    } catch (error) {
      console.error("Error creating location markers:", error);
      res.status(500).json({ message: "Failed to create location markers" });
    }
  });

  // Get news articles by location  
  app.get("/api/news/location", async (req, res) => {
    try {
      const { lat, lng, radius, country } = req.query;
      
      let articles;
      try {
        if (country && typeof country === 'string') {
          // Fetch news by country if provided
          articles = await newsService.getNewsByCountry(country);
        } else {
          // Get worldwide news and filter by location if coordinates provided
          articles = await newsService.fetchWorldwideNews();
          
          if (lat && lng) {
            const latitude = parseFloat(lat as string);
            const longitude = parseFloat(lng as string);
            const searchRadius = radius ? parseFloat(radius as string) : 5; // 5 degrees default
            
            if (!isNaN(latitude) && !isNaN(longitude)) {
              articles = articles.filter(article => {
                const distance = Math.sqrt(
                  Math.pow(article.latitude - latitude, 2) + 
                  Math.pow(article.longitude - longitude, 2)
                );
                return distance <= searchRadius;
              });
            }
          }
        }
      } catch (apiError) {
        console.warn("Failed to fetch location news from API, using local storage:", apiError);
        const latitude = lat ? parseFloat(lat as string) : 0;
        const longitude = lng ? parseFloat(lng as string) : 0;
        const searchRadius = radius ? parseFloat(radius as string) : 0.01;
        
        articles = await storage.getNewsArticlesByLocation(latitude, longitude, searchRadius);
      }

      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location-based news" });
    }
  });

  // Get news articles by category
  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      let articles;
      try {
        articles = await newsService.getNewsByCategory(category);
      } catch (apiError) {
        console.warn("Failed to fetch category news from API, using local storage:", apiError);
        articles = await storage.getNewsArticlesByCategory(category);
      }
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news by category" });
    }
  });

  // Get specific news article
  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid article ID" });
      }

      const article = await storage.getNewsArticle(id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count
      await storage.incrementViews(id);
      
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Search news articles
  app.get("/api/news/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      let articles;
      try {
        articles = await newsService.searchNews(q);
      } catch (apiError) {
        console.warn("Failed to search news from API, using local storage:", apiError);
        const allArticles = await storage.getNewsArticles();
        const searchTerm = q.toLowerCase();
        
        articles = allArticles.filter(article => 
          article.title.toLowerCase().includes(searchTerm) ||
          article.summary.toLowerCase().includes(searchTerm) ||
          article.location.toLowerCase().includes(searchTerm) ||
          article.category.toLowerCase().includes(searchTerm)
        );
      }

      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
