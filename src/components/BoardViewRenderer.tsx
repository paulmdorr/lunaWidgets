import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { BoardLayout, NotionDatabase } from "../types/notion";
import styles from "./BoardViewRenderer.module.css";

const STATUS_COLORS: Record<string, string> = {
  gray: "#9b9b9b",
  brown: "#c07a5a",
  orange: "#d9730d",
  yellow: "#cb912f",
  green: "#448361",
  blue: "#337ea9",
  purple: "#9065b0",
  pink: "#c14c8a",
  red: "#d44c47",
  default: "#9b9b9b",
};

const COLUMN_WIDTH = 200;
const COLUMN_GAP = 12;
const PADDING = 28; // content area horizontal padding (14px * 2)
const VERTICAL_MIN_WIDTH = 280;

interface Props {
  database: NotionDatabase;
  layout: BoardLayout;
}

export function BoardViewRenderer({ database, layout }: Props) {
  const orderedStatusGroups = database.statusGroups.map((g) => g.name);
  const ungroupedStatuses = database.rows.filter((r) => !r.status || !orderedStatusGroups.includes(r.status));
  const statusGroups = orderedStatusGroups
    .map((name) => ({
      name,
      color: database.statusGroups.find((g) => g.name === name)?.color ?? "default",
      rows: database.rows.filter((r) => r.status === name),
    }))
    .filter((g) => g.rows.length > 0);

  if (ungroupedStatuses.length > 0) {
    statusGroups.push({ name: "Other", color: "default", rows: ungroupedStatuses });
  }

  useEffect(() => {
    const minWidth = layout === "horizontal"
      ? statusGroups.length * COLUMN_WIDTH + (statusGroups.length - 1) * COLUMN_GAP + PADDING
      : VERTICAL_MIN_WIDTH;
    getCurrentWindow().setMinSize(new LogicalSize(minWidth, 200));
  }, [layout, statusGroups.length]);

  const isHorizontal = layout === "horizontal";

  return (
    <div className={isHorizontal ? styles.containerHorizontal : styles.container}>
      {statusGroups.map((statusGroup) => (
        <div key={statusGroup.name} className={isHorizontal ? styles.groupHorizontal : styles.group}>
          <div className={styles.groupHeader}>
            <span
              className={styles.dot}
              style={{ background: STATUS_COLORS[statusGroup.color] ?? STATUS_COLORS.default }}
            />
            <span className={styles.groupName}>{statusGroup.name}</span>
            <span className={styles.count}>{statusGroup.rows.length}</span>
          </div>
          {statusGroup.rows.map((row) => (
            <div key={row.id} className={styles.row}>
              {row.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
