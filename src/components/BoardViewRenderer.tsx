import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { BoardLayout, DatabaseRow, NotionDatabase } from '../types/notion';
import { updateRowStatus } from '../services/notion';
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
  const [rows, setRows] = useState<DatabaseRow[]>(database.rows);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>();

  // Sync rows when database prop changes (e.g. after refresh)
  useEffect(() => {
    setRows(database.rows);
  }, [database.rows]);

  const orderedStatusGroups = database.statusGroups.map(g => g.name);
  const ungroupedStatuses = rows.filter(r => !r.status || !orderedStatusGroups.includes(r.status));
  const statusGroups = orderedStatusGroups.map(name => ({
    name,
    color: database.statusGroups.find(g => g.name === name)?.color ?? 'default',
    rows: rows.filter(r => r.status === name),
  }));

  if (ungroupedStatuses.length > 0) {
    statusGroups.push({
      name: 'Other',
      color: 'default',
      rows: ungroupedStatuses,
    });
  }

  useEffect(() => {
    const minWidth =
      layout === 'horizontal'
        ? statusGroups.length * COLUMN_WIDTH + (statusGroups.length - 1) * COLUMN_GAP + PADDING
        : VERTICAL_MIN_WIDTH;
    getCurrentWindow().setMinSize(new LogicalSize(minWidth, 200));
  }, [layout, statusGroups.length]);

  const handleDrop = useCallback(
    (targetStatus: string, e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragOverStatus(null);
      const rowId = e.dataTransfer.getData('rowId');
      const sourceStatus = e.dataTransfer.getData('sourceStatus');

      if (!rowId || sourceStatus === targetStatus) return;

      setRows(prev => prev.map(r => (r.id === rowId ? { ...r, status: targetStatus } : r)));

      updateRowStatus(
        token,
        rowId,
        database.statusPropertyName,
        database.statusPropertyType,
        targetStatus
      ).catch(() => {
        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, status: sourceStatus } : r)));
      });
    },
    [token, database.statusPropertyName, database.statusPropertyType]
  );

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
            <div
              key={row.id}
              className={styles.row}
              draggable
              onDragStart={e => {
                setTimeout(() => setIsDragging(true), 0);
                e.dataTransfer.setData('rowId', row.id);
                e.dataTransfer.setData('sourceStatus', statusGroup.name);
              }}
              onDragEnd={() => setIsDragging(false)}
            >
              {row.title}
            </div>
          ))}
          <div
            className={`${styles.dropOverlay} ${isDragging ? styles.dropOverlayActive : ''} ${dragOverStatus === statusGroup.name ? styles.dropOverlayActiveHover : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(statusGroup.name, e)}
            onDragEnter={() => setDragOverStatus(statusGroup.name)}
            onDragLeave={() => setDragOverStatus(null)}
          />
        </div>
      ))}
    </div>
  );
}
