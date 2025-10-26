import { LogOut, LogIn, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function NavigationBar() {
  // Fetch current user
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['/api/auth/user'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleLoginClick = () => {
    window.location.href = "/api/login";
  };

  const handleLogoutClick = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-30 safe-area-top">
      <div className="glass-navbar mx-3 mt-3 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Left side - Authentication */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-10 h-10 rounded-2xl bg-white bg-opacity-20 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* User Avatar */}
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile"
                    className="w-10 h-10 rounded-2xl object-cover border-2 border-white border-opacity-30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ios-blue to-purple-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                {/* User Info */}
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">
                    {user.firstName || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-gray-600">
                    Signed in
                  </span>
                </div>
                {/* Logout Button */}
                <button 
                  onClick={handleLogoutClick}
                  className="ml-1 touch-feedback p-2.5 rounded-xl hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                  data-testid="button-logout"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLoginClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-ios-blue to-purple-500 text-white font-semibold text-sm hover:shadow-lg transition-all duration-200"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Center - Logo */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
              KNEW
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Global Coverage
            </p>
          </div>

          {/* Right side - Balance space */}
          <div className="w-[120px]"></div>
        </div>
      </div>
    </div>
  );
}