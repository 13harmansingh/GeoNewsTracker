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
    ? searchResults 
    : activeFilter 
    ? filteredNews 
    : allNews;

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
    setSearchQuery(query);
    setActiveFilter(null); // Clear filter when searching
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
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(14);
        },
        () => {
          // Fallback to NYC
          setMapCenter([40.7589, -73.9851]);
          setMapZoom(12);
        }
      );
    }
  };

  const handleAreaClick = async (lat: number, lng: number) => {
    console.log(`Fetching news for area: ${lat}, ${lng}`);
    
    try {
      // Fetch news for the clicked area
      const response = await fetch(`/api/news/location?lat=${lat}&lng=${lng}&radius=5`);
      const areaNews = await response.json();
      
      if (areaNews.length > 0) {
        // Update the map center to the clicked location
        setMapCenter([lat, lng]);
        setMapZoom(Math.max(mapZoom, 10));
        
        // Invalidate and refetch news data to update the map
        queryClient.invalidateQueries({ queryKey: ['/api/news'] });
        
        // Show a notification or update UI to indicate news was found
        console.log(`Found ${areaNews.length} news articles in this area`);
      } else {
        console.log('No news found in this area');
      }
    } catch (error) {
      console.error('Error fetching area news:', error);
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
