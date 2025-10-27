import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "pt" | "es" | "fr" | "de";

export const LANGUAGES = {
  en: { code: "en", name: "English", flag: "🇺🇸" },
  pt: { code: "pt", name: "Português", flag: "🇵🇹" },
  es: { code: "es", name: "Español", flag: "🇪🇸" },
  fr: { code: "fr", name: "Français", flag: "🇫🇷" },
  de: { code: "de", name: "Deutsch", flag: "🇩🇪" },
} as const;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  languageName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("knew-language");
    return (saved as Language) || "en";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("knew-language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        languageName: LANGUAGES[language].name,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
