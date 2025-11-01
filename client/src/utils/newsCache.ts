import type { NewsArticle } from "@shared/schema";

interface FetchedZone {
  id: string;
  country: string;
  countryCode: string;
  center: [number, number];
  articles: NewsArticle[];
  fetchedAt: number;
  language: string;
}

const CACHE_KEY = 'knew_fetched_zones';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class NewsCache {
  static saveFetchedZone(zone: Omit<FetchedZone, 'id' | 'fetchedAt'>): FetchedZone {
    const zones = this.getAllZones();
    
    // Create new zone with unique ID
    const newZone: FetchedZone = {
      ...zone,
      id: `${zone.countryCode}-${zone.language}-${Date.now()}`,
      fetchedAt: Date.now()
    };
    
    // Check if similar zone already exists (same country + language)
    const existingIndex = zones.findIndex(
      z => z.countryCode === zone.countryCode && z.language === zone.language
    );
    
    if (existingIndex >= 0) {
      // Update existing zone
      zones[existingIndex] = newZone;
    } else {
      // Add new zone
      zones.push(newZone);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(zones));
    } catch (error) {
      console.error('Failed to save zone to localStorage:', error);
    }
    
    return newZone;
  }
  
  static getAllZones(): FetchedZone[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      
      const zones: FetchedZone[] = JSON.parse(cached);
      
      // Filter out expired zones (older than 24 hours)
      const now = Date.now();
      const validZones = zones.filter(zone => 
        (now - zone.fetchedAt) < CACHE_EXPIRY_MS
      );
      
      // Update localStorage if we filtered anything out
      if (validZones.length !== zones.length) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(validZones));
      }
      
      return validZones;
    } catch (error) {
      console.error('Failed to load zones from localStorage:', error);
      return [];
    }
  }
  
  static getZoneByCountry(countryCode: string, language: string): FetchedZone | null {
    const zones = this.getAllZones();
    return zones.find(z => z.countryCode === countryCode && z.language === language) || null;
  }
  
  static clearAllZones(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear zones from localStorage:', error);
    }
  }
  
  static clearExpiredZones(): void {
    const zones = this.getAllZones(); // This already filters expired zones
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(zones));
    } catch (error) {
      console.error('Failed to clear expired zones:', error);
    }
  }
}
