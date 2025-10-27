import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@shared/schema";

export const useNews = {
  useAllNews: (language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news', language],
      queryFn: () => fetch(`/api/news?language=${language}`).then(res => res.json()) as Promise<NewsArticle[]>
    });
  },

  useFilteredNews: (category: string | null, language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news/category', category, language],
      queryFn: () => {
        if (!category) return [];
        return fetch(`/api/news/category/${category}?language=${language}`).then(res => res.json()) as Promise<NewsArticle[]>;
      },
      enabled: !!category
    });
  },

  useSearchNews: (query: string, language: string = "en") => {
    return useQuery({
      queryKey: ['/api/news/search', query, language],
      queryFn: async () => {
        if (!query || !query.trim()) return [];
        console.log('🔍 Searching for:', query);
        const response = await fetch(`/api/news/search?q=${encodeURIComponent(query.trim())}&language=${language}`);
        const results = await response.json();
        console.log('🔍 Search results:', results.length, 'articles found');
        return results as NewsArticle[];
      },
      enabled: !!query && query.trim().length > 0,
      staleTime: 30000 // Cache search results for 30 seconds
    });
  }
};
