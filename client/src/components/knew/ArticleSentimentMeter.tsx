import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArticleSentimentMeterProps {
  sentiment: number | null;
  compact?: boolean;
}

export function ArticleSentimentMeter({ sentiment, compact = false }: ArticleSentimentMeterProps) {
  if (sentiment === null || sentiment === undefined) {
    return null;
  }

  // Convert sentiment from -1 to +1 scale to percentage
  // Positive: > 0.1, Neutral: -0.1 to 0.1, Negative: < -0.1
  const getCategory = () => {
    if (sentiment > 0.1) return 'positive';
    if (sentiment < -0.1) return 'negative';
    return 'neutral';
  };

  const category = getCategory();
  const percentage = Math.round(Math.abs(sentiment) * 100);

  const getMoodIcon = () => {
    switch (category) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getMoodLabel = () => {
    switch (category) {
      case 'positive':
        return 'Positive';
      case 'negative':
        return 'Concerned';
      default:
        return 'Neutral';
    }
  };

  const getBadgeColor = () => {
    switch (category) {
      case 'positive':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300';
      case 'negative':
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  if (compact) {
    return (
      <Badge 
        className={`${getBadgeColor()} border flex items-center gap-1.5 px-2 py-1`}
        data-testid="article-sentiment-compact"
      >
        {getMoodIcon()}
        <span className="text-xs font-medium">{getMoodLabel()}</span>
        <span className="text-xs opacity-75">{percentage}%</span>
      </Badge>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
      data-testid="article-sentiment-full"
    >
      <div className="flex items-center gap-1.5">
        {getMoodIcon()}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          KNEW Mood:
        </span>
      </div>
      <Badge className={`${getBadgeColor()} border`}>
        {getMoodLabel()} ({percentage}%)
      </Badge>
    </div>
  );
}
