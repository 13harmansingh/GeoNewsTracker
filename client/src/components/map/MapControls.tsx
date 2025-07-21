import { Plus, Minus, Navigation } from "lucide-react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterLocation: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut, onCenterLocation }: MapControlsProps) {
  return (
    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20">
      <div className="glass-morphism rounded-2xl p-2 space-y-2 shadow-lg">
        <button 
          onClick={onZoomIn}
          className="block w-12 h-12 rounded-xl touch-feedback hover:bg-white hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-gray-800" />
        </button>
        
        <div className="w-8 h-px bg-gray-300 mx-auto"></div>
        
        <button 
          onClick={onZoomOut}
          className="block w-12 h-12 rounded-xl touch-feedback hover:bg-white hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center"
        >
          <Minus className="w-5 h-5 text-gray-800" />
        </button>
        
        <div className="w-8 h-px bg-gray-300 mx-auto"></div>
        
        <button 
          onClick={onCenterLocation}
          className="block w-12 h-12 rounded-xl touch-feedback hover:bg-white hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center"
        >
          <Navigation className="w-5 h-5 text-gray-800" />
        </button>
      </div>
    </div>
  );
}