import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@shared/schema";

export const useNews = {
  useAllNews: (language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news', language],
      queryFn: async () => {
        const response = await fetch(`/api/news?language=${language}`);
        return response.json() as Promise<NewsArticle[]>;
      },
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    });
  },

  useFilteredNews: (category: string | null, language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news/category', category, language],
      queryFn: async () => {
        if (!category) return [];
        const response = await fetch(`/api/news/category/${category}?language=${language}`);
        return response.json() as Promise<NewsArticle[]>;
      },
      enabled: !!category,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000,
    });
  },

  useSearchNews: (query: string, language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news/search', query, language],
      queryFn: async () => {
        if (!query || !query.trim()) return [];
        const response = await fetch(`/api/news/search?q=${encodeURIComponent(query.trim())}&language=${language}`);
        return response.json() as Promise<NewsArticle[]>;
      },
      enabled: !!query && query.trim().length > 0,
      staleTime: 2 * 60 * 1000, // Cache search results for 2 minutes
      gcTime: 5 * 60 * 1000,
    });
  }
};
