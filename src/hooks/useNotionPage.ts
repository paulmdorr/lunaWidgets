import { useState, useEffect, useCallback, useRef } from "react";
import type { NotionDatabase, NotionPage, WidgetConfig } from "../types/notion";
import { fetchNotionPage } from "../services/notion";

interface UseNotionPageResult {
  page: NotionPage | NotionDatabase | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastRefresh: Date | null;
}

export function useNotionPage(config: WidgetConfig): UseNotionPageResult {
  const [page, setPage] = useState<NotionPage | NotionDatabase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!config.notionToken || !config.pageId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchNotionPage(config.notionToken, config.pageId);
      setPage(data);
      setLastRefresh(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch page";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [config.notionToken, config.pageId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (config.refreshInterval > 0) {
      intervalRef.current = setInterval(refresh, config.refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, config.refreshInterval]);

  return { page, loading, error, refresh, lastRefresh };
}
