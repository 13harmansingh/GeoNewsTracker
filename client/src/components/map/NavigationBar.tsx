import { LogOut, Globe } from "lucide-react";
import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";

export default function NavigationBar() {
  const { language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLoginClick = () => {
    window.location.href = "/api/login";
  };

  const handleLogoutClick = () => {
    window.location.href = "/api/logout";
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 safe-area-top">
      <div className="glass-navbar mx-3 mt-3 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Left side - Sign In and Language */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLoginClick}
              className="text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              data-testid="button-login"
            >
              Sign In
            </button>
            
            {/* Language Selector */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
                data-testid="button-language-toggle"
              >
                <Globe className="w-4 h-4 text-gray-800" />
                <span className="text-sm font-medium text-gray-900">
                  {LANGUAGES[language].flag}
                </span>
              </button>

              {/* Language Dropdown */}
              {showLanguageMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-w-[160px] z-50">
                  {Object.entries(LANGUAGES).map(([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code as Language)}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        language === code ? "bg-blue-50" : ""
                      }`}
                      data-testid={`button-language-${code}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {lang.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center - Logo */}
          <div className="flex flex-col items-center">
            <img 
              src="/logo.png" 
              alt="KNEW" 
              className="h-12 w-12 object-contain"
            />
            <p className="text-xs text-gray-600 font-medium mt-1">
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
