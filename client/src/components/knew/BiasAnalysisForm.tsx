import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BiasAnalysis, NewsArticle } from "@shared/schema";
import { Brain, TrendingUp, AlertCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleSentimentMeter } from "./ArticleSentimentMeter";

interface BiasAnalysisFormProps {
  article: NewsArticle;
  isPro: boolean;
}

type BiasTag = "left" | "center" | "right";

export function BiasAnalysisForm({ article, isPro }: BiasAnalysisFormProps) {
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ prediction: BiasTag; confidence: number; summary: string } | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const { toast } = useToast();

  const { data: existingAnalysis, isLoading } = useQuery<BiasAnalysis | null>({
    queryKey: ["/api/bias", article.id],
    enabled: isPro,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { tag: BiasTag; aiData?: { prediction: BiasTag; confidence: number; summary: string } }) => {
      const response = await apiRequest("POST", "/api/bias", {
        articleId: article.id,
        manualTag: payload.tag,
        aiPrediction: payload.aiData?.prediction || aiResult?.prediction,
        aiConfidence: payload.aiData?.confidence || aiResult?.confidence,
        aiSummary: payload.aiData?.summary || aiResult?.summary,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bias", article.id] });
    },
    onError: (error) => {
      console.error('Failed to save bias analysis:', error);
    },
  });

  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/ai/detect-bias", {
        text: article.content || article.summary,
      });
      const data = await response.json();
      setAiResult(data);

      // Auto-save silently when confidence > 75%
      if (data.confidence > 0.75) {
        console.log(`🤖 Auto-saving bias analysis "${data.prediction}" with ${(data.confidence * 100).toFixed(0)}% confidence`);
        saveMutation.mutate({ tag: data.prediction, aiData: data });
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  useEffect(() => {
    // Load cached AI result from existing analysis
    if (existingAnalysis && existingAnalysis.aiPrediction) {
      setAiResult({
        prediction: existingAnalysis.aiPrediction as BiasTag,
        confidence: existingAnalysis.aiConfidence || 0,
        summary: existingAnalysis.aiSummary || "",
      });
    } else if (isPro && !existingAnalysis && !aiResult) {
      // Run AI analysis if no cached data
      runAIAnalysis();
    }
  }, [isPro, existingAnalysis]);


  if (isLoading || aiAnalyzing) {
    return (
      <div className="glass-morphism rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-500 animate-pulse" />
          <h3 className="font-semibold text-gray-900">Analyzing bias...</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full bg-gray-200" />
          <Skeleton className="h-10 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  const getTagColor = (tag: BiasTag) => {
    switch (tag) {
      case "left":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "center":
        return "bg-gray-500 hover:bg-gray-600 text-white";
      case "right":
        return "bg-red-500 hover:bg-red-600 text-white";
    }
  };

  const getTagBadgeColor = (tag: BiasTag) => {
    switch (tag) {
      case "left":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "center":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "right":
        return "bg-red-100 text-red-700 border-red-300";
    }
  };

  return (
    <div className="glass-morphism rounded-2xl p-6 mb-4" data-testid="card-bias-analysis">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-gray-900">AI Bias Analysis</h3>
        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Pro
        </Badge>
      </div>

      {aiResult && (
        <div className="space-y-4">
          {/* AI Bias Prediction - Read Only */}
          <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm" data-testid="ai-prediction">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertCircle className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Political Leaning:
                </span>
                <Badge className={`${getTagBadgeColor(aiResult.prediction)} border`}>
                  {aiResult.prediction.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                Confidence: {(aiResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            {/* Collapsible AI Summary */}
            {aiResult.summary && (
              <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors w-full"
                  data-testid="button-toggle-summary"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Neutral Summary (80 words)</span>
                  {summaryExpanded ? (
                    <ChevronUp className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  )}
                </button>
                {summaryExpanded && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-2 leading-relaxed bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg" data-testid="ai-summary-text">
                    "{aiResult.summary}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Article Sentiment Explanation */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700" data-testid="sentiment-explanation">
            <div className="flex items-start gap-3">
              <ArticleSentimentMeter sentiment={article.sentiment} compact={false} />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  What does this sentiment mean?
                </h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {article.sentiment > 0.3 ? (
                    <>
                      <strong>Positive:</strong> This article contains optimistic language, uplifting news, or favorable outcomes. The tone suggests good developments or constructive perspectives.
                    </>
                  ) : article.sentiment < -0.3 ? (
                    <>
                      <strong>Negative:</strong> This article discusses challenging issues, conflicts, or concerning developments. The language reflects serious or difficult topics.
                    </>
                  ) : (
                    <>
                      <strong>Neutral:</strong> This article maintains balanced, factual reporting without strong emotional language. It presents information objectively.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
