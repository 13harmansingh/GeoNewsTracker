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

const DEFAULT_GRADIENT = {
  0.0: '#FFEB3B',  // Yellow (low)
  0.2: '#FFC107',  // Amber
  0.4: '#FF9800',  // Orange
  0.6: '#FF5722',  // Deep Orange
  0.8: '#F44336',  // Red
  1.0: '#D32F2F',  // Dark Red (high)
};

export const FETCHED_ZONE_GRADIENT = {
  0.0: '#81D4FA',  // Light Blue (low)
  0.2: '#4FC3F7',  // Blue
  0.4: '#29B6F6',  // Bright Blue
  0.6: '#039BE5',  // Deep Blue
  0.8: '#26C6DA',  // Cyan
  1.0: '#00ACC1',  // Dark Cyan (high)
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

    // Create heatmap layer with configurable gradient
    const heatLayer = L.heatLayer(heatData, {
      radius: 35, // Larger radius for organic blob shapes
      blur: 25, // High blur for smooth, organic edges
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
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
