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
    <div className="absolute bottom-6 left-4 right-4 z-30">
      <div className="glass-morphism rounded-2xl shadow-lg">
        <div className="flex items-center justify-around p-4">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.category;
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.category)}
                className={`
                  touch-feedback flex flex-col items-center transition-all duration-200
                  ${isActive ? 'transform scale-110' : ''}
                `}
              >
                <div className={`
                  p-2 rounded-full transition-all duration-200 mb-1
                  ${isActive ? 'bg-white bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'}
                `}>
                  <Icon className={`w-5 h-5 ${filter.color}`} />
                </div>
                <span className={`
                  text-xs font-medium transition-all duration-200
                  ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-700'}
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