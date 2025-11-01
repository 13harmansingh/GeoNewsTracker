// Forward geocoding: Convert location name to coordinates
export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  country: string;
  countryCode: string;
}

export async function geocodeLocation(locationName: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`
    );
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.log(`🗺️ No geocoding results for: ${locationName}`);
      return null;
    }
    
    const result = data[0];
    console.log(`✅ Geocoded "${locationName}" to: ${result.display_name}`);
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      country: result.display_name.split(', ').pop() || 'Unknown',
      countryCode: result.address?.country_code?.toUpperCase() || 'XX'
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Detect if a search query is likely a location
export function isLikelyLocation(query: string): boolean {
  const locationKeywords = [
    'city', 'state', 'country', 'province', 'region', 'county', 
    'town', 'village', 'capital', 'district'
  ];
  
  const queryLower = query.toLowerCase();
  
  // Check if query contains location keywords
  if (locationKeywords.some(keyword => queryLower.includes(keyword))) {
    return true;
  }
  
  // Check if query is relatively short (locations are usually 1-3 words)
  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount <= 3 && wordCount >= 1) {
    // If it doesn't contain news-related keywords, likely a location
    const newsKeywords = ['news', 'breaking', 'latest', 'update', 'report', 'article'];
    const hasNewsKeyword = newsKeywords.some(keyword => queryLower.includes(keyword));
    
    if (!hasNewsKeyword) {
      return true;
    }
  }
  
  return false;
}
