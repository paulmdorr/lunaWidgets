import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WidgetConfig, NotionDatabase } from "./types/notion";
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
      />

      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            <span>⚠ {error}</span>
            <button onClick={refresh} className={styles.retryBtn}>
              Retry
            </button>
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
          <BoardViewRenderer database={page as NotionDatabase} />
        )}
      </div>
    </div>
  );
}
