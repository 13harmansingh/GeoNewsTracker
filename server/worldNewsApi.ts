import type { NewsArticle, InsertNewsArticle } from '@shared/schema';

const WORLDNEWS_API_KEY = process.env.WORLDNEWS_API_KEY || '';
const BASE_URL = 'https://api.worldnewsapi.com';

interface WorldNewsArticle {
  title: string;
  text?: string;
  summary?: string;
  url: string;
  image?: string;
  publish_date: string;
  author?: string;
  sentiment: number;
  language: string;
  source_country?: string;
}

interface WorldNewsResponse {
  news: WorldNewsArticle[];
  available: number;
}

export interface SentimentMetrics {
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  totalArticles: number;
}

const COUNTRY_MAPPING: Record<string, string> = {
  'en': 'gb,us,au,ca', // English: UK, US, Australia, Canada
  'pt': 'br,pt', // Portuguese: Brazil, Portugal
  'es': 'es,mx,ar', // Spanish: Spain, Mexico, Argentina
  'fr': 'fr,ca,be', // French: France, Canada, Belgium
  'de': 'de,at,ch' // German: Germany, Austria, Switzerland
};

const LANGUAGE_TO_SEARCH_TERMS: Record<string, string> = {
  'en': 'United Kingdom OR United States OR breaking news',
  'pt': 'Brasil OR Portugal OR notícias',
  'es': 'España OR México OR noticias',
  'fr': 'France OR nouvelles',
  'de': 'Deutschland OR Nachrichten'
};

