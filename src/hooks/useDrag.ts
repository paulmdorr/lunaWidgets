import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export function useDrag() {
  const dragState = useRef<{
    startX: number;
    startY: number;
    winX: number;
    winY: number;
  } | null>(null);

  const onMouseDown = async (e: React.MouseEvent) => {
    // Only drag from non-interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, select, a")) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = await getCurrentWindow().outerPosition();
    dragState.current = {
      startX: e.screenX,
      startY: e.screenY,
      winX: pos.x,
      winY: pos.y,
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const dx = e.screenX - dragState.current.startX;
      const dy = e.screenY - dragState.current.startY;
      invoke("move_widget", {
        x: dragState.current.winX + dx,
        y: dragState.current.winY + dy,
      });
    };
    const onMouseUp = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { onMouseDown };
}
