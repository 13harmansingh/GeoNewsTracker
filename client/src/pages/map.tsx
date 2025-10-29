import { useState } from "react";
import InteractiveMap from "@/components/map/InteractiveMap";
import NewsPanel from "@/components/map/NewsPanel";
import NavigationBar from "@/components/map/NavigationBar";
import SearchBar from "@/components/map/SearchBar";
import MapControls from "@/components/map/MapControls";
import ActionBar from "@/components/map/ActionBar";
import { useNews } from "@/hooks/use-news";
import { useArticleExperience } from "@/contexts/ArticleExperienceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NewsArticle } from "@shared/schema";

interface ZoneData {
  country: string;
  countryCode: string;
  articles: NewsArticle[];
  center: [number, number];
}

export default function MapPage() {
  const { language } = useLanguage();
  const { selectedArticle, isNewsVisible, openArticle, closeArticle } = useArticleExperience();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([40.7589, -73.9851]); // NYC coordinates
  const [mapZoom, setMapZoom] = useState(12);
  const [zoneData, setZoneData] = useState<ZoneData | null>(null); // Zone overlay data
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const { data: allNews = [], isLoading } = useNews.useAllNews(language);
  const { data: filteredNews = [] } = useNews.useFilteredNews(activeFilter, language);
  const { data: searchResults = [] } = useNews.useSearchNews(searchQuery, language);

  // Display base news, but hide markers when zone overlay is active
  const baseNews = searchQuery 
    ? (searchResults || []) 
    : activeFilter 
    ? (filteredNews || []) 
    : (allNews || []);
  
  // Hide individual markers when zone overlay exists (cleaner UX)
  const displayNews = zoneData ? [] : baseNews;

  const handleMarkerClick = (article: NewsArticle) => {
    openArticle(article);
  };

  const handleZoneClick = () => {
    if (zoneData && zoneData.articles.length > 0) {
      console.log(`🗂️ Opening zone drawer with ${zoneData.articles.length} articles for ${zoneData.country}`);
      // Open drawer - NewsPanel will detect zoneArticles and show list view
      // Pass first article as placeholder (zone list will display instead)
      openArticle(zoneData.articles[0]);
    }
  };

  const handleCloseDrawer = () => {
    closeArticle();
    // Clear zone data to restore global map view
    setZoneData(null);
  };

  const handleAreaClick = async (lat: number, lng: number) => {
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

      // Step 2: Fetch news for the country
      console.log(`📰 Fetching news for ${geocodeData.country}...`);
      const newsResponse = await fetch(`/api/news/location?country=${geocodeData.country_code}&language=${language}`);
      
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

      // Create zone overlay data (no individual markers)
      setZoneData({
        country: geocodeData.country,
        countryCode: geocodeData.country_code,
        articles: countryNews,
        center: [lat, lng]
      });

      // Center map on clicked location
      setMapCenter([lat, lng]);
      setMapZoom(6); // Zoom in to show country-level detail

      console.log(`✨ Zone created for ${geocodeData.country} with ${countryNews.length} articles`);

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

  const handleSearch = (query: string) => {
    console.log('🔍 Search triggered with query:', query);
    setSearchQuery(query.trim());
    // Clear active filter when searching
    if (query.trim()) {
      setActiveFilter(null);
      // Center map on searched location if it's a known place
      centerMapOnLocation(query.trim());
    }
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

  // Get related news (same category or nearby location)
  const relatedNews = selectedArticle
    ? displayNews.filter(
        (article) =>
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

      {/* Interactive Map */}
      <InteractiveMap
        news={displayNews}
        onMarkerClick={handleMarkerClick}
        center={mapCenter}
        zoom={mapZoom}
        isLoading={isLoading || isReverseGeocoding}
        language={language}
        onAreaClick={handleAreaClick}
        zoneData={zoneData}
        onZoneClick={handleZoneClick}
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
        zoneArticles={zoneData?.articles}
        zoneName={zoneData?.country}
      />
    </div>
  );
}
