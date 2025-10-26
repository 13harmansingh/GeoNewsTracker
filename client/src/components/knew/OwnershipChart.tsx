import { useQuery } from "@tanstack/react-query";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaOwnership } from "@shared/schema";

ChartJS.register(ArcElement, Tooltip, Legend);

interface OwnershipChartProps {
  sourceName: string;
  isPro: boolean;
}

const CHART_COLORS = ["#FF4500", "#0000FF", "#FFD700", "#32CD32", "#FF1493", "#00CED1"];

export function OwnershipChart({ sourceName, isPro }: OwnershipChartProps) {
  const { data: ownership, isLoading } = useQuery<MediaOwnership | null>({
    queryKey: ["/api/ownership", sourceName],
    enabled: isPro && !!sourceName,
  });

  if (!isPro) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🔒 Media Ownership - Pro Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Upgrade to Pro to see who owns {sourceName}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!ownership) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Media Ownership</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            No ownership data available for {sourceName}
          </p>
        </CardContent>
      </Card>
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
        borderColor: "#1a1a1a",
        borderWidth: 2,
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
          color: "#ffffff",
          padding: 15,
          font: {
            size: 12,
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
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700" data-testid="card-ownership-chart">
      <CardHeader>
        <CardTitle className="text-white">
          {sourceName} Ownership Structure
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Pie data={chartData} options={options} />
        </div>
        <div className="mt-4 space-y-2">
          {labels.map((label, index) => (
            <div key={label} className="flex justify-between text-sm" data-testid={`ownership-item-${index}`}>
              <span className="text-gray-300">{label}</span>
              <span className="text-white font-semibold">{values[index]}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
