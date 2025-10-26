import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { EventHistory } from "@shared/schema";
import { Clock, FileText, MessageSquare, TrendingUp } from "lucide-react";

export function HistoryDashboard() {
  const { data: history = [], isLoading } = useQuery<EventHistory[]>({
    queryKey: ["/api/history"],
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "news":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "tag":
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case "report":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "news":
        return "bg-blue-50 border-blue-200";
      case "tag":
        return "bg-purple-50 border-purple-200";
      case "report":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-morphism border-gray-200 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism border-gray-200 shadow-lg" data-testid="card-history-dashboard">
      <CardHeader>
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Event History Archive
        </CardTitle>
        <p className="text-sm text-gray-600">
          {history.length} events tracked
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No events yet. Start exploring news and adding reports!
              </p>
            ) : (
              history.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border ${getEventColor(event.eventType)} transition-all hover:scale-105 hover:shadow-md`}
                  data-testid={`event-${event.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <Badge variant="outline" className="text-xs bg-white">
                        {event.eventType.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {event.summary}
                  </p>

                  {event.location && (
                    <p className="text-xs text-gray-500">
                      📍 {event.location}
                      {event.country && ` (${event.country.toUpperCase()})`}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
