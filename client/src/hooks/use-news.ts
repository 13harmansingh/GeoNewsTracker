import { useQuery } from "@tanstack/react-query";
import type { NewsArticle } from "@shared/schema";

const useAllNews = () => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
    staleTime: 30 * 1000, // 30 seconds to prevent stale data
    refetchInterval: false, // Disable auto-refetch to prevent API rate limits
    refetchOnWindowFocus: false,
  });
};

const useFilteredNews = (category: string | null) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/category", category],
    enabled: !!category,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

const useSearchNews = (query: string) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/search", { q: query }],
    enabled: query.length > 2,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

const useLocationNews = (lat: number, lng: number, radius?: number) => {
  return useQuery<NewsArticle[]>({
    queryKey: ["/api/news/location", { lat, lng, radius }],
    enabled: !!(lat && lng),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
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
