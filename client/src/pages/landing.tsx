import { Button } from "@/components/ui/button";
import { MapPin, Newspaper, Globe } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <MapPin className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Knew
            </h1>
          </div>
          <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium">
            Discover News by Location
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore breaking news, local stories, and global events on an interactive map. 
            Stay informed about what's happening around the world.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 my-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <Globe className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Worldwide Coverage</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access news from around the globe with real-time updates
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <MapPin className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Location-Based</h3>
            <p className="text-gray-600 dark:text-gray-400">
              See news positioned exactly where it's happening
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <Newspaper className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Multiple Categories</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Filter by breaking news, local stories, sports, and more
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-xl"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to explore the news map
          </p>
        </div>
      </div>
    </div>
  );
}
