import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BiasAnalysis, NewsArticle } from "@shared/schema";
import { Brain, TrendingUp, AlertCircle } from "lucide-react";
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
    mutationFn: async (tag: BiasTag) => {
      const response = await apiRequest("POST", "/api/bias", {
        articleId: article.id,
        manualTag: tag,
        aiPrediction: aiResult?.prediction,
        aiConfidence: aiResult?.confidence,
        aiSummary: aiResult?.summary,
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
    if (isPro && !existingAnalysis && !aiResult) {
      runAIAnalysis();
    }
  }, [isPro, existingAnalysis]);

  if (!isPro) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🔒 AI Bias Analysis - Pro Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Upgrade to Pro to unlock AI-powered bias detection and analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || aiAnalyzing) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getTagColor = (tag: BiasTag) => {
    switch (tag) {
      case "left":
        return "bg-blue-600 hover:bg-blue-500";
      case "center":
        return "bg-gray-600 hover:bg-gray-500";
      case "right":
        return "bg-red-600 hover:bg-red-500";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700" data-testid="card-bias-analysis">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Bias Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiResult && (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700" data-testid="ai-prediction">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                AI Suggestion:
              </span>
              <Badge className={`${getTagColor(aiResult.prediction)} text-white`}>
                {aiResult.prediction.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">
                Confidence: {(aiResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {aiResult.summary && (
              <p className="text-xs text-gray-400 italic mt-2">
                "{aiResult.summary}"
              </p>
            )}
          </div>
        )}

        {existingAnalysis && (
          <div className="p-4 bg-green-900/20 rounded-lg border border-green-700" data-testid="saved-analysis">
            <p className="text-sm text-green-300">
              ✓ Tagged as <strong>{existingAnalysis.manualTag?.toUpperCase()}</strong>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Manual Bias Tag:</label>
          <div className="grid grid-cols-3 gap-2">
            {(["left", "center", "right"] as BiasTag[]).map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className={`${
                  selectedTag === tag
                    ? getTagColor(tag)
                    : "border-gray-600 text-gray-300 hover:bg-gray-800"
                }`}
                onClick={() => setSelectedTag(tag)}
                data-testid={`button-tag-${tag}`}
              >
                {tag.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => selectedTag && saveMutation.mutate(selectedTag)}
          disabled={!selectedTag || saveMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          data-testid="button-save-analysis"
        >
          {saveMutation.isPending ? "Saving..." : "Save Analysis"}
        </Button>
      </CardContent>
    </Card>
  );
}
