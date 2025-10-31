import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import type { NewsArticle } from "@shared/schema";
import HeatmapLayer from "./HeatmapLayer";
import "leaflet/dist/leaflet.css";

interface ZoneData {
  country: string;
  countryCode: string;
  articles: NewsArticle[];
  center: [number, number];
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
  language: string;
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
  language,
  onAreaClick,
  zoneData,
  onZoneClick
}: InteractiveMapProps) {
  const mapRef = useRef<any>(null);

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
          <>
            <Circle
              center={zoneData.center}
              radius={300000} // 300km radius for country-level zone
              pathOptions={{
                fillColor: '#007AFF',
                fillOpacity: 0,
                color: 'transparent',
                weight: 0
              }}
              eventHandlers={{
                click: () => {
                  console.log(`🌍 Zone clicked: ${zoneData.country} (${zoneData.articles.length} articles)`);
                  if (onZoneClick) {
                    onZoneClick();
                  }
                }
              }}
            />
            <HeatmapLayer news={zoneData.articles} onMarkerClick={onMarkerClick} />
          </>
        )}

        {/* Global Heatmap - shows all news as organic heat blobs */}
        {!isLoading && !zoneData && news && Array.isArray(news) && news.length > 0 && (
          <HeatmapLayer news={news} onMarkerClick={onMarkerClick} />
        )}
      </MapContainer>

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="glass-morphism rounded-2xl p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue mx-auto mb-4"></div>
            <p className="text-sm text-gray-600" data-testid="loading-feeds">Pulling feeds in {language.toUpperCase()}...</p>
          </div>
        </div>
      )}
    </div>
  );
}