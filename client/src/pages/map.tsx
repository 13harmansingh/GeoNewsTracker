import { useState, useEffect, useMemo, useCallback } from "react";
import InteractiveMap from "@/components/map/InteractiveMap";
import NewsPanel from "@/components/map/NewsPanel";
import NavigationBar from "@/components/map/NavigationBar";
import SearchBar from "@/components/map/SearchBar";
import MapControls from "@/components/map/MapControls";
import ActionBar from "@/components/map/ActionBar";
import { useNews } from "@/hooks/use-news";
import { useArticleExperience } from "@/contexts/ArticleExperienceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewsCache } from "@/utils/newsCache";
import { CountryAggregation, type CountryData } from "@/utils/countryAggregation";
import { geocodeLocation, isLikelyLocation } from "@/utils/geocoding";
import type { NewsArticle } from "@shared/schema";

interface ZoneData {
  id: string;
  country: string;
  countryCode: string;
  articles: NewsArticle[];
  center: [number, number];
  language: string;
}

export default function MapPage() {
  const { language } = useLanguage();
  const { selectedArticle, isNewsVisible, openArticle, closeArticle } = useArticleExperience();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([40.7589, -73.9851]); // NYC coordinates
  const [mapZoom, setMapZoom] = useState(12);
  const [fetchedZones, setFetchedZones] = useState<ZoneData[]>([]); // Multiple persistent zones
  const [activeZone, setActiveZone] = useState<ZoneData | null>(null); // Currently selected zone for panel
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isHandlingCountryClick, setIsHandlingCountryClick] = useState(false);
  const [shouldAutoOpenDrawer, setShouldAutoOpenDrawer] = useState(false);

  const { data: allNews = [], isLoading } = useNews.useAllNews(language);
  const { data: filteredNews = [] } = useNews.useFilteredNews(activeFilter, language);
  const { data: searchResults = [] } = useNews.useSearchNews(searchQuery, language);

  // Auto-open drawer when search results load
  useEffect(() => {
    if (shouldAutoOpenDrawer && searchResults && searchResults.length > 0) {
      console.log(`📰 Auto-opening drawer with ${searchResults.length} search results`);
      openArticle(searchResults[0]);
      setShouldAutoOpenDrawer(false);
    }
  }, [searchResults, shouldAutoOpenDrawer]);

  // Load cached zones on mount
  useEffect(() => {
    const cached = NewsCache.getAllZones();
    console.log(`📦 Loaded ${cached.length} cached zones from localStorage`);
    setFetchedZones(cached);
  }, []);

  // Display news for heatmap (always use base news, ignore search)
  const heatmapNews = activeFilter 
    ? (filteredNews || []) 
    : (allNews || []);

  // Display news for article list (includes search results)
  const displayNews = searchQuery 
    ? (searchResults || []) 
    : heatmapNews;

  // Aggregate news by country for proactive heatmaps
  const countryData = useMemo(() => {
    if (!heatmapNews || heatmapNews.length === 0) return [];
    const aggregated = CountryAggregation.aggregateByCountry(heatmapNews);
    console.log(`🌍 Aggregated ${heatmapNews.length} articles into ${aggregated.length} countries`);
    return aggregated;
  }, [heatmapNews]);

  const handleMarkerClick = (article: NewsArticle) => {
    openArticle(article);
  };

  const handleGlobalHeatmapClick = (article: NewsArticle) => {
    console.log(`🌍 Global heatmap clicked - showing nearby articles for ${article.title}`);
    
    // Find nearby articles (within 100km) from heatmap news only
    const nearbyArticles = heatmapNews.filter(a => {
      const distance = Math.sqrt(
        Math.pow(a.latitude - article.latitude, 2) + 
        Math.pow(a.longitude - article.longitude, 2)
      ) * 111; // Rough km conversion
      return distance < 100;
    });

    console.log(`📍 Found ${nearbyArticles.length} nearby articles`);
    
    // Create temporary zone for display (not persisted)
    setActiveZone({
      id: 'temp-global',
      country: `Nearby (${article.title.substring(0, 20)}...)`,
      countryCode: 'global',
      articles: nearbyArticles,
      center: [article.latitude, article.longitude],
      language
    });

    // Open panel with list view
    openArticle(nearbyArticles[0]);
  };

  const handleZoneClick = (zone: ZoneData) => {
    console.log(`🗂️ Opening zone drawer with ${zone.articles.length} articles for ${zone.country}`);
    setActiveZone(zone);
    openArticle(zone.articles[0]);
  };

  const handleCountryClick = useCallback((country: CountryData) => {
    console.log(`🌍 Country heatmap clicked: ${country.country} (${country.count} articles)`);
    
    // Set flag to prevent area click handler from firing
    setIsHandlingCountryClick(true);
    
    // Convert CountryData to ZoneData format
    const countryZone: ZoneData = {
      id: `country-${country.countryCode}-${language}`,
      country: country.country,
      countryCode: country.countryCode,
      articles: country.articles,
      center: country.center,
      language
    };
    
    setActiveZone(countryZone);
    openArticle(country.articles[0]);
    
    // Reset flag after a short delay
    setTimeout(() => setIsHandlingCountryClick(false), 100);
  }, [language, openArticle]);

  const handleCloseDrawer = () => {
    closeArticle();
    setActiveZone(null);
  };

  const handleAreaClick = async (lat: number, lng: number, autoOpenDrawer: boolean = false) => {
    // Skip if we're handling a country heatmap click
    if (isHandlingCountryClick) {
      console.log('⏭️ Skipping area click - country heatmap was clicked');
      return null;
    }
    
    console.log(`📍 Map clicked at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setIsReverseGeocoding(true);
    
    try {
      // Step 1: Reverse geocode to get country code
      console.log('🌍 Reverse geocoding location...');
      const geocodeResponse = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      
      if (!geocodeResponse.ok) {
        console.error('Reverse geocoding failed:', geocodeResponse.statusText);
        setIsReverseGeocoding(false);
        return;
      }

      const geocodeData = await geocodeResponse.json();
      console.log(`✅ Reverse geocoded to: ${geocodeData.country} (${geocodeData.country_code})`);

      if (!geocodeData.country_code) {
        console.warn('⚠️ No country code found for this location. Click on a country.');
        setIsReverseGeocoding(false);
        return;
      }

      // Step 2: Fetch location-based news (lat/lng + country + language)
      console.log(`📰 Fetching news for ${geocodeData.country}...`);
      const newsResponse = await fetch(`/api/news/location?lat=${lat}&lng=${lng}&country=${geocodeData.country_code}&language=${language}`);
      
      if (!newsResponse.ok) {
        console.error('Failed to fetch country news:', newsResponse.statusText);
        setIsReverseGeocoding(false);
        return;
      }

      const countryNews = await newsResponse.json();
      console.log(`✅ Fetched ${countryNews.length} news articles for ${geocodeData.country}`);

      // Handle empty responses gracefully
      if (!countryNews || countryNews.length === 0) {
        console.warn(`⚠️ No news articles found for ${geocodeData.country}`);
        setIsReverseGeocoding(false);
        // TODO: Show user-friendly message (toast notification)
        return;
      }

      // Create new zone and cache it
      const newZone = NewsCache.saveFetchedZone({
        country: geocodeData.country,
        countryCode: geocodeData.country_code,
        articles: countryNews,
        center: [lat, lng],
        language
      });

      // Add to fetched zones list
      setFetchedZones(prev => {
        const existing = prev.findIndex(z => z.countryCode === newZone.countryCode && z.language === newZone.language);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newZone;
          return updated;
        }
        return [...prev, newZone];
      });

      // Set as active zone
      setActiveZone(newZone);

      // Center map on clicked location (only if not auto-opening)
      if (!autoOpenDrawer) {
        setMapCenter([lat, lng]);
        setMapZoom(6); // Zoom in to show country-level detail
      }

      console.log(`✨ Zone created for ${geocodeData.country} with ${countryNews.length} articles`);
      
      // Auto-open drawer if requested (for location searches)
      if (autoOpenDrawer && countryNews.length > 0) {
        console.log(`📰 Auto-opening drawer with ${countryNews.length} location articles`);
        openArticle(countryNews[0]);
      }

    } catch (error) {
      console.error('Error handling map click:', error);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setSearchQuery(""); // Clear search when filtering
  };

  const handleSearch = async (query: string) => {
    console.log('🔍 Search triggered with query:', query);
    
    if (!query.trim()) {
      setSearchQuery('');
      return;
    }
    
    // Clear active filter when searching
    setActiveFilter(null);
    
    // Detect if query is a location
    if (isLikelyLocation(query.trim())) {
      console.log('📍 Detected location search, geocoding...');
      setIsReverseGeocoding(true);
      
      try {
        const geocodeResult = await geocodeLocation(query.trim());
        
        if (geocodeResult) {
          console.log(`✅ Found location: ${geocodeResult.displayName}`);
          
          // Smoothly pan map to location
          setMapCenter([geocodeResult.lat, geocodeResult.lng]);
          setMapZoom(12);
          
          // Small delay for map to pan smoothly
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Fetch news for that area using the existing area click handler
          // This will trigger the location-based fetch and open the drawer
          await handleAreaClick(geocodeResult.lat, geocodeResult.lng, true);
          
          setIsReverseGeocoding(false);
          return;
        } else {
          console.log('❌ Could not geocode location, falling back to keyword search');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setIsReverseGeocoding(false);
      }
    }
    
    // Fallback to keyword search
    console.log('🔍 Performing keyword search');
    setSearchQuery(query.trim());
    setShouldAutoOpenDrawer(true); // Flag to auto-open when results load
  };

  const centerMapOnLocation = (locationName: string) => {
    // Common city/country coordinates
    const locationCoordinates: { [key: string]: [number, number] } = {
      // Major cities
      'mumbai': [19.0760, 72.8777],
      'delhi': [28.7041, 77.1025],
      'bangalore': [12.9716, 77.5946],
      'chennai': [13.0827, 80.2707],
      'kolkata': [22.5726, 88.3639],
      'hyderabad': [17.3850, 78.4867],
      'pune': [18.5204, 73.8567],
      'ahmedabad': [23.0225, 72.5714],
      'london': [51.5074, -0.1278],
      'paris': [48.8566, 2.3522],
      'new york': [40.7128, -74.0060],
      'tokyo': [35.6762, 139.6503],
      'berlin': [52.5200, 13.4050],
      'madrid': [40.4168, -3.7038],
      'lisbon': [38.7223, -9.1393],
      'rome': [41.9028, 12.4964],
      'moscow': [55.7558, 37.6176],
      'beijing': [39.9042, 116.4074],
      'sydney': [-33.8688, 151.2093],
      'dubai': [25.2048, 55.2708],
      'singapore': [1.3521, 103.8198],
      'hong kong': [22.3193, 114.1694],
      'seoul': [37.5665, 126.9780],
      'bangkok': [13.7563, 100.5018],
      'istanbul': [41.0082, 28.9784],
      'cairo': [30.0444, 31.2357],
      'lagos': [6.5244, 3.3792],
      'johannesburg': [-26.2041, 28.0473],
      'nairobi': [-1.2921, 36.8219],
      'mexico city': [19.4326, -99.1332],
      'sao paulo': [-23.5505, -46.6333],
      'buenos aires': [-34.6118, -58.3960],
      'miami': [25.7617, -80.1918],
      'los angeles': [34.0522, -118.2437],
      'san francisco': [37.7749, -122.4194],
      'chicago': [41.8781, -87.6298],
      'toronto': [43.6532, -79.3832],
      'vancouver': [49.2827, -123.1207],
      'montreal': [45.5017, -73.5673],
      'madeira': [32.7607, -16.9595],
      'football': [40.7589, -73.9851], // Default to NYC for generic searches
    };

    const searchTerm = locationName.toLowerCase();
    
    // Find matching location
    for (const [location, coords] of Object.entries(locationCoordinates)) {
      if (searchTerm.includes(location) || location.includes(searchTerm)) {
        console.log(`🗺️ Centering map on ${location}: ${coords[0]}, ${coords[1]}`);
        setMapCenter(coords);
        setMapZoom(12);
        return;
      }
    }
    
    console.log(`🗺️ Location "${locationName}" not found in coordinates database`);
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 1, 3));
  };

  const handleCenterLocation = () => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation is not supported by your browser');
      alert('Geolocation is not supported by your browser. Centering on New York City.');
      setMapCenter([40.7589, -73.9851]);
      setMapZoom(12);
      return;
    }

    console.log('📍 Requesting user location...');
    
    // Show loading state
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Location request taking too long, falling back to NYC');
      setMapCenter([40.7589, -73.9851]);
      setMapZoom(12);
    }, 8000); // 8 second backup timeout
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        console.log(`✅ Location found: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setMapCenter([latitude, longitude]);
        setMapZoom(13);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('❌ Location error:', error.message, error.code);
        
        // Provide specific error messages
        let errorMsg = 'Unable to get location. ';
        if (error.code === 1) {
          errorMsg += 'Location access denied.';
        } else if (error.code === 2) {
          errorMsg += 'Location unavailable.';
        } else if (error.code === 3) {
          errorMsg += 'Location request timed out.';
        }
        errorMsg += ' Centering on New York City.';
        
        console.warn(errorMsg);
        
        // Fallback to NYC if location fails
        setMapCenter([40.7589, -73.9851]);
        setMapZoom(12);
      },
      {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 7000, // 7 second timeout
        maximumAge: 60000, // Allow cached position up to 1 minute old
      }
    );
  };

  // Get related news (same category or nearby location) from display news
  const relatedNews = selectedArticle
    ? displayNews.filter(
        (article: NewsArticle) =>
          article.id !== selectedArticle.id &&
          (article.category === selectedArticle.category ||
            Math.abs(article.latitude - selectedArticle.latitude) < 1)
      ).slice(0, 3)
    : [];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-50">
      {/* Navigation Bar */}
      <NavigationBar />

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />

      {/* Interactive Map - Always shows base news, not affected by search */}
      <InteractiveMap
        globalNews={heatmapNews}
        fetchedZones={fetchedZones}
        countryData={countryData}
        onGlobalHeatmapClick={handleGlobalHeatmapClick}
        onZoneHeatmapClick={handleZoneClick}
        onCountryHeatmapClick={handleCountryClick}
        center={mapCenter}
        zoom={mapZoom}
        isLoading={isLoading || isReverseGeocoding}
        language={language}
        onAreaClick={handleAreaClick}
      />

      {/* Action Bar (Category Filters) */}
      <ActionBar 
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterLocation={handleCenterLocation}
      />

      {/* News Panel */}
      <NewsPanel
        article={selectedArticle}
        isVisible={isNewsVisible}
        onClose={handleCloseDrawer}
        relatedNews={relatedNews}
        zoneArticles={activeZone?.articles}
        zoneName={activeZone?.country}
      />
    </div>
  );
}
