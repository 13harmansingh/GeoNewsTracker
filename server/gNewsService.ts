import type { NewsArticle } from "@shared/schema";
import type { SupportedLanguage } from "./newsApiService";

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

// Map country codes to GNews supported countries
const GNEWS_COUNTRY_CODES: Record<string, string> = {
  // Major countries supported by GNews
  'us': 'us', 'gb': 'gb', 'ca': 'ca', 'au': 'au',
  'in': 'in', 'ie': 'ie', 'nz': 'nz', 'sg': 'sg',
  'br': 'br', 'pt': 'pt', 'mx': 'mx', 'ar': 'ar',
  'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it',
  'nl': 'nl', 'be': 'be', 'at': 'at', 'ch': 'ch',
  'cn': 'cn', 'jp': 'jp', 'kr': 'kr', 'tw': 'tw',
  'hk': 'hk', 'ru': 'ru', 'tr': 'tr', 'sa': 'sa',
  'ae': 'ae', 'eg': 'eg', 'za': 'za', 'ng': 'ng',
  'ke': 'ke', 'gh': 'gh', 'ug': 'ug', 'tz': 'tz',
};

// Map languages to GNews language codes
const LANGUAGE_TO_GNEWS: Record<SupportedLanguage, string> = {
  en: 'en',
  pt: 'pt',
  es: 'es',
  fr: 'fr',
  de: 'de',
};

class GNewsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://gnews.io/api/v4/top-headlines";

  constructor() {
    this.apiKey = process.env.GNEWS_TOKEN || "";
    if (!this.apiKey) {
      console.warn("GNews API key not found. GNews will not be available.");
    }
  }

  async getCountryNews(countryCode: string, language?: SupportedLanguage): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error('GNews API key not configured');
    }

    const normalizedCountry = countryCode.toLowerCase();
    const gNewsCountry = GNEWS_COUNTRY_CODES[normalizedCountry];
    
    if (!gNewsCountry) {
      throw new Error(`Country ${countryCode} not supported by GNews`);
    }

    const lang = language ? LANGUAGE_TO_GNEWS[language] || 'en' : 'en';

    try {
      console.log(`📰 Fetching ${lang.toUpperCase()} news from GNews.io for ${normalizedCountry.toUpperCase()}...`);
      
      const url = `${this.baseUrl}?lang=${lang}&country=${gNewsCountry}&max=20&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`GNews API error: ${response.status}`);
        throw new Error(`GNews returned ${response.status}`);
      }

      const data: GNewsResponse = await response.json();

      if (!data.articles || data.articles.length === 0) {
        console.warn(`No articles from GNews for ${normalizedCountry}`);
        throw new Error('No articles from GNews');
      }

      console.log(`✅ GNews.io returned ${data.articles.length} articles for ${normalizedCountry}`);
      
      // Transform to our format
      return data.articles.map((article, index) => {
        // Random geo distribution for variety
        const baseLat = Math.random() * 180 - 90;
        const baseLng = Math.random() * 360 - 180;
        
        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: "GLOBAL",
          latitude: baseLat,
          longitude: baseLng,
          imageUrl: article.image,
          isBreaking: true,
          views: Math.floor(Math.random() * 1000) + 100,
          publishedAt: new Date(article.publishedAt),
          location: normalizedCountry.toUpperCase(),
          sourceUrl: article.url,
          sourceName: article.source.name,
          country: normalizedCountry,
          language: lang as SupportedLanguage,
          sentiment: null,
          externalId: `gnews-${normalizedCountry}-${Date.now()}-${index}`,
          userId: null,
          isUserCreated: false,
        } as NewsArticle;
      });

    } catch (error) {
      console.error(`GNews failed for ${normalizedCountry}:`, error);
      throw error; // Let fallback chain handle it
    }
  }
}

export const gNewsService = new GNewsService();
