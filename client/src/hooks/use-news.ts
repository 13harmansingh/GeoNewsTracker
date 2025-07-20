import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@shared/schema";

const useAllNews = () => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30000, // 30 seconds for real-time updates
  });
};

const useFilteredNews = (category: string | null) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/category", category],
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
};

const useSearchNews = (query: string) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/search", { q: query }],
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
};

const useLocationNews = (lat: number, lng: number, radius?: number) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/location", { lat, lng, radius }],
    enabled: !!(lat && lng),
    staleTime: 5 * 60 * 1000,
  });
};

const useNewsArticle = (id: number) => {
  return useQuery<NewsArticle>({
    queryKey: ["/api/news", id],
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes for individual articles
  });
};

export const useNews = {
  useAllNews,
  useFilteredNews,
  useSearchNews,
  useLocationNews,
  useNewsArticle,
};
