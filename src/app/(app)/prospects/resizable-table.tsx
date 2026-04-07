"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  className?: string;
}

interface ResizableTableProps {
  columns: Column[];
  children: ReactNode;
}

export function ResizableTable({ columns, children }: ResizableTableProps) {
  const [widths, setWidths] = useState(() => columns.map((c) => c.defaultWidth));
  const dragging = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = { index, startX: e.clientX, startWidth: widths[index] };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - dragging.current.startX;
        const min = columns[dragging.current.index].minWidth ?? 40;
        const newWidth = Math.max(min, dragging.current.startWidth + delta);
        setWidths((prev) => {
          const next = [...prev];
          next[dragging.current!.index] = newWidth;
          return next;
        });
      };

      const onMouseUp = () => {
        dragging.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [widths, columns]
  );

  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className="w-full caption-bottom text-sm"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          {widths.map((w, i) => (
            <col key={columns[i].key} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  "relative h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground select-none",
                  col.className
                )}
              >
                {col.label}
                {i < columns.length - 1 && (
                  <span
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-teal-500/40 active:bg-teal-500/60 z-20"
                    onMouseDown={(e) => onMouseDown(i, e)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {children}
        </tbody>
      </table>
    </div>
  );
}
