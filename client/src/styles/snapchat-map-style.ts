// Snapchat-style map configuration for MapLibre GL
// Mint-green landmasses with soft blue oceans

export const snapchatMapStyle = {
  version: 8,
  name: "Snapchat Style",
  sources: {
    "osm": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#C5E1F5" // Soft blue ocean
      }
    },
    {
      id: "osm-tiles",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.92,
        "raster-hue-rotate": 20, // Shift toward green
        "raster-saturation": -0.2, // Desaturate for pastel effect
        "raster-brightness-min": 0.15,
        "raster-brightness-max": 1.15, // Lighten overall
        "raster-contrast": -0.1 // Soften
      }
    }
  ]
};
