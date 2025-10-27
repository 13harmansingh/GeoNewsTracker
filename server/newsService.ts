import type { NewsArticle, InsertNewsArticle } from "@shared/schema";

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id: string;
  source_priority: number;
  source_name: string;
  source_url: string;
  source_icon: string;
  language: string;
  country: string[];
  category: string[];
  ai_tag?: string;
  sentiment?: string;
  sentiment_stats?: string;
  ai_region?: string;
  ai_org?: string;
  duplicate?: boolean;
}

// Geocoding data for major cities worldwide
const CITY_COORDINATES: Record<string, { lat: number; lng: number; country: string }> = {
  // Major global cities
  "new york": { lat: 40.7128, lng: -74.0060, country: "US" },
  "london": { lat: 51.5074, lng: -0.1278, country: "GB" },
  "tokyo": { lat: 35.6762, lng: 139.6503, country: "JP" },
  "paris": { lat: 48.8566, lng: 2.3522, country: "FR" },
  "moscow": { lat: 55.7558, lng: 37.6176, country: "RU" },
  "beijing": { lat: 39.9042, lng: 116.4074, country: "CN" },
  "sydney": { lat: -33.8688, lng: 151.2093, country: "AU" },
  "toronto": { lat: 43.6532, lng: -79.3832, country: "CA" },
  "mumbai": { lat: 19.0760, lng: 72.8777, country: "IN" },
  "berlin": { lat: 52.5200, lng: 13.4050, country: "DE" },
  "madrid": { lat: 40.4168, lng: -3.7038, country: "ES" },
  "rome": { lat: 41.9028, lng: 12.4964, country: "IT" },
  "brazil": { lat: -14.2350, lng: -51.9253, country: "BR" },
  "mexico": { lat: 23.6345, lng: -102.5528, country: "MX" },
  "singapore": { lat: 1.3521, lng: 103.8198, country: "SG" },
  "hong kong": { lat: 22.3193, lng: 114.1694, country: "HK" },
  "seoul": { lat: 37.5665, lng: 126.9780, country: "KR" },
  "dubai": { lat: 25.2048, lng: 55.2708, country: "AE" },
  "cairo": { lat: 30.0444, lng: 31.2357, country: "EG" },
  "lagos": { lat: 6.5244, lng: 3.3792, country: "NG" },
  "johannesburg": { lat: -26.2041, lng: 28.0473, country: "ZA" },
  "istanbul": { lat: 41.0082, lng: 28.9784, country: "TR" },
  "bangkok": { lat: 13.7563, lng: 100.5018, country: "TH" },
  "jakarta": { lat: -6.2088, lng: 106.8456, country: "ID" },
  "manila": { lat: 14.5995, lng: 120.9842, country: "PH" },
  "buenos aires": { lat: -34.6118, lng: -58.3960, country: "AR" },
  "lima": { lat: -12.0464, lng: -77.0428, country: "PE" },
  "santiago": { lat: -33.4489, lng: -70.6693, country: "CL" },
};

// Country coordinates (center points)
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "us": { lat: 39.8283, lng: -98.5795 },
  "gb": { lat: 55.3781, lng: -3.4360 },
  "jp": { lat: 36.2048, lng: 138.2529 },
  "fr": { lat: 46.2276, lng: 2.2137 },
  "de": { lat: 51.1657, lng: 10.4515 },
  "it": { lat: 41.8719, lng: 12.5674 },
  "es": { lat: 40.4637, lng: -3.7492 },
  "ru": { lat: 61.5240, lng: 105.3188 },
  "cn": { lat: 35.8617, lng: 104.1954 },
  "in": { lat: 20.5937, lng: 78.9629 },
  "au": { lat: -25.2744, lng: 133.7751 },
  "ca": { lat: 56.1304, lng: -106.3468 },
  "br": { lat: -14.2350, lng: -51.9253 },
  "mx": { lat: 23.6345, lng: -102.5528 },
  "kr": { lat: 35.9078, lng: 127.7669 },
  "sg": { lat: 1.3521, lng: 103.8198 },
  "ae": { lat: 23.4241, lng: 53.8478 },
  "eg": { lat: 26.0975, lng: 31.2357 },
  "ng": { lat: 9.0820, lng: 8.6753 },
  "za": { lat: -30.5595, lng: 22.9375 },
  "tr": { lat: 38.9637, lng: 35.2433 },
  "th": { lat: 15.8700, lng: 100.9925 },
  "id": { lat: -0.7893, lng: 113.9213 },
  "ph": { lat: 12.8797, lng: 121.7740 },
  "ar": { lat: -38.4161, lng: -63.6167 },
  "pe": { lat: -9.1900, lng: -75.0152 },
  "cl": { lat: -35.6751, lng: -71.5430 },
};

