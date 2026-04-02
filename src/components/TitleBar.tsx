interface Props {
  title: string;
  icon?: string;
  loading: boolean;
  lastRefresh: Date | null;
  onRefresh: () => void;
  onSettings: () => void;
}

export function TitleBar({
  title,
  icon,
  loading,
  lastRefresh,
  onRefresh,
  onSettings,
}: Props) {
  const timeAgo = lastRefresh ? formatTimeAgo(lastRefresh) : null;

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        {icon && <span style={styles.icon}>{icon}</span>}
        <span style={styles.title}>{title}</span>
      </div>
      <div style={{ ...styles.right, WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {timeAgo && <span style={styles.time}>{timeAgo}</span>}
        <button
          onClick={onRefresh}
          style={styles.btn}
          title="Refresh"
          disabled={loading}
        >
          <span style={loading ? styles.spinning : undefined}>↻</span>
        </button>
        <button onClick={onSettings} style={styles.btn} title="Settings">
          ⚙
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  icon: { fontSize: 15, flexShrink: 0 },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: 10,
    color: "var(--text-muted)",
    marginRight: 4,
  },
  btn: {
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: 14,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    lineHeight: 1,
  },
  spinning: {
    display: "inline-block",
    animation: "pulse 1s ease-in-out infinite",
  },
};
