import { useQuery } from "@tanstack/react-query";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Sparkles } from "lucide-react";
import type { MediaOwnership } from "@shared/schema";

ChartJS.register(ArcElement, Tooltip, Legend);

interface OwnershipChartProps {
  sourceName: string;
  isPro: boolean;
}

const CHART_COLORS = ["#FF4500", "#0000FF", "#FFD700", "#34C759", "#FF1493", "#00CED1"];

export function OwnershipChart({ sourceName, isPro }: OwnershipChartProps) {
  const { data: ownership, isLoading } = useQuery<MediaOwnership | null>({
    queryKey: ["/api/ownership", sourceName],
    enabled: isPro && !!sourceName,
  });


  if (isLoading) {
    return (
      <div className="glass-morphism rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-ios-blue animate-pulse" />
          <h3 className="font-semibold text-gray-900">Loading ownership data...</h3>
        </div>
        <Skeleton className="h-64 w-full bg-gray-200" />
      </div>
    );
  }

  if (!ownership) {
    return (
      <div className="glass-morphism rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Media Ownership</h3>
        </div>
        <p className="text-sm text-gray-600">
          No ownership data available for {sourceName}
        </p>
      </div>
    );
  }

  const ownershipData = ownership.ownershipData as Record<string, number>;
  const labels = Object.keys(ownershipData);
  const values = Object.values(ownershipData);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#374151",
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            return `${label}: ${value}%`;
          },
        },
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#111827",
        bodyColor: "#374151",
        borderColor: "#E5E7EB",
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="glass-morphism rounded-2xl p-6 mb-4" data-testid="card-ownership-chart">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-ios-blue" />
        <h3 className="font-semibold text-gray-900">{sourceName} Ownership</h3>
        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Pro
        </Badge>
      </div>

      <div className="bg-white/60 rounded-xl p-4 border border-gray-200">
        <div className="h-64 mb-4">
          <Pie data={chartData} options={options} />
        </div>
        <div className="space-y-2 border-t border-gray-200 pt-4">
          {labels.map((label, index) => (
            <div key={label} className="flex justify-between items-center text-sm" data-testid={`ownership-item-${index}`}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index] }}
                ></div>
                <span className="text-gray-700 font-medium">{label}</span>
              </div>
              <span className="text-gray-900 font-bold">{values[index]}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
