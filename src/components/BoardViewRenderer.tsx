import type { NotionDatabase } from "../types/notion";
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

interface Props {
  database: NotionDatabase;
}

export function BoardViewRenderer({ database }: Props) {
  const orderedStatusGroups = database.statusGroups.map((g) => g.name);
  const ungroupedStatusGroups = database.rows.filter((r) => !r.status || !orderedStatusGroups.includes(r.status));
  const statusGroups = orderedStatusGroups
    .map((name) => ({
      name,
      color: database.statusGroups.find((g) => g.name === name)?.color ?? "default",
      rows: database.rows.filter((r) => r.status === name),
    }))
    .filter((g) => g.rows.length > 0);

  if (ungroupedStatusGroups.length > 0) {
    statusGroups.push({ name: "Other", color: "default", rows: ungroupedStatusGroups });
  }

  return (
    <div className={styles.container}>
      {statusGroups.map((statusGroup) => (
        <div key={statusGroup.name} className={styles.group}>
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
