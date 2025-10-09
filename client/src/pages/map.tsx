import { useState } from "react";
import InteractiveMap from "@/components/map/InteractiveMap";
import NewsPanel from "@/components/map/NewsPanel";
import NavigationBar from "@/components/map/NavigationBar";
import SearchBar from "@/components/map/SearchBar";
import MapControls from "@/components/map/MapControls";
import ActionBar from "@/components/map/ActionBar";
import { useNews } from "@/hooks/use-news";
import { queryClient } from "@/lib/queryClient";
import type { NewsArticle } from "@shared/schema";

export default function MapPage() {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isNewsVisible, setIsNewsVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([40.7589, -73.9851]); // NYC coordinates
  const [mapZoom, setMapZoom] = useState(12);

  const { data: allNews = [], isLoading } = useNews.useAllNews();
  const { data: filteredNews = [] } = useNews.useFilteredNews(activeFilter);
  const { data: searchResults = [] } = useNews.useSearchNews(searchQuery);

  // Determine which news to display based on current state
  const displayNews = searchQuery 
    ? (searchResults || []) 
    : activeFilter 
    ? (filteredNews || []) 
    : (allNews || []);

  const handleMarkerClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsNewsVisible(true);
  };

  const handleCloseNews = () => {
    setIsNewsVisible(false);
    setTimeout(() => setSelectedArticle(null), 300);
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
    // Get user's current location or default to NYC
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`📍 User location found: ${position.coords.latitude}, ${position.coords.longitude}`);
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(14);
        },
        (error) => {
          console.log('🚨 Geolocation error, falling back to NYC:', error.message);
          // Fallback to NYC
          setMapCenter([40.7589, -73.9851]);
          setMapZoom(12);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      console.log('🚨 Geolocation not supported, using NYC default');
      setMapCenter([40.7589, -73.9851]);
      setMapZoom(12);
    }
  };

  const handleAreaClick = async (lat: number, lng: number) => {
    console.log(`🗺️ Creating news point at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    try {
      // Clear existing queries to prevent stale data
      queryClient.removeQueries({ queryKey: ['/api/news'] });

      // Build API URL with location and category filter
      let apiUrl = `/api/news/location-fresh?lat=${lat}&lng=${lng}`;
      if (activeFilter) {
        apiUrl += `&category=${activeFilter}`;
      }

      console.log(`🔄 Fetching fresh ${activeFilter || 'general'} news for this location...`);

      const response = await fetch(apiUrl);
      const locationNews = await response.json();

      if (locationNews.length > 0) {
        console.log(`✅ Created ${locationNews.length} news markers at clicked location`);

        // Center map on clicked location
        setMapCenter([lat, lng]);
        setMapZoom(Math.max(mapZoom, 10));

        // Force refresh the map with new location-based news
        await queryClient.invalidateQueries({ queryKey: ['/api/news'] });

        // Show the first article found
        setSelectedArticle(locationNews[0]);
        setIsNewsVisible(true);

      } else {
        console.log('📍 Creating placeholder marker - no specific news found for this exact location');
        // Still center the map and show that we tried
        setMapCenter([lat, lng]);
        setMapZoom(Math.max(mapZoom, 10));
      }
    } catch (error) {
      console.error('🚨 Error creating location marker:', error);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-ios-gray">
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
        isLoading={isLoading}
        onAreaClick={handleAreaClick}
      />

      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterLocation={handleCenterLocation}
      />

      {/* Action Bar */}
      <ActionBar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* News Panel */}
      <NewsPanel
        article={selectedArticle}
        isVisible={isNewsVisible}
        onClose={handleCloseNews}
        relatedNews={allNews.filter(article => 
          selectedArticle && 
          article.id !== selectedArticle.id && 
          (article.category === selectedArticle.category || 
           article.location === selectedArticle.location)
        ).slice(0, 3)}
      />
    </div>
  );
}