import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import { Clock } from "lucide-react";
import type { NewsArticle } from "@shared/schema";
import { createApplePinIcon, injectPinAnimations } from "./PinDesignSystem";
import "leaflet/dist/leaflet.css";

interface ZoneData {
  country: string;
  countryCode: string;
  articles: NewsArticle[];
  center: [number, number];
}

// Inject Apple-style pin animations on mount
if (typeof window !== 'undefined') {
  injectPinAnimations();
}

function MapController({ center, zoom }: { center: number[], zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center[0], center[1]], zoom);
  }, [map, center, zoom]);

  return null;
}

interface InteractiveMapProps {
  news: NewsArticle[];
  onMarkerClick: (article: NewsArticle) => void;
  center: number[];
  zoom: number;
  isLoading: boolean;
  onAreaClick?: (lat: number, lng: number) => void;
  zoneData?: ZoneData | null;
  onZoneClick?: () => void;
}

function MapClickHandler({ onAreaClick }: { onAreaClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      console.log(`🖱️ Map clicked at: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
      if (onAreaClick) {
        onAreaClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function InteractiveMap({ 
  news, 
  onMarkerClick, 
  center, 
  zoom,
  isLoading,
  onAreaClick,
  zoneData,
  onZoneClick
}: InteractiveMapProps) {
  const mapRef = useRef<any>(null);

  // Inject Apple pin animations on component mount
  useEffect(() => {
    injectPinAnimations();
  }, []);

  // Get category-specific color for tooltips matching pin gradients
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      'SPORTS': 'bg-gradient-to-r from-[#FF6B35] to-[#FF3030]',
      'GLOBAL': 'bg-gradient-to-r from-[#007AFF] to-[#0051D5]',
      'TRENDING': 'bg-gradient-to-r from-[#FF2D55] to-[#C644FC]',
      'TECH': 'bg-gradient-to-r from-[#5E5CE6] to-[#BF5AF2]',
      'BUSINESS': 'bg-gradient-to-r from-[#34C759] to-[#30B0C7]',
      'ENTERTAINMENT': 'bg-gradient-to-r from-[#FF9500] to-[#FF3B30]',
      'HEALTH': 'bg-gradient-to-r from-[#32ADE6] to-[#34C759]',
      'SCIENCE': 'bg-gradient-to-r from-[#30B0C7] to-[#34C759]',
      'USER': 'bg-gradient-to-r from-[#FFD60A] to-[#FF9500]',
    };
    return gradients[category] || gradients.GLOBAL;
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Unknown time';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Unknown time';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  return (
    <div className="absolute inset-0 bg-ocean">
      <MapContainer
        ref={mapRef}
        center={[center[0], center[1]]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', backgroundColor: '#AAD3DF' }}
        zoomControl={false}
        className="z-0"
        minZoom={2}
        maxBounds={[[-135, -270], [135, 270]]}
        maxBoundsViscosity={0.8}
      >
        <MapController center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
          bounds={[[-90, -180], [90, 180]]}
        />

        <MapClickHandler onAreaClick={onAreaClick} />

        {/* Zone Overlay - visualizes clicked region */}
        {zoneData && (
          <Circle
            center={zoneData.center}
            radius={300000} // 300km radius for country-level zone
            pathOptions={{
              fillColor: '#007AFF',
              fillOpacity: 0.15,
              color: '#007AFF',
              weight: 2,
              opacity: 0.6
            }}
            eventHandlers={{
              click: () => {
                console.log(`🌍 Zone clicked: ${zoneData.country} (${zoneData.articles.length} articles)`);
                if (onZoneClick) {
                  onZoneClick();
                }
              }
            }}
          >
            <Tooltip
              direction="top"
              permanent={true}
              opacity={0.95}
              className="custom-tooltip"
            >
              <div className="px-4 py-2 text-center">
                <div className="text-sm font-bold text-gray-900">{zoneData.country}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {zoneData.articles.length} articles • Click to browse
                </div>
              </div>
            </Tooltip>
          </Circle>
        )}

        {!isLoading && news && Array.isArray(news) && news.map((article) => {
          console.log(`📍 Placing marker for "${article.title}" (${article.category}) at ${article.latitude.toFixed(4)}, ${article.longitude.toFixed(4)}`);
          
          return (
            <Marker
              key={article.id}
              position={[article.latitude, article.longitude]}
              icon={createApplePinIcon(article.category, article.isUserCreated || false)}
              eventHandlers={{
                click: () => {
                  console.log(`🔗 Marker clicked: ${article.title}`);
                  onMarkerClick(article);
                }
              }}
            >
              <Tooltip 
                direction="top" 
                offset={[0, -20]} 
                opacity={0.95}
                permanent={false}
                className="custom-tooltip"
              >
                <div className="p-3 min-w-[200px] max-w-[280px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full text-white ${getCategoryGradient(article.category)}`}>
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-600 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(article.publishedAt)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {article.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">Click to read more</p>
                </div>
              </Tooltip>
          </Marker>
          );
        })}
      </MapContainer>

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="glass-morphism rounded-2xl p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading news...</p>
          </div>
        </div>
      )}
    </div>
  );
}