import { Zap, MapPin, Trophy, CloudSun } from "lucide-react";

interface ActionBarProps {
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export default function ActionBar({ activeFilter, onFilterChange }: ActionBarProps) {
  const filters = [
    { 
      id: 'breaking', 
      label: 'Breaking', 
      icon: Zap, 
      color: 'text-ios-red',
      category: 'BREAKING'
    },
    { 
      id: 'local', 
      label: 'Local', 
      icon: MapPin, 
      color: 'text-ios-blue',
      category: 'LOCAL'
    },
    { 
      id: 'sports', 
      label: 'Sports', 
      icon: Trophy, 
      color: 'text-ios-green',
      category: 'SPORTS'
    },
    { 
      id: 'weather', 
      label: 'Weather', 
      icon: CloudSun, 
      color: 'text-ios-orange',
      category: 'WEATHER'
    },
  ];

  return (
    <div className="absolute bottom-4 left-3 right-3 z-30 safe-area-bottom">
      <div className="glass-morphism rounded-3xl shadow-lg">
        <div className="flex items-center justify-around px-4 py-4">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.category;
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.category)}
                className={`
                  touch-feedback flex flex-col items-center transition-all duration-300 p-2 rounded-2xl
                  ${isActive ? 'transform scale-105 bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'}
                `}
              >
                <div className={`
                  p-3 rounded-2xl transition-all duration-300 mb-2
                  ${isActive ? 'bg-white bg-opacity-25 shadow-md' : ''}
                `}>
                  <Icon className={`w-6 h-6 ${filter.color} ${isActive ? 'drop-shadow-sm' : ''}`} />
                </div>
                <span className={`
                  text-xs font-medium transition-all duration-300
                  ${isActive ? 'text-gray-900 font-bold' : 'text-gray-700'}
                `}>
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}