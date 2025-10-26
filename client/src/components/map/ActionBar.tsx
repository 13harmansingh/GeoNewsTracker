import { Star, Globe, TrendingUp, Clock } from "lucide-react";

interface ActionBarProps {
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export default function ActionBar({ activeFilter, onFilterChange }: ActionBarProps) {
  const filters = [
    { 
      id: 'my-pins', 
      label: 'My Pins', 
      icon: Star, 
      color: 'text-purple-600',
      category: 'MY_PINS'
    },
    { 
      id: 'global', 
      label: 'Global', 
      icon: Globe, 
      color: 'text-ios-blue',
      category: 'GLOBAL'
    },
    { 
      id: 'trending', 
      label: 'Trending', 
      icon: TrendingUp, 
      color: 'text-ios-red',
      category: 'TRENDING'
    },
    { 
      id: 'recent', 
      label: 'Recent', 
      icon: Clock, 
      color: 'text-ios-green',
      category: 'RECENT'
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
                onClick={() => onFilterChange(activeFilter === filter.category ? null : filter.category)}
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