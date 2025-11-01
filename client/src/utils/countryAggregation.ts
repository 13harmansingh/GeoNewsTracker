import type { NewsArticle } from "@shared/schema";

export interface CountryData {
  country: string;
  countryCode: string;
  center: [number, number];
  articles: NewsArticle[];
  count: number;
  intensity: number; // 0-1 normalized intensity based on article count
}

export class CountryAggregation {
  static aggregateByCountry(articles: NewsArticle[]): CountryData[] {
    const countryMap = new Map<string, NewsArticle[]>();
    
    // Group articles by country (using location as proxy for country)
    articles.forEach(article => {
      const location = article.location || 'Unknown';
      const country = this.extractCountry(location);
      
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(article);
    });
    
    // Find max count for intensity normalization
    const maxCount = Math.max(...Array.from(countryMap.values()).map(arts => arts.length), 1);
    
    // Convert to CountryData array
    const countryData: CountryData[] = [];
    countryMap.forEach((articles, country) => {
      const center = this.calculateCenter(articles);
      const count = articles.length;
      const intensity = count / maxCount;
      
      // Try to extract country code from articles (if available from API)
      const countryCode = this.guessCountryCode(country);
      
      countryData.push({
        country,
        countryCode,
        center,
        articles,
        count,
        intensity
      });
    });
    
    // Sort by count descending
    return countryData.sort((a, b) => b.count - a.count);
  }
  
  private static extractCountry(location: string): string {
    // Extract country from location string (e.g., "New York, USA" → "USA")
    const parts = location.split(',').map(p => p.trim());
    
    // Last part is usually the country
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    
    return location;
  }
  
  private static calculateCenter(articles: NewsArticle[]): [number, number] {
    if (articles.length === 0) return [0, 0];
    
    const avgLat = articles.reduce((sum, a) => sum + a.latitude, 0) / articles.length;
    const avgLng = articles.reduce((sum, a) => sum + a.longitude, 0) / articles.length;
    
    return [avgLat, avgLng];
  }
  
  private static guessCountryCode(country: string): string {
    // Common country name to ISO code mappings
    const countryCodeMap: Record<string, string> = {
      'USA': 'us',
      'United States': 'us',
      'UK': 'gb',
      'United Kingdom': 'gb',
      'England': 'gb',
      'France': 'fr',
      'Germany': 'de',
      'Spain': 'es',
      'Italy': 'it',
      'Japan': 'jp',
      'China': 'cn',
      'India': 'in',
      'Brazil': 'br',
      'Canada': 'ca',
      'Australia': 'au',
      'Mexico': 'mx',
      'Russia': 'ru',
      'South Korea': 'kr',
      'Argentina': 'ar',
      'Netherlands': 'nl',
      'Belgium': 'be',
      'Switzerland': 'ch',
      'Sweden': 'se',
      'Norway': 'no',
      'Denmark': 'dk',
      'Finland': 'fi',
      'Poland': 'pl',
      'Portugal': 'pt',
      'Greece': 'gr',
      'Turkey': 'tr',
      'South Africa': 'za',
      'Egypt': 'eg',
      'Israel': 'il',
      'Saudi Arabia': 'sa',
      'UAE': 'ae',
      'Singapore': 'sg',
      'Hong Kong': 'hk',
      'Taiwan': 'tw',
      'Thailand': 'th',
      'Vietnam': 'vn',
      'Indonesia': 'id',
      'Malaysia': 'my',
      'Philippines': 'ph',
      'New Zealand': 'nz',
      'Ireland': 'ie',
      'Austria': 'at',
      'Czech Republic': 'cz',
      'Hungary': 'hu',
      'Romania': 'ro',
      'Ukraine': 'ua',
      'Chile': 'cl',
      'Colombia': 'co',
      'Peru': 'pe',
      'Venezuela': 've',
      'Nigeria': 'ng',
      'Kenya': 'ke',
      'Morocco': 'ma'
    };
    
    return countryCodeMap[country] || country.toLowerCase().substring(0, 2);
  }
}
