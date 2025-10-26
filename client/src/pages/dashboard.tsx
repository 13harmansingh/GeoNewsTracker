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
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <NavigationBar />
      
      <div className="container mx-auto p-6 mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              KNEW Dashboard
            </h1>
            <p className="text-gray-600">
              Knowledge Nexus for Every Witness
            </p>
          </div>

          {!proStatus?.isPro && <ProUpgradeButton />}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <HistoryDashboard />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-morphism p-6 rounded-xl border border-blue-200 shadow-lg">
              <h3 className="text-gray-800 font-semibold mb-2">TRL Status</h3>
              <p className="text-3xl font-bold text-blue-600">4</p>
              <p className="text-sm text-gray-500 mt-2">
                84% user satisfaction (mock)
              </p>
            </div>

            <div className="glass-morphism p-6 rounded-xl border border-purple-200 shadow-lg">
              <h3 className="text-gray-800 font-semibold mb-2">Goal TRL</h3>
              <p className="text-3xl font-bold text-purple-600">7</p>
              <p className="text-sm text-gray-500 mt-2">
                95% accuracy, 10+ languages
              </p>
            </div>

            <div className="glass-morphism p-6 rounded-xl border border-green-200 shadow-lg">
              <h3 className="text-gray-800 font-semibold mb-2">Sources</h3>
              <p className="text-3xl font-bold text-green-600">10k+</p>
              <p className="text-sm text-gray-500 mt-2">
                Target for production
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
