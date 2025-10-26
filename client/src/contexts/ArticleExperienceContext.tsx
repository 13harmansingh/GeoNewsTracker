import { createContext, useContext, useState, useEffect } from "react";
import type { NewsArticle } from "@shared/schema";

interface ArticleExperienceContextType {
  selectedArticle: NewsArticle | null;
  setSelectedArticle: (article: NewsArticle | null) => void;
  isPro: boolean;
  isNewsVisible: boolean;
  setIsNewsVisible: (visible: boolean) => void;
  openArticle: (article: NewsArticle) => void;
  closeArticle: () => void;
}

const ArticleExperienceContext = createContext<ArticleExperienceContextType | undefined>(undefined);

export function ArticleExperienceProvider({ children }: { children: React.ReactNode }) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isNewsVisible, setIsNewsVisible] = useState(false);

  // Pro features now available to everyone - no paywall for EIC grant demo
  const isPro = true;

  const openArticle = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsNewsVisible(true);
  };

  const closeArticle = () => {
    setIsNewsVisible(false);
    setTimeout(() => setSelectedArticle(null), 300);
  };

  return (
    <ArticleExperienceContext.Provider
      value={{
        selectedArticle,
        setSelectedArticle,
        isPro,
        isNewsVisible,
        setIsNewsVisible,
        openArticle,
        closeArticle,
      }}
    >
      {children}
    </ArticleExperienceContext.Provider>
  );
}

export function useArticleExperience() {
  const context = useContext(ArticleExperienceContext);
  if (context === undefined) {
    throw new Error("useArticleExperience must be used within an ArticleExperienceProvider");
  }
  return context;
}
