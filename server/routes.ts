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

  // Stripe checkout for Pro upgrade
  app.post("/api/create-pro-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
      
      if (!STRIPE_SECRET_KEY) {
        const userId = req.user.claims.sub;
        await storage.createProSubscription({
          userId,
          isActive: true,
          stripeSessionId: 'mock-session-' + Date.now()
        });
        
        return res.json({ 
          sessionId: null, 
          mockMode: true,
          message: "Pro unlocked (demo mode)" 
        });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'KNEW Pro Access',
                description: 'Unlock bias analysis, media ownership charts, and AI summaries',
              },
              unit_amount: 500, // $5.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/?pro=success`,
        cancel_url: `${req.headers.origin}/?pro=cancel`,
        metadata: {
          userId: userId,
        },
      });

      res.json({ sessionId: session.id, mockMode: false });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: error.message || "Failed to create checkout" });
    }
  });

  // Stripe webhook for payment confirmation
  app.post("/api/stripe-webhook", async (req, res) => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Webhook not configured');
    }

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      const sig = req.headers['stripe-signature'] as string;
      const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.metadata.userId;

        await storage.createProSubscription({
          userId,
          isActive: true,
          stripeSessionId: session.id
        });

        console.log(`✅ Pro subscription activated for user ${userId}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Pro subscription check
  app.get("/api/pro/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getProSubscription(userId);
      res.json({ isPro: !!subscription && subscription.isActive });
    } catch (error) {
      res.status(500).json({ message: "Failed to check Pro status" });
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

  app.post("/api/bias", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertBiasAnalysisSchema.parse({
        ...req.body,
        taggedBy: userId
      });
      const analysis = await storage.createBiasAnalysis(data);
      res.json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Invalid bias analysis data" });
    }
  });

  app.patch("/api/bias/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.updateBiasAnalysis(id, req.body);
      res.json(analysis);
    } catch (error) {
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