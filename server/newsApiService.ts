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

class NewsAPIService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://newsapi.org/v2/top-headlines";

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("NewsAPI key not found. Using mock data for country headlines.");
    }
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