class NewsService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://newsdata.io/api/1/news";

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || "";
    if (!this.apiKey) {
      console.warn("NewsData.io API key not found. Using mock data.");
    }
  }

  private getCoordinatesForLocation(country: string[], description: string, title: string): { lat: number; lng: number; location: string } {
    // Try to extract city from title or description
    const text = `${title} ${description}`.toLowerCase();

    // Check for city mentions first (more specific)
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (text.includes(city)) {
        return { 
          lat: coords.lat, 
          lng: coords.lng, 
          location: city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        };
      }
    }

    // Fallback to country coordinates with smaller randomization
    if (country && country.length > 0) {
      const countryCode = country[0].toLowerCase();
      const coords = COUNTRY_COORDINATES[countryCode];
      if (coords) {
        // Smaller randomization within country bounds (±1 degree)
        const randomLat = coords.lat + (Math.random() - 0.5) * 2;
        const randomLng = coords.lng + (Math.random() - 0.5) * 2;

        // Ensure coordinates stay within valid bounds
        const clampedLat = Math.max(-85, Math.min(85, randomLat));
        const clampedLng = Math.max(-180, Math.min(180, randomLng));

        return { 
          lat: clampedLat, 
          lng: clampedLng, 
          location: this.getCountryName(countryCode)
        };
      }
    }

    // Last resort - use major global cities as fallback
    const fallbackCities = Object.values(CITY_COORDINATES);
    const randomCity = fallbackCities[Math.floor(Math.random() * fallbackCities.length)];

    return { 
      lat: randomCity.lat + (Math.random() - 0.5) * 0.1, // Very small offset
      lng: randomCity.lng + (Math.random() - 0.5) * 0.1,
      location: "Global"
    };
  }

  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      "us": "United States",
      "gb": "United Kingdom", 
      "jp": "Japan",
      "fr": "France",
      "de": "Germany",
      "it": "Italy",
      "es": "Spain",
      "ru": "Russia",
      "cn": "China",
      "in": "India",
      "au": "Australia",
      "ca": "Canada",
      "br": "Brazil",
      "mx": "Mexico",
      "kr": "South Korea",
      "sg": "Singapore",
      "ae": "UAE",
      "eg": "Egypt",
      "ng": "Nigeria",
      "za": "South Africa",
      "tr": "Turkey",
      "th": "Thailand",
      "id": "Indonesia",
      "ph": "Philippines",
      "ar": "Argentina",
      "pe": "Peru",
      "cl": "Chile",
    };

    return countryNames[countryCode] || countryCode.toUpperCase();
  }

  private mapCategory(categories: string[]): { category: string; isBreaking: boolean } {
    if (!categories || categories.length === 0) {
      return { category: "GENERAL", isBreaking: false };
    }

    const cat = categories[0].toLowerCase();

    // Check for breaking news keywords
    const isBreaking = categories.some(c => 
      c.toLowerCase().includes('breaking') || 
      c.toLowerCase().includes('urgent') ||
      c.toLowerCase().includes('alert')
    );

    // Map categories
    if (cat.includes('politic') || cat.includes('government')) return { category: "POLITICS", isBreaking };
    if (cat.includes('business') || cat.includes('economic')) return { category: "BUSINESS", isBreaking };
    if (cat.includes('sport')) return { category: "SPORTS", isBreaking };
    if (cat.includes('tech') || cat.includes('science')) return { category: "TECHNOLOGY", isBreaking };
    if (cat.includes('health') || cat.includes('medical')) return { category: "HEALTH", isBreaking };
    if (cat.includes('entertainment') || cat.includes('celebrity')) return { category: "ENTERTAINMENT", isBreaking };
    if (cat.includes('world') || cat.includes('international')) return { category: "WORLD", isBreaking };
    if (cat.includes('crime') || cat.includes('disaster')) return { category: "BREAKING", isBreaking: true };

    return { category: "GENERAL", isBreaking };
  }

  // Map user-friendly category names to API categories
  private mapUserCategoryToApi(userCategory: string): string {
    const categoryMap: Record<string, string> = {
      'BREAKING': 'top',
      'LOCAL': 'top', 
      'SPORTS': 'sports',
      'WEATHER': 'environment',
      'BUSINESS': 'business',
      'TECHNOLOGY': 'science',
      'POLITICS': 'politics',
      'HEALTH': 'health',
      'ENTERTAINMENT': 'entertainment'
    };

    return categoryMap[userCategory.toUpperCase()] || userCategory.toLowerCase();
  }

  async fetchWorldwideNews(country?: string, category?: string, query?: string, language: string = "en"): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("NewsData.io API key not configured");
    }

    try {
      // Build URL with safe parameters - use requested language
      let url = `${this.baseUrl}?apikey=${this.apiKey}&language=${language}`;

      // Add optional parameters safely
      if (query && query.length >= 3) {
        url += `&q=${encodeURIComponent(query.trim())}`;
      } else if (category) {
        const mappedCategory = this.mapUserCategoryToApi(category);
        if (["business", "entertainment", "environment", "food", "health", "politics", "science", "sports", "technology", "top", "world"].includes(mappedCategory)) {
          url += `&category=${mappedCategory}`;
        }
      } else if (country && country.length === 2) {
        url += `&country=${country.toLowerCase()}`;
      }

      console.log('Fetching news from:', url.replace(this.apiKey, 'API_KEY_HIDDEN'));

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`NewsData.io API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}`);
      }

      const data: NewsDataResponse = await response.json();

      return data.results.map((article, index) => {
        const coords = this.getCoordinatesForLocation(article.country, article.description, article.title);
        const categoryInfo = this.mapCategory(article.category);

        return {
          id: index + 1,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: categoryInfo.category,
          latitude: coords.lat,
          longitude: coords.lng,
          imageUrl: article.image_url || null,
          isBreaking: categoryInfo.isBreaking,
          views: Math.floor(Math.random() * 1000) + 50,
          publishedAt: new Date(article.pubDate),
          location: coords.location,
          sourceUrl: article.link,
          sourceName: article.source_name,
          country: article.country?.[0] || null,
          language: article.language,
          externalId: article.article_id,
        } as NewsArticle;
      });

    } catch (error) {
      console.error("Error fetching news:", error);
      throw error;
    }
  }

  async searchNews(query: string, language: string = "en"): Promise<NewsArticle[]> {
    return this.fetchWorldwideNews(undefined, undefined, query, language);
  }

  async getNewsByCategory(category: string, language: string = "en"): Promise<NewsArticle[]> {
    const categoryMap: Record<string, string> = {
      "BREAKING": "top",
      "POLITICS": "politics", 
      "BUSINESS": "business",
      "SPORTS": "sports",
      "TECHNOLOGY": "technology",
      "HEALTH": "health",
      "ENTERTAINMENT": "entertainment",
      "WORLD": "world",
      "LOCAL": "top",
      "WEATHER": "world"
    };

    const mappedCategory = categoryMap[category] || "top";
    return this.fetchWorldwideNews(undefined, mappedCategory, undefined, language);
  }

  async getNewsByCountry(country: string, language: string = "en"): Promise<NewsArticle[]> {
    // Ensure country code is 2 characters
    const countryCode = country.length === 2 ? country : this.getCountryCode(country);
    return this.fetchWorldwideNews(countryCode, undefined, undefined, language);
  }

  private getCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      "united states": "us",
      "united kingdom": "gb", 
      "england": "gb",
      "britain": "gb",
      "japan": "jp",
      "france": "fr",
      "germany": "de",
      "italy": "it",
      "spain": "es",
      "russia": "ru",
      "china": "cn",
      "india": "in",
      "australia": "au",
      "canada": "ca",
      "brazil": "br",
      "mexico": "mx",
      "south korea": "kr",
      "singapore": "sg",
      "hong kong": "hk"
    };

    return countryMap[country.toLowerCase()] || "us";
  }
}

