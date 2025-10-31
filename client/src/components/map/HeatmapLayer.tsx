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
}

export default function HeatmapLayer({ news, onMarkerClick }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!news || news.length === 0) return;

    // Create heatmap data points with intensity based on article count
    const heatData: Array<[number, number, number]> = news.map((article) => [
      article.latitude,
      article.longitude,
      0.8, // Intensity (0-1) - can be adjusted based on article properties
    ]);

    // Create heatmap layer with Snapchat-style gradient (red → yellow)
    const heatLayer = L.heatLayer(heatData, {
      radius: 35, // Larger radius for organic blob shapes
      blur: 25, // High blur for smooth, organic edges
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      // Snapchat-style gradient: red (high concentration) → yellow (low concentration)
      gradient: {
        0.0: '#FFEB3B',  // Yellow (low)
        0.2: '#FFC107',  // Amber
        0.4: '#FF9800',  // Orange
        0.6: '#FF5722',  // Deep Orange
        0.8: '#F44336',  // Red
        1.0: '#D32F2F',  // Dark Red (high)
      }
    }).addTo(map);

    // Add click handlers for interactive heatmap
    if (onMarkerClick) {
      map.on('click', (e) => {
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
      });
    }

    // Cleanup on unmount
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, news, onMarkerClick]);

  return null;
}
