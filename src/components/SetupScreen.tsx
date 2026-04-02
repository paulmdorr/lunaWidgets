import { useState } from "react";
import type { WidgetConfig } from "../types/notion";

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
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>⚙</span>
          <h2 style={styles.title}>Notion Widget</h2>
        </div>
        <p style={styles.desc}>
          Connect to a Notion page to display its content as a desktop widget.
        </p>

        <label style={styles.label}>Integration Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ntn_..."
          style={styles.input}
        />
        <span style={styles.hint}>
          Create one at{" "}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            notion.so/my-integrations
          </a>
        </span>

        <label style={{ ...styles.label, marginTop: 16 }}>
          Page ID or URL
        </label>
        <input
          type="text"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          placeholder="Paste page URL or ID"
          style={styles.input}
        />
        <span style={styles.hint}>
          The page must be shared with your integration
        </span>

        <label style={{ ...styles.label, marginTop: 16 }}>
          Refresh interval (seconds)
        </label>
        <input
          type="number"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          min={10}
          style={{ ...styles.input, width: 100 }}
        />

        <button
          onClick={handleSubmit}
          disabled={!token || !pageId}
          style={{
            ...styles.button,
            opacity: !token || !pageId ? 0.4 : 1,
          }}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

/** Extract the 32-char page ID from a Notion URL or return as-is */
function extractPageId(input: string): string {
  // Full URL: https://www.notion.so/workspace/Page-Title-abc123...
  const urlMatch = input.match(/([a-f0-9]{32})(?:\?|$)/);
  if (urlMatch) return urlMatch[1];

  // Hyphenated UUID
  const uuidMatch = input.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
  );
  if (uuidMatch) return uuidMatch[1].replace(/-/g, "");

  // Assume raw ID
  return input.replace(/-/g, "");
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-primary)",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  icon: { fontSize: 22 },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  desc: {
    color: "var(--text-secondary)",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13,
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
  },
  hint: {
    display: "block",
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 4,
  },
  link: {
    color: "var(--accent)",
    textDecoration: "underline",
  },
  button: {
    display: "block",
    width: "100%",
    marginTop: 24,
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 600,
    color: "#111",
    background: "var(--accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
};
