import type { NewsArticle } from "@shared/schema";

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  "in": { lat: 20.5937, lng: 78.9629, name: "India" },
  "us": { lat: 39.8283, lng: -98.5795, name: "United States" },
  "gb": { lat: 55.3781, lng: -3.4360, name: "United Kingdom" },
};

// Worldwide major city coordinates for diverse marker distribution
const WORLDWIDE_LOCATIONS: Array<{ lat: number; lng: number; name: string; region: string }> = [
  { lat: 40.7128, lng: -74.0060, name: "New York", region: "North America" },
  { lat: 51.5074, lng: -0.1278, name: "London", region: "Europe" },
  { lat: 48.8566, lng: 2.3522, name: "Paris", region: "Europe" },
  { lat: 35.6762, lng: 139.6503, name: "Tokyo", region: "Asia" },
  { lat: -33.8688, lng: 151.2093, name: "Sydney", region: "Australia" },
  { lat: 19.0760, lng: 72.8777, name: "Mumbai", region: "Asia" },
  { lat: -23.5505, lng: -46.6333, name: "São Paulo", region: "South America" },
  { lat: 55.7558, lng: 37.6176, name: "Moscow", region: "Europe" },
  { lat: 39.9042, lng: 116.4074, name: "Beijing", region: "Asia" },
  { lat: 6.5244, lng: 3.3792, name: "Lagos", region: "Africa" },
  { lat: -26.2041, lng: 28.0473, name: "Johannesburg", region: "Africa" },
  { lat: 25.2048, lng: 55.2708, name: "Dubai", region: "Middle East" },
  { lat: 19.4326, lng: -99.1332, name: "Mexico City", region: "North America" },
  { lat: 1.3521, lng: 103.8198, name: "Singapore", region: "Asia" },
  { lat: 52.5200, lng: 13.4050, name: "Berlin", region: "Europe" },
];

