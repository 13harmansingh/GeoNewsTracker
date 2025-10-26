import { useQuery } from "@tanstack/react-query";
import { HistoryDashboard } from "@/components/knew/HistoryDashboard";
import { ProUpgradeButton } from "@/components/knew/ProUpgradeButton";
import NavigationBar from "@/components/map/NavigationBar";
import type { ProSubscription } from "@shared/schema";

export default function DashboardPage() {
  const { data: proStatus } = useQuery<{ isPro: boolean }>({
    queryKey: ["/api/pro/status"],
  });

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-950 via-black to-gray-900 overflow-hidden">
      <NavigationBar />
      
      <div className="container mx-auto p-6 mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              KNEW Dashboard
            </h1>
            <p className="text-gray-400">
              Knowledge Nexus for Every Witness
            </p>
          </div>

          {!proStatus?.isPro && <ProUpgradeButton />}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <HistoryDashboard />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-gradient-to-br from-blue-900/20 to-black border border-blue-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">TRL Status</h3>
              <p className="text-3xl font-bold text-blue-400">4</p>
              <p className="text-sm text-gray-400 mt-2">
                84% user satisfaction (mock)
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Goal TRL</h3>
              <p className="text-3xl font-bold text-purple-400">7</p>
              <p className="text-sm text-gray-400 mt-2">
                95% accuracy, 10+ languages
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-900/20 to-black border border-green-700 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Sources</h3>
              <p className="text-3xl font-bold text-green-400">10k+</p>
              <p className="text-sm text-gray-400 mt-2">
                Target for production
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
