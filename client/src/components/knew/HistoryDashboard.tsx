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
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "tag":
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case "report":
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "news":
        return "bg-blue-900/20 border-blue-700";
      case "tag":
        return "bg-purple-900/20 border-purple-700";
      case "report":
        return "bg-green-900/20 border-green-700";
      default:
        return "bg-gray-900/20 border-gray-700";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
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
    <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700" data-testid="card-history-dashboard">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Event History Archive
        </CardTitle>
        <p className="text-sm text-gray-400">
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
                  className={`p-4 rounded-lg border ${getEventColor(event.eventType)} transition-all hover:scale-105`}
                  data-testid={`event-${event.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <Badge variant="outline" className="text-xs">
                        {event.eventType.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-2">
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