class NewsAPIService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://newsapi.org/v2/top-headlines";

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("NewsAPI key not found. Using mock data for country headlines.");
    }
  }

  async getWorldwideHeadlines(): Promise<NewsArticle[]> {
    // Fetch US headlines and distribute them worldwide using WORLDWIDE_LOCATIONS
    if (!this.apiKey) {
      return this.getMockWorldwideHeadlines();
    }

    try {
      const url = `${this.baseUrl}?country=us&pageSize=15&apiKey=${this.apiKey}`;
      console.log(`Fetching headlines for worldwide distribution...`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`NewsAPI error: ${response.status}`, errorData);
        return this.getMockWorldwideHeadlines();
      }

      const data: NewsAPIResponse = await response.json();

      if (!data.articles || data.articles.length === 0) {
        console.warn(`No articles found`);
        return this.getMockWorldwideHeadlines();
      }

      // Distribute articles across worldwide locations
      return data.articles.slice(0, WORLDWIDE_LOCATIONS.length).map((article, index) => {
        const location = WORLDWIDE_LOCATIONS[index];
        const randomOffset = 0.5;
        const lat = location.lat + (Math.random() - 0.5) * randomOffset;
        const lng = location.lng + (Math.random() - 0.5) * randomOffset;

        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: "BREAKING",
          latitude: lat,
          longitude: lng,
          imageUrl: article.urlToImage,
          isBreaking: true,
          views: Math.floor(Math.random() * 1000) + 100,
          publishedAt: new Date(article.publishedAt),
          location: location.name,
          sourceUrl: article.url,
          sourceName: article.source.name,
          country: location.region,
          language: "en",
          externalId: `newsapi-worldwide-${Date.now()}-${index}`,
        } as NewsArticle;
      });

    } catch (error) {
      console.error(`Error fetching NewsAPI headlines:`, error);
      return this.getMockWorldwideHeadlines();
    }
  }

  private getMockWorldwideHeadlines(): NewsArticle[] {
    const mockTitles = [
      "Global Markets Show Strong Recovery",
      "International Summit Addresses Climate Change",
      "Technology Innovation Transforms Healthcare",
      "Major Archaeological Discovery Announced",
      "Sports Championship Draws Record Viewers",
      "New Space Exploration Mission Launched",
      "Cultural Festival Celebrates Diversity",
      "Economic Growth Exceeds Expectations",
      "Scientific Breakthrough in Renewable Energy",
      "Historic Agreement Signed by World Leaders",
      "Educational Reform Initiative Unveiled",
      "Transportation Infrastructure Modernized",
      "Environmental Protection Measures Expanded",
      "Digital Security Standards Updated",
      "Community Development Project Succeeds"
    ];

    return WORLDWIDE_LOCATIONS.map((location, index) => {
      const randomOffset = 0.5;
      return {
        id: Date.now() + index,
        title: mockTitles[index] || mockTitles[0],
        summary: `Latest news from ${location.name}: ${mockTitles[index] || mockTitles[0]}`,
        content: `This is breaking news from ${location.name} in ${location.region}.`,
        category: "BREAKING",
        latitude: location.lat + (Math.random() - 0.5) * randomOffset,
        longitude: location.lng + (Math.random() - 0.5) * randomOffset,
        imageUrl: null,
        isBreaking: true,
        views: Math.floor(Math.random() * 500) + 50,
        publishedAt: new Date(),
        location: location.name,
        sourceUrl: "#",
        sourceName: `${location.name} News`,
        country: location.region,
        language: "en",
        externalId: `mock-worldwide-${index}`,
      };
    });
  }

  async getTopHeadlinesByCountry(countryCode: string): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      return this.getMockHeadlines(countryCode);
    }

    const validCountries = ["in", "us", "gb"];
    if (!validCountries.includes(countryCode.toLowerCase())) {
      throw new Error(`Unsupported country code: ${countryCode}. Supported: in, us, gb`);
    }

    try {
      const url = `${this.baseUrl}?country=${countryCode}&pageSize=5&apiKey=${this.apiKey}`;
      console.log(`Fetching top headlines for ${countryCode.toUpperCase()}...`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`NewsAPI error: ${response.status}`, errorData);
        return this.getMockHeadlines(countryCode);
      }

      const data: NewsAPIResponse = await response.json();

      if (!data.articles || data.articles.length === 0) {
        console.warn(`No articles found for ${countryCode}`);
        return [];
      }

      const countryInfo = COUNTRY_COORDINATES[countryCode.toLowerCase()];

      return data.articles.slice(0, 5).map((article, index) => {
        const lat = countryInfo.lat + (Math.random() - 0.5) * 2;
        const lng = countryInfo.lng + (Math.random() - 0.5) * 2;

        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: "BREAKING",
          latitude: lat,
          longitude: lng,
          imageUrl: article.urlToImage,
          isBreaking: true,
          views: Math.floor(Math.random() * 1000) + 100,
          publishedAt: new Date(article.publishedAt),
          location: countryInfo.name,
          sourceUrl: article.url,
          sourceName: article.source.name,
          country: countryCode,
          language: "en",
          externalId: `newsapi-${Date.now()}-${index}`,
        } as NewsArticle;
      });

    } catch (error) {
      console.error(`Error fetching NewsAPI headlines for ${countryCode}:`, error);
      return this.getMockHeadlines(countryCode);
    }
  }

  private getMockHeadlines(countryCode: string): NewsArticle[] {
    const countryInfo = COUNTRY_COORDINATES[countryCode.toLowerCase()];
    if (!countryInfo) return [];

    const mockTitles: Record<string, string[]> = {
      "in": [
        "India's Economy Shows Strong Growth in Q3",
        "Major Policy Announcement Expected This Week",
        "Tech Sector Sees Record Investment",
        "Infrastructure Development Plan Unveiled",
        "Sports Team Wins International Championship"
      ],
      "us": [
        "Federal Reserve Maintains Interest Rates",
        "Tech Giants Report Quarterly Earnings",
        "Major Infrastructure Bill Passes Senate",
        "New Climate Initiative Announced",
        "Championship Game Sets Viewership Records"
      ],
      "gb": [
        "Parliament Debates New Trade Agreements",
        "Royal Family Announces Public Engagements",
        "London Hosts International Summit",
        "NHS Funding Increase Confirmed",
        "Premier League Season Reaches Climax"
      ]
    };

    const titles = mockTitles[countryCode] || mockTitles["us"];

    return titles.map((title, index) => ({
      id: Date.now() + index,
      title,
      summary: `Top news from ${countryInfo.name}: ${title}`,
      content: `This is a sample article about ${title.toLowerCase()}.`,
      category: "BREAKING",
      latitude: countryInfo.lat + (Math.random() - 0.5) * 2,
      longitude: countryInfo.lng + (Math.random() - 0.5) * 2,
      imageUrl: null,
      isBreaking: true,
      views: Math.floor(Math.random() * 500) + 50,
      publishedAt: new Date(),
      location: countryInfo.name,
      sourceUrl: "#",
      sourceName: `${countryInfo.name} News`,
      country: countryCode,
      language: "en",
      externalId: `mock-${countryCode}-${index}`,
    }));
  }
}

export const newsAPIService = new NewsAPIService();
