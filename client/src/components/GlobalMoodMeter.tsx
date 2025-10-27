import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentMetrics {
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  totalArticles: number;
}

export function GlobalMoodMeter() {
  const { language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  const { data: sentiment, isLoading } = useQuery<SentimentMetrics>({
    queryKey: ['/api/sentiment', language],
    queryFn: async () => {
      const response = await fetch(`/api/sentiment?language=${language}`);
      if (!response.ok) throw new Error('Failed to fetch sentiment');
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000 // Consider stale after 4 minutes
  });

  if (isLoading || !sentiment) {
    return null; // Hide while loading
  }

  const getMoodEmoji = () => {
    if (sentiment.positive > 50) return '😊';
    if (sentiment.negative > 50) return '😟';
    return '😐';
  };

  const getMoodLabel = () => {
    if (sentiment.positive > 50) return 'Positive';
    if (sentiment.negative > 50) return 'Concerned';
    return 'Neutral';
  };

  const getMoodColor = () => {
    if (sentiment.positive > 50) return 'text-green-600';
    if (sentiment.negative > 50) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div 
      className="fixed top-20 right-4 z-[400] w-72"
      data-testid="global-mood-meter"
    >
      <Card 
        className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/20 shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-300"
        onClick={() => setShowDetails(!showDetails)}
        data-testid="mood-meter-card"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                KNEW Global Mood Meter
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time sentiment analysis
              </p>
            </div>
            <div className="text-3xl" data-testid="mood-emoji">
              {getMoodEmoji()}
            </div>
          </div>

          {/* Primary Stat */}
          <div className="mb-3">
            <div className={`text-2xl font-bold ${getMoodColor()}`} data-testid="mood-label">
              {getMoodLabel()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="article-count">
              Based on {sentiment.totalArticles} articles
            </div>
          </div>

          {/* Sentiment Bars */}
          <div className="space-y-2">
            {/* Positive */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>Positive</span>
                </div>
                <span className="font-semibold" data-testid="positive-percentage">
                  {sentiment.positive}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${sentiment.positive}%` }}
                  data-testid="positive-bar"
                />
              </div>
            </div>

            {/* Neutral */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Minus className="w-3 h-3" />
                  <span>Neutral</span>
                </div>
                <span className="font-semibold" data-testid="neutral-percentage">
                  {sentiment.neutral}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-400 transition-all duration-500"
                  style={{ width: `${sentiment.neutral}%` }}
                  data-testid="neutral-bar"
                />
              </div>
            </div>

            {/* Negative */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  <span>Concerned</span>
                </div>
                <span className="font-semibold" data-testid="negative-percentage">
                  {sentiment.negative}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${sentiment.negative}%` }}
                  data-testid="negative-bar"
                />
              </div>
            </div>
          </div>

          {/* Details (expandable) */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between items-center" data-testid="sentiment-details">
                <span>Average Score:</span>
                <span className="font-semibold" data-testid="average-score">
                  {sentiment.averageScore.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-xs italic">
                Powered by World News API sentiment analysis across global sources like CNN, BBC, and Al Jazeera.
              </p>
            </div>
          )}

          {/* Click to expand hint */}
          <div className="mt-2 text-center text-xs text-gray-400">
            {showDetails ? 'Click to collapse' : 'Click for details'}
          </div>
        </div>
      </Card>
    </div>
  );
}
