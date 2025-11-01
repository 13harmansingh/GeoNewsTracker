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

    // Create heatmap layer with static radius/blur for smooth zoom transitions
    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 50,
      blur: 35,
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

    // Cleanup
    return () => {
      if (clickListener) {
        map.off('click', clickListener);
      }
      map.removeLayer(heatLayer);
    };
  }, [countries, map, onClick, gradient]);

  return null;
});

export default CountryHeatmapLayer;
