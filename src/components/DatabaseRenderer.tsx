import type { NotionDatabase } from "../types/notion";

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

export function DatabaseRenderer({ database }: Props) {
  // Group rows by status, preserving schema order
  const groupOrder = database.statusGroups.map((g) => g.name);
  const ungrouped = database.rows.filter((r) => !r.status || !groupOrder.includes(r.status));
  const groups = groupOrder
    .map((name) => ({
      name,
      color: database.statusGroups.find((g) => g.name === name)?.color ?? "default",
      rows: database.rows.filter((r) => r.status === name),
    }))
    .filter((g) => g.rows.length > 0);

  if (ungrouped.length > 0) {
    groups.push({ name: "Other", color: "default", rows: ungrouped });
  }

  return (
    <div style={styles.container}>
      {groups.map((group) => (
        <div key={group.name} style={styles.group}>
          <div style={styles.groupHeader}>
            <span
              style={{
                ...styles.dot,
                background: STATUS_COLORS[group.color] ?? STATUS_COLORS.default,
              }}
            />
            <span style={styles.groupName}>{group.name}</span>
            <span style={styles.count}>{group.rows.length}</span>
          </div>
          {group.rows.map((row) => (
            <div key={row.id} style={styles.row}>
              {row.title}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  groupName: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "var(--text-muted)",
    flex: 1,
  },
  count: {
    fontSize: 11,
    color: "var(--text-muted)",
  },
  row: {
    fontSize: 13,
    color: "var(--text-primary)",
    padding: "5px 8px",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-secondary)",
    lineHeight: 1.4,
  },
};