export const newsService = new NewsService();

// The following code was added to implement search functionality

const API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSDATA_API_URL = "https://newsdata.io/api/1/news";

// Helper function to shuffle array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Mock function for getting trending news (replace with actual implementation)
export async function getTrendingNews(limit: number = 10): Promise<NewsArticle[]> {
  console.log('🔥 Getting trending news (mock)');

  const allNews: NewsArticle[] = [];

  return shuffleArray(allNews).slice(0, limit);
}

// Function to search for news articles
export async function searchNews(query: string): Promise<NewsArticle[]> {
  console.log('🔍 Searching news for query:', query);

  try {
    // Search using NewsData.io API with the query
    const url = `${NEWSDATA_API_URL}?apikey=${API_KEY}&language=en&q=${encodeURIComponent(query)}`;
    console.log('Fetching search results from:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`NewsData API error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    if (!data.results || !Array.isArray(data.results)) {
      console.log('No search results found');
      return [];
    }

    console.log(`📰 Found ${data.results.length} search results`);

    const articles: NewsArticle[] = data.results
      .slice(0, 20) // Limit to 20 search results
      .map((article: NewsDataArticle, index: number) => {
        // Get coordinates for the article location
        const coords = getCoordinatesForLocation(article.country?.[0] || 'unknown');

        // Determine category
        let category = 'LOCAL';
        if (article.category?.includes('top') || article.category?.includes('breaking')) {
          category = 'BREAKING';
        } else if (article.category?.includes('politics')) {
          category = 'CIVIC';
        } else if (article.category?.includes('sports')) {
          category = 'SPORTS';
        }

        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || 'No summary available',
          location: getLocationName(article.country?.[0] || 'Unknown'),
          latitude: coords.lat,
          longitude: coords.lng,
          category,
          publishedAt: new Date(article.pubDate),
          sourceUrl: article.link,
          isBreaking: category === 'BREAKING',
          views: Math.floor(Math.random() * 1000) + 100
        };
      });

    return articles;
  } catch (error) {
    console.error('Error searching news:', error);
    throw error;
  }
}

// Mock functions for location and category determination (replace with actual implementations)
function getCoordinatesForLocation(countryCode: string): { lat: number; lng: number } {
  // Mock implementation (replace with actual logic)
  return { lat: 0, lng: 0 };
}

function getLocationName(countryCode: string): string {
  // Mock implementation (replace with actual logic)
  return 'Unknown';
}