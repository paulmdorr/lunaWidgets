import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { BoardLayout, NotionDatabase, WidgetConfig } from "./types/notion";
import { loadConfig, saveConfig, isConfigured } from "./services/config";
import { useNotionPage } from "./hooks/useNotionPage";
import { SetupScreen } from "./components/SetupScreen";
import { TitleBar } from "./components/TitleBar";
import { BlockRenderer } from "./components/BlockRenderer";
import { BoardViewRenderer } from "./components/BoardViewRenderer";
import styles from "./App.module.css";

export default function App() {
  const [config, setConfig] = useState<WidgetConfig>(loadConfig);
  const [showSetup, setShowSetup] = useState(!isConfigured(config));

  useEffect(() => {
    if (isConfigured(config)) {
      getCurrentWindow().setAlwaysOnBottom(true);
    }
  }, []);

  const { page, loading, error, refresh, lastRefresh } = useNotionPage(config);

  const handleSaveConfig = useCallback((newConfig: WidgetConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowSetup(false);
    getCurrentWindow().setAlwaysOnBottom(true);
  }, []);

  const databaseId = page && "rows" in page ? page.id : null;
  const layout: BoardLayout = databaseId ? (config.layouts[databaseId] ?? "vertical") : "vertical";

  const handleToggleLayout = useCallback(() => {
    if (!databaseId) return;
    const next: BoardLayout = layout === "vertical" ? "horizontal" : "vertical";
    const newConfig = { ...config, layouts: { ...config.layouts, [databaseId]: next } };
    saveConfig(newConfig);
    setConfig(newConfig);
  }, [config, databaseId, layout]);

  if (showSetup) {
    return <SetupScreen initialConfig={config} onSave={handleSaveConfig} />;
  }

  return (
    <div className={styles.widget}>
      <TitleBar
        title={page?.title ?? "Loading..."}
        icon={page?.icon}
        loading={loading}
        lastRefresh={lastRefresh}
        onRefresh={refresh}
        onSettings={() => setShowSetup(true)}
        layout={databaseId ? layout : undefined}
        onToggleLayout={databaseId ? handleToggleLayout : undefined}
      />

      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            <span>⚠ {error}</span>
            <button onClick={refresh} className={styles.retryBtn}>Retry</button>
          </div>
        )}

        {!error && !page && loading && (
          <div className={styles.loading}>
            <span className={styles.loadingDot}>●</span>
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
          <BoardViewRenderer
            database={page as NotionDatabase}
            layout={layout}
          />
        )}
      </div>
    </div>
  );
}
