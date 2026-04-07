import { useEffect, useMemo } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { BoardLayout, NotionDatabase } from '../types/notion';
import { useDragDrop } from '../hooks/useDragDrop';
import { cx } from '../utils/tools';
import styles from './BoardViewRenderer.module.css';

const STATUS_COLORS: Record<string, string> = {
  gray: '#9b9b9b',
  brown: '#c07a5a',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
  red: '#d44c47',
  default: '#9b9b9b',
};

const COLUMN_WIDTH = 200;
const COLUMN_GAP = 12;
const PADDING = 28;
const VERTICAL_MIN_WIDTH = 280;

interface Props {
  database: NotionDatabase;
  layout: BoardLayout;
  token: string;
}

export function BoardViewRenderer({ database, layout, token }: Props) {
  const { rows, setRows, isDragging, dragOverStatus, getDragProps, getDropProps } = useDragDrop({
    token,
    statusPropertyName: database.statusPropertyName,
    statusPropertyType: database.statusPropertyType,
  });

  useEffect(() => {
    setRows(database.rows);
  }, [database.rows]);

  const statusGroups = useMemo(() => {
    const ordered = database.statusGroups.map(g => g.name);
    const ungrouped = rows.filter(r => !r.status || !ordered.includes(r.status));
    const groups = ordered.map(name => ({
      name,
      color: database.statusGroups.find(g => g.name === name)?.color ?? 'default',
      rows: rows.filter(r => r.status === name),
    }));

    if (ungrouped.length > 0)
      groups.push({
        name: 'Other',
        color: 'default',
        rows: ungrouped,
      });

    return groups;
  }, [rows, database.statusGroups]);

  useEffect(() => {
    const minWidth =
      layout === 'horizontal'
        ? statusGroups.length * COLUMN_WIDTH + (statusGroups.length - 1) * COLUMN_GAP + PADDING
        : VERTICAL_MIN_WIDTH;
    getCurrentWindow().setMinSize(new LogicalSize(minWidth, 200));
  }, [layout, statusGroups.length]);

  const isHorizontal = layout === 'horizontal';

  return (
    <div className={isHorizontal ? styles.containerHorizontal : styles.container}>
      {statusGroups.map(statusGroup => (
        <div
          key={statusGroup.name}
          className={isHorizontal ? styles.groupHorizontal : styles.group}
        >
          <div className={styles.groupHeader}>
            <span
              className={styles.dot}
              style={{
                background: STATUS_COLORS[statusGroup.color] ?? STATUS_COLORS.default,
              }}
            />
            <span className={styles.groupName}>{statusGroup.name}</span>
            <span className={styles.count}>{statusGroup.rows.length}</span>
          </div>
          {statusGroup.rows.map(row => (
            <div key={row.id} className={styles.row} {...getDragProps(row.id, statusGroup.name)}>
              {row.title}
            </div>
          ))}
          <div
            className={cx(
              styles.dropOverlay,
              isDragging && styles.dropOverlayActive,
              dragOverStatus === statusGroup.name && styles.dropOverlayActiveHover
            )}
            {...getDropProps(statusGroup.name)}
          />
        </div>
      ))}
    </div>
  );
}
