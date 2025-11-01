import { useEffect, memo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { CountryData } from "@/utils/countryAggregation";

interface CountryHeatmapLayerProps {
  countries: CountryData[];
  onClick?: (country: CountryData) => void;
  gradient?: { [key: number]: string };
}

const CountryHeatmapLayer = memo(function CountryHeatmapLayer({ 
  countries, 
  onClick,
  gradient = {
    0.0: '#3b82f6',  // Blue
    0.3: '#06b6d4',  // Cyan
    0.5: '#10b981',  // Green
    0.7: '#f59e0b',  // Amber
    1.0: '#ef4444'   // Red
  }
}: CountryHeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!countries || countries.length === 0) return;

    console.log(`🌍 Rendering ${countries.length} country-level heatmaps`);

    // Create one heat point per country at its center
    // Intensity is normalized (0-1) based on article count
    const heatPoints: [number, number, number][] = countries.map(country => {
      const [lat, lng] = country.center;
      // Scale intensity to be more visible (multiply by 2, cap at 1)
      const scaledIntensity = Math.min(country.intensity * 2, 1);
      return [lat, lng, scaledIntensity];
    });

    // Calculate zoom-appropriate radius/blur
    const getHeatmapRadius = (zoom: number) => {
      const scale = Math.pow(1.25, zoom - 4);
      return Math.max(25, Math.min(35 * scale, 80));
    };

    const getHeatmapBlur = (zoom: number) => {
      const scale = Math.pow(1.25, zoom - 4);
      return Math.max(18, Math.min(25 * scale, 60));
    };

    // Create initial heatmap layer
    let heatLayer = (L as any).heatLayer(heatPoints, {
      radius: getHeatmapRadius(map.getZoom()),
      blur: getHeatmapBlur(map.getZoom()),
      maxZoom: 20,
      max: 1.0,
      gradient
    });
    heatLayer.addTo(map);

    // Add click handler if provided
    let clickListener: ((e: L.LeafletMouseEvent) => void) | null = null;
    
    if (onClick) {
      clickListener = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Find nearest country (within 500km radius)
        let nearestCountry: CountryData | null = null;
        let minDistance = 500; // Max 500km

        countries.forEach(country => {
          const [countryLat, countryLng] = country.center;
          const distance = Math.sqrt(
            Math.pow(lat - countryLat, 2) + 
            Math.pow(lng - countryLng, 2)
          ) * 111; // Rough km conversion

          if (distance < minDistance) {
            minDistance = distance;
            nearestCountry = country as CountryData;
          }
        });

        if (nearestCountry) {
          const country = nearestCountry as CountryData;
          console.log(`🗺️ Country heatmap clicked: ${country.country} (${country.count} articles)`);
          
          // Stop propagation to prevent triggering the general map click handler
          (e as any).originalEvent?.stopPropagation();
          L.DomEvent.stopPropagation(e as any);
          
          onClick(country);
        }
      };

      // Use a higher priority for country heatmap clicks
      map.on('click', clickListener);
    }

    // Smooth zoom handler - updates radius/blur without recreating layer
    const handleZoom = () => {
      const currentZoom = map.getZoom();
      
      // Update internal options and redraw (avoids layer destruction/recreation)
      heatLayer.setOptions({
        radius: getHeatmapRadius(currentZoom),
        blur: getHeatmapBlur(currentZoom)
      });
      heatLayer.redraw();
    };

    // Listen to 'zoom' event for smooth updates
    map.on('zoom', handleZoom);

    // Cleanup
    return () => {
      if (clickListener) {
        map.off('click', clickListener);
      }
      map.off('zoom', handleZoom);
      map.removeLayer(heatLayer);
    };
  }, [countries, map, onClick, gradient]);

  return null;
});

export default CountryHeatmapLayer;
