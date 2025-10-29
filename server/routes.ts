import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./newsService";
import { newsAPIService } from "./newsApiService";
import { gNewsService } from "./gNewsService";
import { newsOrchestrator } from "./newsOrchestrator";
import { worldNewsApi } from "./worldNewsApi";
import { biasDetectionService } from "./biasDetectionService";
import { biasJobQueue } from "./biasJobQueue";
import { biasWebSocketServer } from "./websocket";
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

  // ===== REVERSE GEOCODING =====
  
  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      console.log(`🌍 Reverse geocoding: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

      // Use free Nominatim API for reverse geocoding
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'KNEW-News-App/1.0' // Nominatim requires a user agent
        }
      });

      if (!response.ok) {
        console.warn(`Nominatim API error: ${response.status}`);
        return res.status(500).json({ message: "Reverse geocoding failed" });
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        return res.json({ 
          country: null, 
          country_code: null, 
          display_name: "Unknown location" 
        });
      }

      const countryCode = data.address.country_code?.toUpperCase() || null;
      const country = data.address.country || null;
      const displayName = data.display_name || "Unknown location";

      console.log(`✅ Reverse geocoded to: ${country} (${countryCode})`);

      res.json({
        country,
        country_code: countryCode,
        display_name: displayName,
        city: data.address.city || data.address.town || data.address.village || null,
        state: data.address.state || null
      });

    } catch (error) {
      console.error("Reverse geocoding error:", error);
      res.status(500).json({ message: "Failed to reverse geocode" });
    }
  });

  // ===== NEWS ROUTES =====

  // Helper function to get diverse, categorized news
  async function fetchNewsWithFallback(language: string = "en") {
    const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";
    
    // Try database first (with language filtering)
    try {
      const dbArticles = await storage.getNewsArticles(supportedLanguage);
      if (dbArticles && dbArticles.length > 0) {
        console.log(`✅ Using ${dbArticles.length} articles from database (language: ${supportedLanguage})`);
        return dbArticles;
      }
    } catch (dbError) {
      console.warn("Database fetch failed, trying APIs:", dbError);
    }

    // Use the news orchestrator for diverse, categorized news
    try {
      const articles = await newsOrchestrator.fetchDiverseNews(supportedLanguage);
      if (articles && articles.length > 0) {
        return articles;
      }
    } catch (error) {
      console.warn("News orchestrator failed:", error);
    }

    // Final fallback
    try {
      const fallbackArticles = await newsAPIService.getWorldwideHeadlines(supportedLanguage);
      return fallbackArticles;
    } catch (finalError) {
      console.error("All news sources failed:", finalError);
      return [];
    }
  }

  // Get all news articles with diverse categories
  app.get("/api/news", async (req, res) => {
    try {
      const language = (req.query.language as string) || "en";
      const articles = await fetchNewsWithFallback(language);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  // KNEW Global Mood Meter - Get sentiment metrics for language
  app.get("/api/sentiment", async (req, res) => {
    try {
      const language = (req.query.language as string) || "en";
      const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";
      
      console.log(`📊 Fetching KNEW Global Mood Meter for ${supportedLanguage}...`);
      
      // Get sentiment metrics from orchestrator with caching
      const sentimentMetrics = await newsOrchestrator.getSentimentMetrics(supportedLanguage);
      
      console.log(`✅ Sentiment: ${sentimentMetrics.positive}% positive, ${sentimentMetrics.neutral}% neutral, ${sentimentMetrics.negative}% negative`);
      
      res.json(sentimentMetrics);
    } catch (error) {
      console.error("Failed to fetch sentiment metrics:", error);
      res.status(500).json({ message: "Failed to fetch sentiment metrics" });
    }
  });

  // Create fresh news markers at clicked location - don't save to DB
  app.get("/api/news/location-fresh", async (req: any, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      console.log(`📍 Fetching fresh news for location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

      // Always fetch categorized news from orchestrator
      const language = (req.query.language as string) || "en";
      const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";
      let articles: any[] = [];
      
      try {
        // Try orchestrator (already categorized and deduped)
        articles = await newsOrchestrator.fetchDiverseNews(supportedLanguage);
        console.log(`📥 Orchestrator returned ${articles.length} categorized articles`);
      } catch (orchestratorError) {
        console.warn('Orchestrator failed:', orchestratorError);
      }
      
      // If orchestrator has insufficient articles (< 5), clear cache and force fresh fetch
      if (!articles || articles.length < 5) {
        console.warn(`⚠️ Orchestrator has only ${articles?.length || 0} articles, clearing cache and forcing fresh fetch`);
        newsOrchestrator.clearCache();
        
        try {
          // Re-fetch through orchestrator to ensure categorization
          articles = await newsOrchestrator.fetchDiverseNews(supportedLanguage);
          console.log(`📥 Fresh orchestrator fetch returned ${articles.length} articles`);
        } catch (refetchError) {
          console.warn('Fresh orchestrator fetch failed:', refetchError);
          articles = [];
        }
      }
      
      // Final fallback: If still < 5 articles, create guaranteed mock data
      if (!articles || articles.length < 5) {
        console.warn(`⚠️ Still only ${articles?.length || 0} articles, generating guaranteed mock data`);
        const now = Date.now();
        const mockTitles = [
          'Global Markets Show Strong Recovery',
          'Technology Innovation Transforms Healthcare',
          'Sports Championship Draws Record Viewers',
          'Major Scientific Discovery Announced',
          'International Summit Addresses Climate Change'
        ];
        const categories = ['BUSINESS', 'TECH', 'SPORTS', 'SCIENCE', 'GLOBAL'];
        const locations = [
          { name: 'New York', lat: 40.7128, lng: -74.0060 },
          { name: 'London', lat: 51.5074, lng: -0.1278 },
          { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
          { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
          { name: 'Paris', lat: 48.8566, lng: 2.3522 }
        ];
        
        articles = Array.from({ length: 5 }, (_, i) => {
          const loc = locations[i];
          // Use negative IDs for mock articles (safe integer range)
          const mockId = -(now % 1000000000 + i * 10000);
          return {
            id: mockId,
            title: mockTitles[i],
            summary: `Latest news from ${loc.name}: ${mockTitles[i]}`,
            content: `This is breaking news from ${loc.name}.`,
            category: categories[i],
            latitude: loc.lat + (Math.random() - 0.5) * 0.5,
            longitude: loc.lng + (Math.random() - 0.5) * 0.5,
            imageUrl: null,
            isBreaking: true,
            views: Math.floor(Math.random() * 500) + 100,
            publishedAt: new Date(),
            location: loc.name,
            sourceUrl: '#',
            sourceName: `${loc.name} News`,
            country: loc.name,
            language: 'en',
            externalId: `mock-fallback-${now}-${i}`,
            userId: null,
            isUserCreated: false,
          };
        });
        console.log(`✅ Generated ${articles.length} mock articles as guaranteed fallback`);
      }
      
      // Take up to 5 diverse articles and position them near the clicked location
      // Generate unique IDs to prevent duplicate markers
      // Use negative IDs for ephemeral articles to avoid conflicts with database IDs
      const locationArticles = articles.slice(0, 5).map((article, index) => {
        const randomOffset = 0.02;
        const offsetLat = latitude + (Math.random() - 0.5) * randomOffset;
        const offsetLng = longitude + (Math.random() - 0.5) * randomOffset;
        const timestamp = Date.now();
        
        // Use negative IDs for ephemeral articles (safe range: -2147483648 to -1)
        // Generate unique negative ID: -(timestamp % 1000000000 + index)
        const uniqueId = -(timestamp % 1000000000 + index * 1000);

        return {
          ...article,
          id: uniqueId, // Negative ID for ephemeral articles
          latitude: offsetLat,
          longitude: offsetLng,
          isUserCreated: false,
          userId: null,
          externalId: `location-${timestamp}-${index}`,
        };
      });

      console.log(`✅ Returning ${locationArticles.length} diverse news articles for location`);
      res.json(locationArticles);
    } catch (error) {
      console.error("Error fetching location news:", error);
      res.status(500).json({ message: "Failed to fetch location news" });
    }
  });

  // Helper: Create bias-tagged mock fallback articles
  function createBiasTaggedMockArticles(countryCode: string, language: string): any[] {
    const supportedLang = ["en", "pt", "es", "fr", "de"].includes(language) ? language : "en";
    
    const mockDataByLanguage: Record<string, Array<{ title: string; summary: string; bias: string }>> = {
      en: [
        { title: "Economic Recovery Shows Promising Signs", summary: "Recent data indicates positive economic trends.", bias: "BIAS_DETECTED" },
        { title: "Technology Advances in Healthcare Sector", summary: "Innovation brings new treatment options.", bias: "NEUTRAL" },
        { title: "International Summit Promotes Global Cooperation", summary: "World leaders gather to discuss key issues.", bias: "NEUTRAL" },
        { title: "Local Sports Team Celebrates Championship Win", summary: "Fans celebrate historic victory.", bias: "BIAS_DETECTED" },
        { title: "Environmental Initiative Gains Widespread Support", summary: "New policies aim to protect natural resources.", bias: "NEUTRAL" }
      ],
      pt: [
        { title: "Recuperação Econômica Mostra Sinais Promissores", summary: "Dados recentes indicam tendências econômicas positivas.", bias: "BIAS_DETECTED" },
        { title: "Avanços Tecnológicos no Setor de Saúde", summary: "Inovação traz novas opções de tratamento.", bias: "NEUTRAL" },
        { title: "Cúpula Internacional Promove Cooperação Global", summary: "Líderes mundiais se reúnem para discutir questões importantes.", bias: "NEUTRAL" },
        { title: "Equipe Esportiva Local Celebra Vitória do Campeonato", summary: "Torcedores celebram vitória histórica.", bias: "BIAS_DETECTED" },
        { title: "Iniciativa Ambiental Ganha Amplo Apoio", summary: "Novas políticas visam proteger recursos naturais.", bias: "NEUTRAL" }
      ],
      es: [
        { title: "Recuperación Económica Muestra Señales Prometedoras", summary: "Datos recientes indican tendencias económicas positivas.", bias: "BIAS_DETECTED" },
        { title: "Avances Tecnológicos en el Sector Salud", summary: "La innovación trae nuevas opciones de tratamiento.", bias: "NEUTRAL" },
        { title: "Cumbre Internacional Promueve Cooperación Global", summary: "Líderes mundiales se reúnen para discutir temas clave.", bias: "NEUTRAL" },
        { title: "Equipo Deportivo Local Celebra Victoria de Campeonato", summary: "Aficionados celebran victoria histórica.", bias: "BIAS_DETECTED" },
        { title: "Iniciativa Ambiental Gana Amplio Apoyo", summary: "Nuevas políticas buscan proteger recursos naturales.", bias: "NEUTRAL" }
      ],
      fr: [
        { title: "La Reprise Économique Montre des Signes Prometteurs", summary: "Les données récentes indiquent des tendances économiques positives.", bias: "BIAS_DETECTED" },
        { title: "Avancées Technologiques dans le Secteur de la Santé", summary: "L'innovation apporte de nouvelles options de traitement.", bias: "NEUTRAL" },
        { title: "Sommet International Favorise la Coopération Mondiale", summary: "Les dirigeants mondiaux se réunissent pour discuter de questions clés.", bias: "NEUTRAL" },
        { title: "L'Équipe Sportive Locale Célèbre la Victoire du Championnat", summary: "Les fans célèbrent une victoire historique.", bias: "BIAS_DETECTED" },
        { title: "Initiative Environnementale Gagne un Large Soutien", summary: "De nouvelles politiques visent à protéger les ressources naturelles.", bias: "NEUTRAL" }
      ],
      de: [
        { title: "Wirtschaftliche Erholung Zeigt Vielversprechende Anzeichen", summary: "Aktuelle Daten deuten auf positive wirtschaftliche Trends hin.", bias: "BIAS_DETECTED" },
        { title: "Technologische Fortschritte im Gesundheitssektor", summary: "Innovation bringt neue Behandlungsoptionen.", bias: "NEUTRAL" },
        { title: "Internationaler Gipfel Fördert Globale Zusammenarbeit", summary: "Weltführer treffen sich, um wichtige Themen zu diskutieren.", bias: "NEUTRAL" },
        { title: "Lokales Sportteam Feiert Meisterschaftssieg", summary: "Fans feiern historischen Sieg.", bias: "BIAS_DETECTED" },
        { title: "Umweltinitiative Gewinnt Breite Unterstützung", summary: "Neue Richtlinien zielen darauf ab, natürliche Ressourcen zu schützen.", bias: "NEUTRAL" }
      ]
    };

    const mockData = mockDataByLanguage[supportedLang] || mockDataByLanguage.en;
    
    return mockData.map((item, index) => ({
      title: item.title,
      summary: item.summary,
      content: item.summary,
      category: "GLOBAL",
      latitude: Math.random() * 180 - 90,
      longitude: Math.random() * 360 - 180,
      imageUrl: null,
      isBreaking: false,
      views: Math.floor(Math.random() * 500) + 50,
      publishedAt: new Date(),
      location: countryCode.toUpperCase(),
      sourceUrl: "#",
      sourceName: "KNEW Demo Source",
      country: countryCode,
      language: supportedLang,
      sentiment: null,
      externalId: `mock-bias-${countryCode}-${index}`,
      userId: null,
      isUserCreated: false,
      fetchedAt: new Date(),
      cacheExpiresAt: null,
    } as InsertNewsArticle));
  }

  // Get news articles by location (lat/lng-based with language filtering + robust fallback chain)
  app.get("/api/news/location", async (req, res) => {
    try {
      const { lat, lng, country } = req.query;
      const language = (req.query.language as string) || "en";
      const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";

      // Validate latitude and longitude
      const latitude = lat ? parseFloat(lat as string) : null;
      const longitude = lng ? parseFloat(lng as string) : null;

      console.log(`📍 Location request: lat=${latitude}, lng=${longitude}, country=${country}, lang=${supportedLanguage}`);

      // CACHE CHECK FIRST: Check if we have valid cached articles for this location+language
      if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
        const cachedArticles = await storage.getCachedArticlesByLocation(
          latitude,
          longitude,
          1.0, // 1 degree radius (~111km) - wider than World News API radius to catch more cache hits
          supportedLanguage
        );

        if (cachedArticles.length > 0) {
          console.log(`✅ CACHE HIT: Found ${cachedArticles.length} cached articles for ${supportedLanguage} at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          return res.json(cachedArticles);
        }

        console.log(`❌ CACHE MISS: No cached articles found, fetching from APIs...`);
      }

      // PRIMARY: World News API with location-filter (lat/lng + radius) - ONLY TRUE LOCATION-BASED API
      if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
        try {
          const result = await worldNewsApi.searchNewsByLocation({
            latitude,
            longitude,
            radius: 100, // 100km radius
            language: supportedLanguage,
            number: 20
          });

          if (result.articles && result.articles.length > 0) {
            console.log(`✅ PRIMARY SUCCESS: World News API location-filter returned ${result.articles.length} articles`);
            
            // Set cache expiry (1 hour from now)
            const cacheExpiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
            
            // Save articles to database FIRST with cache expiry to avoid foreign key errors
            for (const article of result.articles) {
              try {
                await storage.createNewsArticle({
                  ...article,
                  cacheExpiresAt
                });
              } catch (dbError) {
                // Ignore duplicate errors
                if (!(dbError instanceof Error) || !dbError.message.includes('duplicate')) {
                  console.warn(`Failed to save article to DB:`, dbError);
                }
              }
            }
            
            return res.json(result.articles);
          }
        } catch (worldNewsError) {
          console.warn(`⚠️ PRIMARY FAILED: World News API location-filter - ${worldNewsError}`);
        }
      }

      // FALLBACK 1: NewsAPI.org (country-based, no true location filtering)
      if (country && typeof country === 'string') {
        try {
          const articles = await newsAPIService.getCountryNews(country, supportedLanguage);
          if (articles && articles.length > 0) {
            console.log(`✅ FALLBACK 1 SUCCESS: NewsAPI.org (country-based) returned ${articles.length} articles`);
            
            // Set cache expiry (1 hour from now)
            const cacheExpiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
            
            // Save to database with cache expiry
            for (const article of articles) {
              try {
                await storage.createNewsArticle({
                  ...article,
                  cacheExpiresAt
                });
              } catch (dbError) {
                if (!(dbError instanceof Error) || !dbError.message.includes('duplicate')) {
                  console.warn(`Failed to save article to DB:`, dbError);
                }
              }
            }
            
            return res.json(articles);
          }
        } catch (newsApiError) {
          console.warn(`⚠️ FALLBACK 1 FAILED: NewsAPI.org - ${newsApiError}`);
        }
      }

      // FALLBACK 2: GNews.io (country-based)
      if (country && typeof country === 'string') {
        try {
          const articles = await gNewsService.getCountryNews(country, supportedLanguage);
          if (articles && articles.length > 0) {
            console.log(`✅ FALLBACK 2 SUCCESS: GNews.io returned ${articles.length} articles`);
            
            // Set cache expiry (1 hour from now)
            const cacheExpiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
            
            // Save to database with cache expiry
            for (const article of articles) {
              try {
                await storage.createNewsArticle({
                  ...article,
                  cacheExpiresAt
                });
              } catch (dbError) {
                if (!(dbError instanceof Error) || !dbError.message.includes('duplicate')) {
                  console.warn(`Failed to save article to DB:`, dbError);
                }
              }
            }
            
            return res.json(articles);
          }
        } catch (gNewsError) {
          console.warn(`⚠️ FALLBACK 2 FAILED: GNews.io - ${gNewsError}`);
        }
      }

      // FALLBACK 3: NewsData.io (worldwide)
      try {
        const articles = await newsService.fetchWorldwideNews();
        if (articles && articles.length > 0) {
          console.log(`✅ FALLBACK 3 SUCCESS: NewsData.io returned ${articles.length} articles`);
          
          // Set cache expiry (1 hour from now)
          const cacheExpiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
          
          // Save to database with cache expiry
          for (const article of articles.slice(0, 20)) {
            try {
              await storage.createNewsArticle({
                ...article,
                cacheExpiresAt
              });
            } catch (dbError) {
              if (!(dbError instanceof Error) || !dbError.message.includes('duplicate')) {
                console.warn(`Failed to save article to DB:`, dbError);
              }
            }
          }
          
          return res.json(articles.slice(0, 20));
        }
      } catch (newsDataError) {
        console.warn(`⚠️ FALLBACK 3 FAILED: NewsData.io - ${newsDataError}`);
      }

      // FINAL FALLBACK: 5 bias-tagged mock articles (EIC demo survives!)
      console.log(`🎭 ALL APIs FAILED - Using bias-tagged mock data for demo`);
      const fallbackCountry = typeof country === 'string' ? country : 'US';
      const mockArticles = createBiasTaggedMockArticles(fallbackCountry, supportedLanguage);
      
      // Save mock articles to database
      for (const article of mockArticles) {
        try {
          await storage.createNewsArticle(article);
        } catch (dbError) {
          // Ignore errors for mock data
        }
      }
      
      res.json(mockArticles);

    } catch (error) {
      console.error("Error in /api/news/location:", error);
      
      // Even if everything fails, return mock data so demo doesn't break
      const country = req.query.country;
      const fallbackCountry = typeof country === 'string' ? country : 'US';
      const language = req.query.language as string || 'en';
      const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";
      const mockArticles = createBiasTaggedMockArticles(fallbackCountry, supportedLanguage);
      res.json(mockArticles);
    }
  });

  // Get news articles by category
  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const language = (req.query.language as string) || "en";
      
      // Handle special category: MY_PINS - only show user-created pins from database
      if (category === 'MY_PINS') {
        const allArticles = await storage.getNewsArticles(language);
        const userCreatedArticles = allArticles.filter(article => article.isUserCreated === true);
        return res.json(userCreatedArticles);
      }
      
      // Handle special category: GLOBAL - show all API news (not user-created)
      if (category === 'GLOBAL') {
        const allArticles = await storage.getNewsArticles(language);
        const apiArticles = allArticles.filter(article => article.isUserCreated === false || article.isUserCreated === null);
        return res.json(apiArticles);
      }
      
      // Handle special category: TRENDING - show most viewed
      if (category === 'TRENDING') {
        const allArticles = await storage.getNewsArticles(language);
        const sortedByViews = allArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
        return res.json(sortedByViews.slice(0, 20));
      }
      
      // Handle special category: RECENT - show most recent
      if (category === 'RECENT') {
        const allArticles = await storage.getNewsArticles(language);
        const sortedByDate = allArticles.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        });
        return res.json(sortedByDate.slice(0, 20));
      }
      
      // For other categories, use API fallback
      let articles;
      try {
        try {
          articles = await newsService.getNewsByCategory(category, language);
        } catch (newsDataError) {
          console.warn("NewsData.io failed, trying NewsAPI.org fallback");
          articles = await newsAPIService.getTopHeadlinesByCountry('us');
        }
      } catch (apiError) {
        console.warn("All APIs failed, using local storage:", apiError);
        articles = await storage.getNewsArticlesByCategory(category, language);
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
      const language = (req.query.language as string) || "en";
      console.log('🔍 Search API called with query:', q);
      
      if (!q || typeof q !== 'string' || !q.trim()) {
        console.log('❌ Invalid search query, returning empty array');
        return res.json([]);
      }

      const searchQuery = q.trim();
      console.log('🔍 Processing search for:', searchQuery);

      let articles;
      try {
        articles = await newsService.searchNews(searchQuery, language);
        console.log('✅ Found', articles.length, 'articles from API search');
      } catch (apiError) {
        console.warn("Failed to search news from API, using local storage:", apiError);
        const allArticles = await storage.getNewsArticles(language);
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

  // KNEW Global Mood Meter - Get sentiment metrics for current language
  app.get("/api/sentiment", async (req, res) => {
    try {
      const { language = "en" } = req.query as { language?: string };
      const supportedLanguage = ["en", "pt", "es", "fr", "de"].includes(language) ? language as any : "en";

      console.log(`📊 Fetching KNEW Global Mood Meter for ${supportedLanguage}...`);
      
      const sentiment = await newsOrchestrator.getSentimentMetrics(supportedLanguage);
      
      console.log(`✅ Sentiment: ${sentiment.positive}% positive, ${sentiment.neutral}% neutral, ${sentiment.negative}% negative`);
      res.json(sentiment);
    } catch (error: any) {
      console.error("Sentiment fetch error:", error);
      res.status(500).json({ 
        message: "Failed to fetch sentiment",
        error: error.message 
      });
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
      const summary = await biasDetectionService.generateNeutralSummary(text, 80);

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

  // AI summary generation endpoint
  app.get("/api/ai/summary/:id", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      
      // Check if we have a cached summary in bias analysis
      const biasAnalysis = await storage.getBiasAnalysis(articleId);
      if (biasAnalysis?.aiSummary) {
        return res.json({ summary: biasAnalysis.aiSummary });
      }

      // Get article and generate summary
      const article = await storage.getNewsArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      const fullText = `${article.title}. ${article.summary || article.content || ''}`;
      const summary = await biasDetectionService.generateNeutralSummary(fullText, 80);

      res.json({ summary });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // Background job endpoints (Celery-style with BullMQ)
  app.post("/api/ai/detect-bias-async", async (req, res) => {
    try {
      const { text, articleId } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      const jobId = `bias-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const job = await biasJobQueue.addBiasJob({
        text,
        articleId,
        jobId
      });

      res.json({
        jobId: job.jobId,
        status: job.status,
        statusUrl: `/api/ai/job/${job.jobId}`
      });
    } catch (error) {
      console.error("Error queuing bias detection:", error);
      res.status(500).json({ message: "Failed to queue bias detection" });
    }
  });

  app.get("/api/ai/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = await biasJobQueue.getJobStatus(jobId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching job status:", error);
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });

  app.get("/api/ai/queue/stats", async (req, res) => {
    try {
      const stats = await biasJobQueue.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  app.get("/api/ai/metrics", async (req, res) => {
    try {
      const metrics = biasJobQueue.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
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
      
      // Check if article is ephemeral (negative ID) - don't save to database
      if (data.articleId < 0) {
        console.log(`⚡ Ephemeral article ${data.articleId} - bias analysis not persisted to database`);
        // Return a mock response for ephemeral articles
        res.json({
          id: Math.abs(data.articleId), // Return positive ID for frontend
          articleId: data.articleId,
          aiPrediction: data.aiPrediction,
          aiConfidence: data.aiConfidence,
          manualTag: data.manualTag,
          aiSummary: data.aiSummary,
          taggedBy: data.taggedBy,
          taggedAt: new Date()
        });
        return;
      }
      
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
  
  // Initialize WebSocket server for real-time bias updates
  biasWebSocketServer.initialize(httpServer);
  
  return httpServer;
}