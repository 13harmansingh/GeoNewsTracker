import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { NewsArticle } from "@shared/schema";

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: any
  ): any;
}

interface HeatmapLayerProps {
  news: NewsArticle[];
  onMarkerClick?: (article: NewsArticle) => void;
  gradient?: Record<string, string>;
  id?: string;
}

// Snapchat-style gradient: blue → cyan → yellow → orange → red
const DEFAULT_GRADIENT = {
  0.0: '#3B82F6',  // Blue (low density)
  0.25: '#06B6D4', // Cyan
  0.5: '#FBBF24',  // Yellow
  0.75: '#F97316', // Orange
  1.0: '#EF4444',  // Red (high density)
};

export const FETCHED_ZONE_GRADIENT = {
  0.0: '#60A5FA',  // Light Blue (low)
  0.3: '#3B82F6',  // Blue
  0.5: '#2563EB',  // Darker Blue
  0.7: '#06B6D4',  // Cyan
  1.0: '#0891B2',  // Deep Cyan (high)
};

export default function HeatmapLayer({ news, onMarkerClick, gradient = DEFAULT_GRADIENT, id = 'default' }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!news || news.length === 0) return;

    // Create heatmap data points with intensity based on article count
    const heatData: Array<[number, number, number]> = news.map((article) => [
      article.latitude,
      article.longitude,
      0.8, // Intensity (0-1) - can be adjusted based on article properties
    ]);

    // Create heatmap layer with static radius/blur for smooth zoom transitions
    // Leaflet will handle zoom animations naturally without recreating the layer
    const heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 20,
      max: 1.0,
      minOpacity: 0.5,
      gradient: gradient
    }).addTo(map);

    // Click handler for interactive heatmap
    const handleHeatmapClick = (e: L.LeafletMouseEvent) => {
      if (!onMarkerClick) return;

      // Find nearest article to click point
      let nearestArticle: NewsArticle | null = null;
      let minDistance = Infinity;

      news.forEach((article) => {
        const articleLatLng = L.latLng(article.latitude, article.longitude);
        const clickLatLng = e.latlng;
        const distance = articleLatLng.distanceTo(clickLatLng);

        // Within 50km radius
        if (distance < 50000 && distance < minDistance) {
          minDistance = distance;
          nearestArticle = article;
        }
      });

      if (nearestArticle) {
        onMarkerClick(nearestArticle);
      }
    };

    // Add click handler if callback provided
    if (onMarkerClick) {
      map.on('click', handleHeatmapClick);
    }

    // Cleanup on unmount - CRITICAL: remove click listener to prevent memory leaks
    return () => {
      map.removeLayer(heatLayer);
      if (onMarkerClick) {
        map.off('click', handleHeatmapClick);
      }
    };
  }, [map, news, onMarkerClick, gradient, id]);

  return null;
}
