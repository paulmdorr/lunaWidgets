import type { BoardLayout } from "../types/notion";
import styles from "./TitleBar.module.css";

interface Props {
  title: string;
  icon?: string;
  loading: boolean;
  lastRefresh: Date | null;
  onRefresh: () => void;
  onSettings: () => void;
  layout?: BoardLayout;
  onToggleLayout?: () => void;
}

export function TitleBar({
  title,
  icon,
  loading,
  lastRefresh,
  onRefresh,
  onSettings,
  layout,
  onToggleLayout,
}: Props) {
  const timeAgo = lastRefresh ? formatTimeAgo(lastRefresh) : null;

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.right}>
        {timeAgo && <span className={styles.time}>{timeAgo}</span>}
        {onToggleLayout && (
          <button
            onClick={onToggleLayout}
            className={styles.btn}
            title={layout === "horizontal" ? "Switch to vertical" : "Switch to horizontal"}
          >
            {layout === "horizontal" ? "⇥" : "⇩"}
          </button>
        )}
        <button
          onClick={onRefresh}
          className={styles.btn}
          title="Refresh"
          disabled={loading}
        >
          <span className={loading ? styles.spinning : undefined}>↻</span>
        </button>
        <button onClick={onSettings} className={styles.btn} title="Settings">
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
