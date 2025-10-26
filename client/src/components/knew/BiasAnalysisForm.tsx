import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BiasAnalysis, NewsArticle } from "@shared/schema";
import { Brain, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BiasAnalysisFormProps {
  article: NewsArticle;
  isPro: boolean;
}

type BiasTag = "left" | "center" | "right";

export function BiasAnalysisForm({ article, isPro }: BiasAnalysisFormProps) {
  const [selectedTag, setSelectedTag] = useState<BiasTag | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ prediction: BiasTag; confidence: number; summary: string } | null>(null);
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
      toast({
        title: "Bias Tag Saved",
        description: "Your analysis has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bias", article.id] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save bias analysis",
        variant: "destructive",
      });
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
      setSelectedTag(data.prediction);

      // Auto-save when confidence > 75%
      if (data.confidence > 0.75) {
        console.log(`🤖 Auto-applying bias tag "${data.prediction}" with ${(data.confidence * 100).toFixed(0)}% confidence`);
        saveMutation.mutate({ tag: data.prediction, aiData: data });
      }
    } catch (error) {
      toast({
        title: "AI Analysis Failed",
        description: "Could not analyze bias",
        variant: "destructive",
      });
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
      setSelectedTag(existingAnalysis.manualTag as BiasTag || existingAnalysis.aiPrediction as BiasTag);
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
        <div className="p-4 bg-white/60 rounded-xl border border-gray-200 mb-4 shadow-sm" data-testid="ai-prediction">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-purple-500" />
              AI Suggestion:
            </span>
            <Badge className={`${getTagBadgeColor(aiResult.prediction)} border`}>
              {aiResult.prediction.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 font-medium">
              Confidence: {(aiResult.confidence * 100).toFixed(0)}%
            </span>
          </div>
          {aiResult.summary && (
            <p className="text-xs text-gray-700 italic mt-2 leading-relaxed">
              "{aiResult.summary}"
            </p>
          )}
        </div>
      )}

      {existingAnalysis && (
        <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-4" data-testid="saved-analysis">
          <p className="text-sm text-green-700 font-medium">
            ✓ Tagged as <strong>{existingAnalysis.manualTag?.toUpperCase()}</strong>
          </p>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-sm text-gray-700 font-medium">Manual Bias Tag:</label>
        <div className="grid grid-cols-3 gap-2">
          {(["left", "center", "right"] as BiasTag[]).map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className={`${
                selectedTag === tag
                  ? getTagColor(tag)
                  : "border-gray-300 text-gray-700 hover:bg-gray-100 bg-white"
              } transition-all touch-feedback`}
              onClick={() => setSelectedTag(tag)}
              data-testid={`button-tag-${tag}`}
            >
              {tag.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => selectedTag && saveMutation.mutate({ tag: selectedTag })}
        disabled={!selectedTag || saveMutation.isPending}
        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white mt-4 touch-feedback"
        data-testid="button-save-analysis"
      >
        {saveMutation.isPending ? "Saving..." : "Save Analysis"}
      </Button>
    </div>
  );
}