export class WorldNewsApiService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || WORLDNEWS_API_KEY;
  }

  async searchNewsByLocation(params: {
    latitude: number;
    longitude: number;
    radius?: number; // in kilometers
    language?: string;
    number?: number;
  }): Promise<{ articles: InsertNewsArticle[]; sentiment: SentimentMetrics }> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ WORLDNEWS_API_KEY not configured, using mock data');
        return this.getMockNews(params.language || 'en');
      }

      const radius = params.radius || 50; // Default 50km radius
      const language = params.language || 'en';
      
      const queryParams = new URLSearchParams({
        'api-key': this.apiKey,
        'location-filter': `${params.latitude},${params.longitude},${radius}`,
        language: language,
        number: String(params.number || 20),
        sort: 'publish-time',
        'sort-direction': 'DESC'
      });

      const url = `${BASE_URL}/search-news?${queryParams.toString()}`;
      console.log(`📍 Fetching location-based news (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}, ${radius}km) in ${language.toUpperCase()}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 402) {
          console.warn('⚠️ World News API credit limit reached');
        }
        throw new Error(`World News API error: ${response.status} ${response.statusText}`);
      }

      const data: WorldNewsResponse = await response.json();

      if (!data.news || data.news.length === 0) {
        console.log(`ℹ️ No location-specific news found, falling back to country-based search`);
        throw new Error('No location-specific articles found');
      }

      // Convert to NewsArticle format with actual coordinates
      const articles = this.convertToNewsArticlesWithLocation(
        data.news, 
        language,
        params.latitude,
        params.longitude,
        radius
      );
      const sentiment = this.calculateSentiment(data.news);

      console.log(`✅ World News API returned ${articles.length} location-based articles`);

      return { articles, sentiment };
    } catch (error: any) {
      console.error('❌ World News API location search error:', error.message);
      throw error; // Propagate to allow fallback chain
    }
  }

  async searchNews(params: {
    text?: string;
    language?: string;
    country?: string;
    number?: number;
  }): Promise<{ articles: InsertNewsArticle[]; sentiment: SentimentMetrics }> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ WORLDNEWS_API_KEY not configured, using mock data');
        return this.getMockNews(params.language || 'en');
      }

      const queryParams = new URLSearchParams({
        'api-key': this.apiKey,
        language: params.language || 'en',
        number: String(params.number || 5),
        sort: 'publish-time',
        'sort-direction': 'DESC'
      });

      // Add semantic search for better geo-matching
      if (params.text) {
        queryParams.append('text', params.text);
      } else if (params.language) {
        // Use country-specific search terms for better geo-matching
        const searchTerm = LANGUAGE_TO_SEARCH_TERMS[params.language] || 'breaking news';
        queryParams.append('text', searchTerm);
      }

      // Add country filter for geo-matching
      if (params.country) {
        queryParams.append('source-countries', params.country);
      } else if (params.language && COUNTRY_MAPPING[params.language]) {
        queryParams.append('source-countries', COUNTRY_MAPPING[params.language]);
      }

      const url = `${BASE_URL}/search-news?${queryParams.toString()}`;
      console.log(`🌍 Fetching from World News API: ${url.replace(this.apiKey, 'REDACTED')}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`World News API error: ${response.status} ${response.statusText}`);
      }

      const data: WorldNewsResponse = await response.json();

      // Convert to NewsArticle format and calculate sentiment
      const articles = this.convertToNewsArticles(data.news, params.language || 'en');
      const sentiment = this.calculateSentiment(data.news);

      console.log(`✅ World News API returned ${articles.length} articles with ${sentiment.positive}% positive sentiment`);

      return { articles, sentiment };
    } catch (error: any) {
      console.error('❌ World News API error:', error.message);
      console.log('📦 Falling back to mock data');
      return this.getMockNews(params.language || 'en');
    }
  }

  private convertToNewsArticlesWithLocation(
    worldNewsArticles: WorldNewsArticle[], 
    language: string,
    centerLat: number,
    centerLng: number,
    radiusKm: number
  ): InsertNewsArticle[] {
    return worldNewsArticles.map((article, index) => {
      // Distribute articles within the radius
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const distance = Math.random() * radiusKm;
      
      // Convert km to degrees (approximate)
      const latOffset = (distance / 111) * Math.cos(angle);
      const lngOffset = (distance / (111 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
      
      return {
        title: article.title,
        summary: article.summary || article.text?.substring(0, 200) || '',
        content: article.text || article.summary || '',
        category: this.determineCategory(article.title),
        latitude: centerLat + latOffset,
        longitude: centerLng + lngOffset,
        imageUrl: article.image || null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: article.url,
        sourceName: this.extractSource(article.url),
        country: article.source_country || null,
        language: language,
        externalId: `worldnews-${Date.now()}-${index}`,
        userId: null,
        isUserCreated: false,
        sentiment: article.sentiment,
        fetchedAt: new Date(),
        cacheExpiresAt: null,
      };
    });
  }

  private convertToNewsArticles(worldNewsArticles: WorldNewsArticle[], language: string): InsertNewsArticle[] {
    return worldNewsArticles.map((article, index) => ({
      title: article.title,
      summary: article.summary || article.text?.substring(0, 200) || '',
      content: article.text || article.summary || '',
      category: this.determineCategory(article.title),
      latitude: this.getRandomLatitude(language),
      longitude: this.getRandomLongitude(language),
      imageUrl: article.image || null,
      isBreaking: false,
      publishedAt: new Date(article.publish_date), // Preserve real publish timestamp from source
      location: this.getLocationName(language),
      sourceUrl: article.url,
      sourceName: this.extractSource(article.url),
      country: article.source_country || null,
      language: language,
      externalId: article.id?.toString() || null,
      userId: null,
      isUserCreated: false,
      sentiment: article.sentiment,
      fetchedAt: new Date(),
      cacheExpiresAt: null,
    }));
  }

  private getLocationName(language: string): string {
    const locations: Record<string, string> = {
      'en': 'United Kingdom',
      'pt': 'Brasil',
      'es': 'España',
      'fr': 'France',
      'de': 'Deutschland'
    };
    return locations[language] || 'Global';
  }

  private extractSource(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Map common domains to readable names
      const sourceMap: Record<string, string> = {
        'bbc.com': 'BBC',
        'bbc.co.uk': 'BBC',
        'cnn.com': 'CNN',
        'aljazeera.com': 'Al Jazeera',
        'reuters.com': 'Reuters',
        'theguardian.com': 'The Guardian',
        'nytimes.com': 'New York Times',
        'washingtonpost.com': 'Washington Post'
      };

      return sourceMap[domain] || domain.split('.')[0].toUpperCase();
    } catch {
      return 'World News';
    }
  }

  private determineCategory(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.match(/tech|ai|digital|innovation|silicon|software|crypto|bitcoin/)) {
      return 'TECH';
    } else if (titleLower.match(/sport|football|soccer|basketball|tennis|olympic|championship/)) {
      return 'SPORTS';
    } else if (titleLower.match(/business|economy|market|stock|finance|trade|gdp/)) {
      return 'BUSINESS';
    } else if (titleLower.match(/health|medical|hospital|vaccine|covid|disease/)) {
      return 'HEALTH';
    } else if (titleLower.match(/climate|environment|green|carbon|renewable|pollution/)) {
      return 'ENVIRONMENT';
    } else {
      return 'GLOBAL';
    }
  }

  calculateSentiment(articles: WorldNewsArticle[]): SentimentMetrics {
    if (!articles || articles.length === 0) {
      return {
        positive: 0,
        neutral: 0,
        negative: 0,
        averageScore: 0,
        totalArticles: 0
      };
    }

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let totalScore = 0;

    articles.forEach(article => {
      const sentiment = article.sentiment || 0;
      totalScore += sentiment;

      if (sentiment > 0.1) {
        positiveCount++;
      } else if (sentiment < -0.1) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    const total = articles.length;
    return {
      positive: Math.round((positiveCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      averageScore: parseFloat((totalScore / total).toFixed(2)),
      totalArticles: total
    };
  }

  // Geographic coordinates for different language regions
  private getRandomLatitude(language: string): number {
    const ranges: Record<string, [number, number]> = {
      'en': [51, 54], // UK
      'pt': [-23, -22], // Brazil (São Paulo)
      'es': [40, 41], // Spain (Madrid)
      'fr': [48, 49], // France (Paris)
      'de': [52, 53] // Germany (Berlin)
    };
    
    const [min, max] = ranges[language] || [48, 52];
    return min + Math.random() * (max - min);
  }

  private getRandomLongitude(language: string): number {
    const ranges: Record<string, [number, number]> = {
      'en': [-1, 0], // UK (London)
      'pt': [-46, -45], // Brazil (São Paulo)
      'es': [-3, -4], // Spain (Madrid)
      'fr': [2, 3], // France (Paris)
      'de': [13, 14] // Germany (Berlin)
    };
    
    const [min, max] = ranges[language] || [2, 3];
    return min + Math.random() * (max - min);
  }

  private getMockNews(language: string): { articles: InsertNewsArticle[]; sentiment: SentimentMetrics } {
    const mockArticles: InsertNewsArticle[] = [
      {
        title: language === 'de' ? 'Deutsche Innovation führt zu Durchbruch' : 'Global Markets Show Strong Recovery',
        summary: language === 'de' ? 'Neue Technologie revolutioniert Industrie' : 'Stock markets rally as economic indicators improve',
        content: language === 'de' ? 'Deutsche Unternehmen präsentieren bahnbrechende Technologie...' : 'Financial markets worldwide are experiencing...',
        category: 'BUSINESS',
        latitude: this.getRandomLatitude(language),
        longitude: this.getRandomLongitude(language),
        imageUrl: null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: 'https://example.com/mock-1',
        sourceName: language === 'de' ? 'Deutsche Welle' : 'BBC',
        country: null,
        language,
        externalId: null,
        userId: null,
        isUserCreated: false,
        sentiment: 0.75,
        fetchedAt: new Date(),
        cacheExpiresAt: null,
      },
      {
        title: language === 'de' ? 'Klimagipfel erzielt Einigung' : 'Climate Summit Reaches Agreement',
        summary: language === 'de' ? 'Internationale Gemeinschaft einigt sich auf neue Ziele' : 'World leaders commit to emission targets',
        content: language === 'de' ? 'Nach intensiven Verhandlungen...' : 'Following intense negotiations...',
        category: 'ENVIRONMENT',
        latitude: this.getRandomLatitude(language),
        longitude: this.getRandomLongitude(language),
        imageUrl: null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: 'https://example.com/mock-2',
        sourceName: language === 'de' ? 'Süddeutsche Zeitung' : 'CNN',
        country: null,
        language,
        externalId: null,
        userId: null,
        isUserCreated: false,
        sentiment: 0.45,
        fetchedAt: new Date(),
        cacheExpiresAt: null,
      },
      {
        title: language === 'de' ? 'Technologie-Sektor wächst weiter' : 'Tech Sector Continues Growth',
        summary: language === 'de' ? 'Starke Quartalszahlen übertreffen Erwartungen' : 'Strong quarterly results exceed expectations',
        content: language === 'de' ? 'Der Technologiesektor zeigt...' : 'The technology sector demonstrates...',
        category: 'TECH',
        latitude: this.getRandomLatitude(language),
        longitude: this.getRandomLongitude(language),
        imageUrl: null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: 'https://example.com/mock-3',
        sourceName: language === 'de' ? 'Handelsblatt' : 'Al Jazeera',
        country: null,
        language,
        externalId: null,
        userId: null,
        isUserCreated: false,
        sentiment: 0.60,
        fetchedAt: new Date(),
        cacheExpiresAt: null,
      },
      {
        title: language === 'de' ? 'Gesundheitswesen vor Herausforderungen' : 'Healthcare Faces Challenges',
        summary: language === 'de' ? 'Experten diskutieren Zukunft der Versorgung' : 'Experts discuss future of care delivery',
        content: language === 'de' ? 'Das Gesundheitssystem...' : 'The healthcare system...',
        category: 'HEALTH',
        latitude: this.getRandomLatitude(language),
        longitude: this.getRandomLongitude(language),
        imageUrl: null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: 'https://example.com/mock-4',
        sourceName: language === 'de' ? 'FAZ' : 'Reuters',
        country: null,
        language,
        externalId: null,
        userId: null,
        isUserCreated: false,
        sentiment: -0.20,
        fetchedAt: new Date(),
        cacheExpiresAt: null,
      },
      {
        title: language === 'de' ? 'Sportliche Erfolge feiern' : 'Athletic Achievements Celebrated',
        summary: language === 'de' ? 'Nationale Teams zeigen starke Leistungen' : 'National teams show strong performances',
        content: language === 'de' ? 'Sportler erreichen...' : 'Athletes achieve...',
        category: 'SPORTS',
        latitude: this.getRandomLatitude(language),
        longitude: this.getRandomLongitude(language),
        imageUrl: null,
        isBreaking: false,
        publishedAt: new Date(article.publish_date),
        location: this.getLocationName(language),
        sourceUrl: 'https://example.com/mock-5',
        sourceName: language === 'de' ? 'Sport1' : 'BBC Sport',
        country: null,
        language,
        externalId: null,
        userId: null,
        isUserCreated: false,
        sentiment: 0.85,
        publishedAt: new Date(), // Mock articles use current timestamp
        fetchedAt: new Date(),
        cacheExpiresAt: null
      }
    ];

    const mockWorldNewsArticles = mockArticles.map(article => ({
      title: article.title,
      text: article.content,
      summary: article.summary,
      url: article.sourceUrl || '',
      image: article.imageUrl || undefined,
      publish_date: new Date().toISOString(),
      author: undefined,
      sentiment: article.sentiment || 0,
      language: article.language || 'en'
    }));

    return {
      articles: mockArticles,
      sentiment: this.calculateSentiment(mockWorldNewsArticles)
    };
  }
}

export const worldNewsApi = new WorldNewsApiService();
