import { useEffect, useState, useRef } from "react";
import { X, Clock, MapPin, TrendingUp, Share, Eye, ArrowLeft } from "lucide-react";
import type { NewsArticle } from "@shared/schema";
import { BiasAnalysisForm } from "@/components/knew/BiasAnalysisForm";
import { OwnershipChart } from "@/components/knew/OwnershipChart";
import { useArticleExperience } from "@/contexts/ArticleExperienceContext";

interface NewsPanelProps {
  article: NewsArticle | null;
  isVisible: boolean;
  onClose: () => void;
  relatedNews: NewsArticle[];
  zoneArticles?: NewsArticle[];
  zoneName?: string;
}

export default function NewsPanel({ article, isVisible, onClose, relatedNews, zoneArticles, zoneName }: NewsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actualContent, setActualContent] = useState(false);
  const [showZoneList, setShowZoneList] = useState(false);
  const { isPro, openArticle } = useArticleExperience();
  const prevVisibleRef = useRef(false);

  // Track drawer open transition to show zone list only on initial open
  useEffect(() => {
    const isOpening = !prevVisibleRef.current && isVisible;
    prevVisibleRef.current = isVisible;

    if (!isVisible) {
      // Reset zone list state when drawer closes
      setShowZoneList(false);
    } else if (isOpening && zoneArticles && zoneArticles.length > 0) {
      // Only show zone list when drawer first opens with zone articles
      setShowZoneList(true);
    }
  }, [isVisible, zoneArticles]);

  useEffect(() => {
    if (isVisible && article) {
      // Skip loading if showing zone list
      if (zoneArticles && zoneArticles.length > 0) {
        setIsLoading(false);
        setActualContent(true);
        return;
      }
      
      setIsLoading(true);
      setActualContent(false);
      
      const timer = setTimeout(() => {
        setIsLoading(false);
        setActualContent(true);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isVisible, article, zoneArticles]);

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return 'Unknown time';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Unknown time';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'BREAKING': 'bg-ios-red',
      'LOCAL': 'bg-ios-blue',
      'CIVIC': 'bg-ios-orange',
      'SPORTS': 'bg-ios-green',
    };
    return colors[category as keyof typeof colors] || 'bg-ios-blue';
  };

  const handleShare = () => {
    if (navigator.share && article) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      });
    }
  };

  const handleRelatedArticleClick = (relatedArticle: NewsArticle) => {
    openArticle(relatedArticle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out
      ${isVisible ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="news-card rounded-t-3xl shadow-2xl min-h-[60vh] max-h-[85vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto max-h-[85vh]">
          {/* Handle Bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Back to zone list button */}
              {!showZoneList && zoneArticles && zoneArticles.length > 0 && (
                <button
                  onClick={() => setShowZoneList(true)}
                  className="touch-feedback p-2 rounded-full glass-morphism hover:bg-opacity-70 transition-all"
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h2 className="text-xl font-bold text-gray-900">
                {showZoneList && zoneName ? `News from ${zoneName}` :
                 article?.category === 'BREAKING' ? 'Breaking News' : 
                 article?.category === 'LOCAL' ? 'Local Updates' :
                 article?.category === 'CIVIC' ? 'City News' :
                 article?.category === 'SPORTS' ? 'Sports News' : 'News'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="touch-feedback p-2 rounded-full glass-morphism hover:bg-opacity-70 transition-all"
              data-testid="button-close-panel"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-48 bg-gray-300 rounded-xl"></div>
              <div className="h-4 bg-gray-300 rounded w-full"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          )}

          {/* Zone Article List View */}
          {showZoneList && zoneArticles && zoneArticles.length > 0 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2" data-testid="zone-title">
                  News from {zoneName}
                </h3>
                <p className="text-sm text-gray-600">
                  {zoneArticles.length} articles • Click to read
                </p>
              </div>

              <div className="space-y-3">
                {zoneArticles.map((zoneArticle) => (
                  <div
                    key={zoneArticle.id}
                    onClick={() => {
                      setShowZoneList(false);
                      openArticle(zoneArticle);
                    }}
                    className="glass-morphism rounded-xl p-4 cursor-pointer hover:bg-opacity-80 transition-all touch-feedback"
                    data-testid={`zone-article-${zoneArticle.id}`}
                  >
                    <div className="flex gap-3">
                      {zoneArticle.imageUrl && (
                        <img
                          src={zoneArticle.imageUrl}
                          alt={zoneArticle.title}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getCategoryColor(zoneArticle.category)}`}>
                            {zoneArticle.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(zoneArticle.publishedAt)}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                          {zoneArticle.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {zoneArticle.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actual Content */}
          {!showZoneList && actualContent && article && (
            <div className="animate-fade-in space-y-4">
              {/* Article Meta */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className={`
                    inline-block px-3 py-1 text-xs font-semibold rounded-full text-white
                    ${getCategoryColor(article.category)}
                  `}>
                    {article.category}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>
              </div>
              
              {/* Article Image */}
              {article.imageUrl && (
                <img 
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-48 object-cover rounded-xl shadow-md"
                  data-testid="article-image"
                />
              )}
              
              {/* Article Title and Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3 leading-tight" data-testid="article-title">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed" data-testid="article-summary">
                  {article.summary}
                </p>
              </div>

              {/* Article Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 text-sm leading-relaxed" data-testid="article-content">
                  {article.content}
                </p>
              </div>
              
              {/* Source Information */}
              {article.sourceName && (
                <div className="glass-morphism rounded-xl p-3 mb-4">
                  <p className="text-xs text-gray-600 mb-1">Source</p>
                  <p className="text-sm font-medium text-gray-800" data-testid="article-source">{article.sourceName}</p>
                  {article.country && (
                    <p className="text-xs text-gray-500">{article.country.toUpperCase()}</p>
                  )}
                </div>
              )}

              {/* Article Stats and Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {article.views || 0} views
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {article.location}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleShare}
                    className="touch-feedback p-2 rounded-full glass-morphism hover:bg-opacity-70 transition-all"
                    data-testid="button-share"
                  >
                    <Share className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    onClick={() => {
                      console.log('NewsPanel source button clicked, URL:', article.sourceUrl);
                      if (article.sourceUrl) {
                        try {
                          window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
                          console.log('Window.open called successfully from NewsPanel');
                        } catch (error) {
                          console.error('Error opening URL from NewsPanel:', error);
                        }
                      } else {
                        console.log('No source URL available for this article');
                      }
                    }}
                    disabled={!article.sourceUrl}
                    className={`px-4 py-2 rounded-full text-sm font-medium touch-feedback transition-all ${
                      article.sourceUrl 
                        ? 'bg-ios-blue text-white hover:bg-opacity-90' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    data-testid="button-source"
                  >
                    {article.sourceUrl ? 'Read Full Article' : 'Source Not Available'}
                  </button>
                </div>
              </div>

              {/* Pro Features Section - Vertically Stacked */}
              <div className="mt-8 space-y-4">
                {/* AI Bias Analysis */}
                <BiasAnalysisForm article={article} isPro={isPro} />

                {/* Media Ownership Chart */}
                {article.sourceName && (
                  <OwnershipChart sourceName={article.sourceName} isPro={isPro} />
                )}
              </div>

              {/* Related News */}
              {relatedNews.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">More Local News</h4>
                  <div className="space-y-3">
                    {relatedNews.map((relatedArticle) => (
                      <button
                        key={relatedArticle.id}
                        onClick={() => handleRelatedArticleClick(relatedArticle)}
                        className="w-full glass-morphism rounded-xl p-4 cursor-pointer touch-feedback hover:bg-opacity-70 transition-all text-left"
                        data-testid={`related-article-${relatedArticle.id}`}
                      >
                        <div className="flex space-x-3">
                          {relatedArticle.imageUrl && (
                            <img 
                              src={relatedArticle.imageUrl}
                              alt={relatedArticle.title}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm mb-1 line-clamp-2">
                              {relatedArticle.title}
                            </h5>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-600">
                                {formatTimeAgo(relatedArticle.publishedAt)}
                              </p>
                              <span className={`
                                inline-block px-2 py-1 text-xs font-medium rounded-full text-white
                                ${getCategoryColor(relatedArticle.category)}
                              `}>
                                {relatedArticle.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
