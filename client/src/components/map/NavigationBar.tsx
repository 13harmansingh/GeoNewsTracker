import { LogOut } from "lucide-react";

export default function NavigationBar() {
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
          {/* Left side - Sign In text */}
          <button 
            onClick={handleLoginClick}
            className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
            data-testid="button-login"
          >
            Sign In
          </button>

          {/* Center - Logo */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
              KNEW
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              Global Coverage
            </p>
          </div>

          {/* Right side - Logout icon */}
          <button 
            onClick={handleLogoutClick}
            className="touch-feedback p-3 rounded-2xl hover:bg-white hover:bg-opacity-15 transition-all duration-200"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>
    </div>
  );
}