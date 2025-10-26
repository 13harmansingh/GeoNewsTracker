import { Clock } from "lucide-react";

interface MarkerTooltipProps {
  title: string;
  category: string;
  publishedAt: Date | string | null;
  position: { x: number; y: number };
  isVisible: boolean;
}

export default function MarkerTooltip({ 
  title, 
  category, 
  publishedAt, 
  position, 
  isVisible 
}: MarkerTooltipProps) {
  if (!isVisible) return null;

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Unknown time';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Unknown time';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors = {
      'BREAKING': 'bg-ios-red',
      'LOCAL': 'bg-ios-blue',
      'CIVIC': 'bg-ios-orange',
      'SPORTS': 'bg-ios-green',
    };
    return colors[cat as keyof typeof colors] || 'bg-ios-blue';
  };

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 100}px`, // Position above the marker
        transform: 'translateX(-50%)',
      }}
    >
      <div className="glass-morphism rounded-xl p-3 shadow-2xl max-w-xs animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full text-white ${getCategoryColor(category)}`}>
            {category}
          </span>
          <span className="text-xs text-gray-600 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatTimeAgo(publishedAt)}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
          {title}
        </h4>
      </div>
      {/* Arrow pointing down to marker */}
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white/80 mx-auto"></div>
    </div>
  );
}
