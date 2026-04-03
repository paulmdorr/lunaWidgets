import { useState } from "react";
import type { WidgetConfig } from "../types/notion";
import styles from "./SetupScreen.module.css";

interface Props {
  initialConfig: WidgetConfig;
  onSave: (config: WidgetConfig) => void;
}

export function SetupScreen({ initialConfig, onSave }: Props) {
  const [token, setToken] = useState(initialConfig.notionToken);
  const [pageId, setPageId] = useState(initialConfig.pageId);
  const [interval, setInterval] = useState(
    String(initialConfig.refreshInterval)
  );

  const handleSubmit = () => {
    onSave({
      notionToken: token.trim(),
      pageId: extractPageId(pageId.trim()),
      refreshInterval: Math.max(10, parseInt(interval) || 60),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>⚙</span>
          <h2 className={styles.title}>Notion Widget</h2>
        </div>
        <p className={styles.desc}>
          Connect to a Notion page to display its content as a desktop widget.
        </p>

        <label className={styles.label}>Integration Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ntn_..."
          className={styles.input}
        />
        <span className={styles.hint}>
          Create one at{" "}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            notion.so/my-integrations
          </a>
        </span>

        <label className={styles.labelSpaced}>Page ID or URL</label>
        <input
          type="text"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          placeholder="Paste page URL or ID"
          className={styles.input}
        />
        <span className={styles.hint}>
          The page must be shared with your integration
        </span>

        <label className={styles.labelSpaced}>Refresh interval (seconds)</label>
        <input
          type="number"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          min={10}
          className={styles.inputSmall}
        />

        <button
          onClick={handleSubmit}
          disabled={!token || !pageId}
          className={styles.button}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

/** Extract the 32-char page ID from a Notion URL or return as-is */
function extractPageId(input: string): string {
  const urlMatch = input.match(/([a-f0-9]{32})(?:\?|$)/);
  if (urlMatch) return urlMatch[1];

  const uuidMatch = input.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
  );
  if (uuidMatch) return uuidMatch[1].replace(/-/g, "");

  return input.replace(/-/g, "");
}
