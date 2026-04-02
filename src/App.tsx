import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WidgetConfig } from "./types/notion";
import { loadConfig, saveConfig, isConfigured } from "./services/config";
import { useNotionPage } from "./hooks/useNotionPage";
import { SetupScreen } from "./components/SetupScreen";
import { TitleBar } from "./components/TitleBar";
import { BlockRenderer } from "./components/BlockRenderer";
import { DatabaseRenderer } from "./components/DatabaseRenderer";
import type { NotionDatabase } from "./types/notion";

export default function App() {
  const [config, setConfig] = useState<WidgetConfig>(loadConfig);
  const [showSetup, setShowSetup] = useState(!isConfigured(config));
  // Pin to bottom on startup if already configured
  useEffect(() => {
    if (isConfigured(config)) {
      getCurrentWindow().setAlwaysOnBottom(true);
    }
  }, []);

  const { page, loading, error, refresh, lastRefresh } =
    useNotionPage(config);

  const handleSaveConfig = useCallback((newConfig: WidgetConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowSetup(false);
    getCurrentWindow().setAlwaysOnBottom(true);
  }, []);

  // ── Setup screen ──
  if (showSetup) {
    return (
      <SetupScreen initialConfig={config} onSave={handleSaveConfig} />
    );
  }

  // ── Main widget ──
  return (
    <div style={{ ...styles.widget, WebkitAppRegion: "drag" } as React.CSSProperties}>
      <TitleBar
        title={page?.title ?? "Loading..."}
        icon={page?.icon}
        loading={loading}
        lastRefresh={lastRefresh}
        onRefresh={refresh}
        onSettings={() => setShowSetup(true)}
      />

      <div style={{ ...styles.content, WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {error && (
          <div style={styles.error}>
            <span>⚠ {error}</span>
            <button onClick={refresh} style={styles.retryBtn}>
              Retry
            </button>
          </div>
        )}

        {!error && !page && loading && (
          <div style={styles.loading}>
            <span style={styles.loadingDot}>●</span>
            Fetching page...
          </div>
        )}

        {page && "blocks" in page && (
          <div className="animate-in">
            {page.blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}

        {page && "rows" in page && (
          <DatabaseRenderer database={page as NotionDatabase} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  widget: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-primary)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "10px 14px 16px",
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "rgba(224, 108, 108, 0.12)",
    borderRadius: "var(--radius-sm)",
    color: "var(--danger)",
    fontSize: 12,
  },
  retryBtn: {
    background: "none",
    border: "1px solid var(--danger)",
    color: "var(--danger)",
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 11,
    cursor: "pointer",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-muted)",
    fontSize: 12,
    padding: 20,
  },
  loadingDot: {
    animation: "pulse 1.2s ease-in-out infinite",
    color: "var(--accent)",
  },
};
