import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send } from "lucide-react";
import type { NewsArticle } from "@shared/schema";

interface WitnessReportFormProps {
  article?: NewsArticle;
}

const ANONYMOUS_USERNAMES = [
  "@Shadow1", "@Witness42", "@Observer9", "@Truth_Seeker", 
  "@Anonymous_Eye", "@WatchDog7", "@Insider101", "@Silent_Voice"
];

function getRandomUsername() {
  return ANONYMOUS_USERNAMES[Math.floor(Math.random() * ANONYMOUS_USERNAMES.length)];
}

export function WitnessReportForm({ article }: WitnessReportFormProps) {
  const [content, setContent] = useState("");
  const [anonymousUsername] = useState(getRandomUsername());
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports", {
        articleId: article?.id,
        content,
        anonymousUsername,
        location: article?.location,
        latitude: article?.latitude,
        longitude: article?.longitude,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your anonymous witness report has been saved",
      });
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Could not submit witness report",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty Report",
        description: "Please enter your witness report",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700" data-testid="card-witness-report">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-400" />
          Anonymous Witness Report
        </CardTitle>
        <p className="text-sm text-gray-400">
          Posting as: <span className="text-purple-400 font-mono">{anonymousUsername}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share what you witnessed or know about this event..."
          className="min-h-32 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          data-testid="textarea-witness-content"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {content.length} characters
          </span>
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !content.trim()}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
            data-testid="button-submit-report"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </div>

        <p className="text-xs text-gray-500 italic">
          All reports are anonymous and help build a comprehensive view of events
        </p>
      </CardContent>
    </Card>
  );
}
