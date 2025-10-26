import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Clock } from "lucide-react";
import type { NewsArticle } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (category: string, isBreaking: boolean = false) => {
  const colors = {
    'BREAKING': '#FF3B30',
    'LOCAL': '#007AFF',
    'CIVIC': '#FF9500',
    'SPORTS': '#34C759',
    'default': '#007AFF'
  };

  const color = colors[category as keyof typeof colors] || colors.default;
  const pulseClass = isBreaking ? 'animate-pulse-glow' : '';

  return L.divIcon({
    html: `
      <div class="relative ${pulseClass}">
        <div class="glass-dark rounded-full p-3 map-pin shadow-lg">
          <div class="w-4 h-4" style="color: ${color};">
            ${getIconSvg(category)}
          </div>
        </div>
        ${isBreaking ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-ios-red rounded-full animate-ping"></div>' : ''}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const getIconSvg = (category: string) => {
  const icons = {
    'BREAKING': '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-6.5L16.5 9H11v12h5.5L23 14.5z"/></svg>',
    'LOCAL': '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 3L19 5.5L21.5 7L20 9.5L22.5 11L21 13.5L23.5 15L22 17.5L24.5 19L23 21.5L20.5 22L19 19.5L16.5 21L15 18.5L12.5 20L11 17.5L8.5 19L7 16.5L4.5 18L3 15.5L0.5 17L2 14.5L0.5 13L2 10.5L0.5 9L2 6.5L0.5 5L2 2.5L4.5 4L7 1.5L8.5 4L11 2.5L12.5 5L15 3.5L16.5 6L19 4.5z"/></svg>',
    'CIVIC': '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    'SPORTS': '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    'default': '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
  };
  return icons[category as keyof typeof icons] || icons.default;
};

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
  onAreaClick
}: InteractiveMapProps) {
  const mapRef = useRef<any>(null);

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
    <div className="absolute inset-0">
      <MapContainer
        ref={mapRef}
        center={[center[0], center[1]]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        className="z-0"
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <MapController center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
          bounds={[[-90, -180], [90, 180]]}
        />

        <MapClickHandler onAreaClick={onAreaClick} />

        {!isLoading && news && Array.isArray(news) && news.map((article) => {
          console.log(`📍 Placing marker for "${article.title}" at ${article.latitude.toFixed(4)}, ${article.longitude.toFixed(4)}`);
          
          const getCategoryColor = (category: string) => {
            const colors = {
              'BREAKING': 'bg-ios-red',
              'LOCAL': 'bg-ios-blue',
              'CIVIC': 'bg-ios-orange',
              'SPORTS': 'bg-ios-green',
            };
            return colors[category as keyof typeof colors] || 'bg-ios-blue';
          };

          return (
            <Marker
              key={article.id}
              position={[article.latitude, article.longitude]}
              icon={createCustomIcon(article.category, article.isBreaking || false)}
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
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full text-white ${getCategoryColor(article.category)}`}>
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