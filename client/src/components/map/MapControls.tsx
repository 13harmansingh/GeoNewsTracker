import { Plus, Minus, Navigation } from "lucide-react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterLocation: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut, onCenterLocation }: MapControlsProps) {
  return (
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 space-y-3">
      <button 
        onClick={onZoomIn}
        className="glass-morphism rounded-xl p-3 touch-feedback hover:bg-white hover:bg-opacity-30 transition-all shadow-lg"
      >
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
      
      <button 
        onClick={onZoomOut}
        className="glass-morphism rounded-xl p-3 touch-feedback hover:bg-white hover:bg-opacity-30 transition-all shadow-lg"
      >
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
      
      <button 
        onClick={onCenterLocation}
        className="glass-morphism rounded-xl p-3 touch-feedback hover:bg-white hover:bg-opacity-30 transition-all shadow-lg"
      >
        <Navigation className="w-5 h-5 text-ios-blue" />
      </button>
    </div>
  );
}