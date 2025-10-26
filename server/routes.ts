import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./newsService";
import { newsAPIService } from "./newsApiService";
import { biasDetectionService } from "./biasDetectionService";
import { MOCK_OWNERSHIP_DATA } from "./ownershipData";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBiasAnalysisSchema, insertWitnessReportSchema, insertEventHistorySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Initialize mock ownership data
  try {
    const existing = await storage.getAllMediaOwnership();
    if (existing.length === 0) {
      console.log("📊 Initializing media ownership data...");
      for (const ownership of MOCK_OWNERSHIP_DATA) {
        await storage.createMediaOwnership(ownership);
      }
      console.log(`✅ Initialized ${MOCK_OWNERSHIP_DATA.length} media ownership records`);
    }
  } catch (error) {
    console.error("Error initializing ownership data:", error);
  }

  app.get('/api/auth/user', async (req: any, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.json(null);
    }
    
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Helper function to try multiple news providers
  async function fetchNewsWithFallback() {
    // Try database first (already has worldwide distribution)
    try {
      const dbArticles = await storage.getNewsArticles();
      if (dbArticles && dbArticles.length > 0) {
        console.log(`✅ Using ${dbArticles.length} articles from database (worldwide distribution)`);
        return dbArticles;
      }
    } catch (dbError) {
      console.warn("Database fetch failed, trying APIs:", dbError);
    }

    // Try NewsData.io second
    try {
      const articles = await newsService.fetchWorldwideNews();
      console.log('✅ Fetched news from NewsData.io');
      return articles;
    } catch (newsDataError) {
      console.warn("NewsData.io failed, trying NewsAPI.org fallback:", newsDataError);
      
      // Try NewsAPI.org as last resort with worldwide distribution
      try {
        const newsApiArticles = await newsAPIService.getWorldwideHeadlines();
        console.log('✅ Fetched news from NewsAPI.org fallback with worldwide distribution');
        return newsApiArticles;
      } catch (newsApiError) {
        console.warn("All news sources failed:", newsApiError);
        return [];
      }
    }
  }

  // Get all news articles
  app.get("/api/news", async (req, res) => {
    try {
      const articles = await fetchNewsWithFallback();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  // Create fresh news markers at clicked location (MUST be before /api/news/:id)
  app.get("/api/news/location-fresh", async (req: any, res) => {
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

      console.log(`📍 Creating persistent pins at ${latitude}, ${longitude}`);

      let articles;
      try {
        // Get fresh news based on category if provided
        if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
          try {
            articles = await newsService.getNewsByCategory(category);
          } catch (newsDataError) {
            console.warn("NewsData.io failed, trying NewsAPI.org fallback");
            articles = await newsAPIService.getTopHeadlinesByCountry('us');
          }
        } else {
          articles = await fetchNewsWithFallback();
        }
      } catch (apiError) {
        console.warn("All APIs failed, using local storage:", apiError);
        articles = await storage.getNewsArticles();
      }

      // Get current user ID if authenticated
      const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) || null;

      // Create and save unique news items to database
      const savedArticles = [];
      for (let index = 0; index < Math.min(3, articles.length); index++) {
        const article = articles[index];
        const randomOffset = 0.05;
        const offsetLat = latitude + (Math.random() - 0.5) * randomOffset;
        const offsetLng = longitude + (Math.random() - 0.5) * randomOffset;

        // Save to database as user-created pin
        const savedArticle = await storage.createNewsArticle({
          title: article.title,
          summary: article.summary || article.title,
          content: article.content || article.summary || article.title,
          category: article.category,
          latitude: offsetLat,
          longitude: offsetLng,
          imageUrl: article.imageUrl || null,
          isBreaking: article.isBreaking || false,
          views: 0,
          location: article.location || `Location at ${offsetLat.toFixed(4)}, ${offsetLng.toFixed(4)}`,
          sourceUrl: article.sourceUrl || null,
          sourceName: article.sourceName || null,
          country: article.country || null,
          language: article.language || "en",
          externalId: article.externalId || `user-created-${Date.now()}-${index}`,
          userId: userId,
          isUserCreated: true,
        });

        savedArticles.push(savedArticle);
      }

      console.log(`✅ Saved ${savedArticles.length} persistent pins to database at ${latitude}, ${longitude}`);
      res.json(savedArticles);
    } catch (error) {
      console.error("Error creating persistent pins:", error);
      res.status(500).json({ message: "Failed to create persistent pins" });
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
          try {
            articles = await newsService.getNewsByCountry(country);
          } catch (newsDataError) {
            console.warn("NewsData.io failed, trying NewsAPI.org fallback");
            const countryCode = country.length === 2 ? country : 'us';
            articles = await newsAPIService.getTopHeadlinesByCountry(countryCode);
          }
        } else {
          // Get worldwide news and filter by location if coordinates provided
          articles = await fetchNewsWithFallback();

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
        console.warn("All APIs failed, using local storage:", apiError);
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
      
      // Handle special category: MY_PINS - only show user-created pins from database
      if (category === 'MY_PINS') {
        const allArticles = await storage.getNewsArticles();
        const userCreatedArticles = allArticles.filter(article => article.isUserCreated === true);
        return res.json(userCreatedArticles);
      }
      
      // Handle special category: GLOBAL - show all API news (not user-created)
      if (category === 'GLOBAL') {
        const allArticles = await storage.getNewsArticles();
        const apiArticles = allArticles.filter(article => article.isUserCreated === false || article.isUserCreated === null);
        return res.json(apiArticles);
      }
      
      // Handle special category: TRENDING - show most viewed
      if (category === 'TRENDING') {
        const allArticles = await storage.getNewsArticles();
        const sortedByViews = allArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
        return res.json(sortedByViews.slice(0, 20));
      }
      
      // Handle special category: RECENT - show most recent
      if (category === 'RECENT') {
        const allArticles = await storage.getNewsArticles();
        const sortedByDate = allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        return res.json(sortedByDate.slice(0, 20));
      }
      
      // For other categories, use API fallback
      let articles;
      try {
        try {
          articles = await newsService.getNewsByCategory(category);
        } catch (newsDataError) {
          console.warn("NewsData.io failed, trying NewsAPI.org fallback");
          articles = await newsAPIService.getTopHeadlinesByCountry('us');
        }
      } catch (apiError) {
        console.warn("All APIs failed, using local storage:", apiError);
        articles = await storage.getNewsArticlesByCategory(category);
      }
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news by category" });
    }
  });

  // Search news articles (MUST be before /api/news/:id)
  app.get("/api/news/search", async (req, res) => {
    try {
      const { q } = req.query;
      console.log('🔍 Search API called with query:', q);
      
      if (!q || typeof q !== 'string' || !q.trim()) {
        console.log('❌ Invalid search query, returning empty array');
        return res.json([]);
      }

      const searchQuery = q.trim();
      console.log('🔍 Processing search for:', searchQuery);

      let articles;
      try {
        articles = await newsService.searchNews(searchQuery);
        console.log('✅ Found', articles.length, 'articles from API search');
      } catch (apiError) {
        console.warn("Failed to search news from API, using local storage:", apiError);
        const allArticles = await storage.getNewsArticles();
        const searchTerm = searchQuery.toLowerCase();
        
        articles = allArticles.filter(article => 
          article.title.toLowerCase().includes(searchTerm) ||
          article.summary.toLowerCase().includes(searchTerm) ||
          article.location.toLowerCase().includes(searchTerm) ||
          article.category.toLowerCase().includes(searchTerm)
        );
        console.log('✅ Found', articles.length, 'articles from local search');
      }

      res.json(articles || []);
    } catch (error) {
      console.error('❌ Search error:', error);
      res.json([]);
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

  // NewsAPI country headlines
  app.get("/api/newsapi/country/:countryCode", async (req, res) => {
    try {
      const { countryCode } = req.params;
      const articles = await newsAPIService.getTopHeadlinesByCountry(countryCode);
      res.json(articles);
    } catch (error: any) {
      console.error("Error fetching country headlines:", error);
      res.status(500).json({ message: error.message || "Failed to fetch country headlines" });
    }
  });

  // AI bias detection endpoint
  app.post("/api/ai/detect-bias", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      const result = await biasDetectionService.detectBias(text);
      const summary = await biasDetectionService.generateNeutralSummary(text);

      res.json({
        prediction: result.prediction,
        confidence: result.confidence,
        summary
      });
    } catch (error) {
      console.error("Error detecting bias:", error);
      res.status(500).json({ message: "Failed to detect bias" });
    }
  });

  // Bias analysis endpoints
  app.get("/api/bias/:articleId", async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const analysis = await storage.getBiasAnalysis(articleId);
      res.json(analysis || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bias analysis" });
    }
  });

  app.post("/api/bias", async (req: any, res) => {
    try {
      // Get user ID if authenticated, otherwise null (demo mode)
      const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) || null;
      const data = insertBiasAnalysisSchema.parse({
        ...req.body,
        taggedBy: userId
      });
      const analysis = await storage.createBiasAnalysis(data);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating bias analysis:", error);
      res.status(400).json({ message: "Invalid bias analysis data" });
    }
  });

  app.patch("/api/bias/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.updateBiasAnalysis(id, req.body);
      res.json(analysis);
    } catch (error) {
      console.error("Error updating bias analysis:", error);
      res.status(500).json({ message: "Failed to update bias analysis" });
    }
  });

  // Media ownership endpoints
  app.get("/api/ownership/:sourceName", async (req, res) => {
    try {
      const ownership = await storage.getMediaOwnership(req.params.sourceName);
      res.json(ownership || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ownership data" });
    }
  });

  app.get("/api/ownership", async (req, res) => {
    try {
      const ownership = await storage.getAllMediaOwnership();
      res.json(ownership);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all ownership data" });
    }
  });

  // Witness reports endpoints
  app.get("/api/reports", async (req, res) => {
    try {
      const articleId = req.query.articleId ? parseInt(req.query.articleId as string) : undefined;
      const reports = await storage.getWitnessReports(articleId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch witness reports" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const data = insertWitnessReportSchema.parse(req.body);
      const report = await storage.createWitnessReport(data);
      
      await storage.createEventHistory({
        eventType: 'report',
        reportId: report.id,
        articleId: report.articleId ?? undefined,
        country: null,
        location: report.location ?? null,
        summary: `New witness report: ${report.content.substring(0, 100)}...`,
        metadata: { username: report.anonymousUsername }
      });
      
      res.json(report);
    } catch (error) {
      console.error("Error creating witness report:", error);
      res.status(400).json({ message: "Invalid witness report data" });
    }
  });

  // Event history endpoints
  app.get("/api/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getEventHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}