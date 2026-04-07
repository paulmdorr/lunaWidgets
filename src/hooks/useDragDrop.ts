import { useState, useCallback } from 'react';
import type { DatabaseRow } from '../types/notion';
import { updateRowStatus } from '../services/notion';

interface Options {
  token: string;
  statusPropertyName: string;
  statusPropertyType: 'status' | 'select';
}

export function useDragDrop({ token, statusPropertyName, statusPropertyType }: Options) {
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const getDragProps = useCallback(
    (rowId: string, sourceStatus: string) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData('rowId', rowId);
        e.dataTransfer.setData('sourceStatus', sourceStatus);
        setTimeout(() => setIsDragging(true), 0);
      },
      onDragEnd: () => setIsDragging(false),
    }),
    []
  );

  const getDropProps = useCallback(
    (targetStatus: string) => ({
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setDragOverStatus(null);
        const rowId = e.dataTransfer.getData('rowId');
        const sourceStatus = e.dataTransfer.getData('sourceStatus');
        if (!rowId || sourceStatus === targetStatus) return;

        setRows(prev => prev.map(r => (r.id === rowId ? { ...r, status: targetStatus } : r)));

        updateRowStatus(token, rowId, statusPropertyName, statusPropertyType, targetStatus).catch(
          () => {
            setRows(prev =>
              prev.map(r => (r.id === rowId ? { ...r, status: sourceStatus } : r))
            );
          }
        );
      },
      onDragEnter: () => setDragOverStatus(targetStatus),
      onDragLeave: () => setDragOverStatus(null),
    }),
    [token, statusPropertyName, statusPropertyType]
  );

  return { rows, setRows, isDragging, dragOverStatus, getDragProps, getDropProps };
}
