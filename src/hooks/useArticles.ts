import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export interface DBArticle {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  category: string | null;
  language: string;
  published_at: string | null;
  source_id: string | null;
  is_published: boolean;
  is_ai_generated: boolean;
  created_at: string;
  slug: string | null;
  video_url?: string | null;
  images?: string[] | string | null;
  videos?: string[] | string | null;
  hashtags?: string[] | null;
}

const PAGE_SIZE = 30;

export function useArticles(language: string = "ar", page: number = 1) {
  const [articles, setArticles] = useState<DBArticle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setArticles([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("articles")
        .select("*", { count: "exact" })
        .eq("language", language)
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Deduplicate by canonical URL first, then normalized title.
      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();
      const unique = (data || []).filter((a) => {
        const urlKey = String(a.url || "").trim().toLowerCase().replace(/\/$/, "");
        const titleKey = String(a.title || "").trim().toLowerCase().replace(/[\s\u064B-\u065F]+/g, " ");
        if ((urlKey && seenUrls.has(urlKey)) || (titleKey && seenTitles.has(titleKey))) return false;
        if (urlKey) seenUrls.add(urlKey);
        if (titleKey) seenTitles.add(titleKey);
        return true;
      });
      
      setArticles(unique);
      setTotalCount(count || 0);
    } catch (e) {
      console.error("Error fetching articles:", e);
    } finally {
      setLoading(false);
    }
  }, [language, page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channelName = `articles-realtime-${language}-${page}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "articles", filter: `language=eq.${language}` }, () => {
        fetchArticles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchArticles, language, page]);

  return { articles, totalCount, loading, totalPages: Math.ceil(totalCount / PAGE_SIZE), refetch: fetchArticles };
}

export function useBreakingNews(language: string = "ar") {
  const [articles, setArticles] = useState<DBArticle[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, published_at, language, url, image_url, slug")
        .eq("language", language)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(10);
      setArticles((data as DBArticle[]) || []);
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [language]);

  return articles;
}
