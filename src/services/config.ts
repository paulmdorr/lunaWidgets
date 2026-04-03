import type { WidgetConfig } from "../types/notion";

const STORAGE_KEY = "notion-widget-config";

const DEFAULT_CONFIG: WidgetConfig = {
  notionToken: "",
  pageId: "",
  refreshInterval: 60,
  layouts: {},
};

export function loadConfig(): WidgetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: WidgetConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isConfigured(config: WidgetConfig): boolean {
  return config.notionToken.length > 0 && config.pageId.length > 0;
}
