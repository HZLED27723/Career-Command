"use client";

import { useCallback, useRef, useState } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Initial width of the left pane as a percentage (20–80). */
  initial?: number;
}

const MIN_PCT = 20;
const MAX_PCT = 80;

/**
 * Horizontal resizable split. Drag the divider with pointer events; keyboard
 * arrows work when the divider is focused. Stacks vertically below md.
 */
export function SplitPane({ left, right, initial = 50 }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(initial);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = ((e.clientX - rect.left) / rect.width) * 100;
      setPct(Math.min(MAX_PCT, Math.max(MIN_PCT, next)));
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setPct((p) => Math.max(MIN_PCT, p - 2));
    } else if (e.key === "ArrowRight") {
      setPct((p) => Math.min(MAX_PCT, p + 2));
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 max-md:flex-col"
      style={dragging ? { cursor: "col-resize", userSelect: "none" } : undefined}
    >
      <div
        className="min-h-0 min-w-0 max-md:!w-full max-md:flex-1"
        style={{ width: `${pct}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className={`group flex w-1.5 shrink-0 cursor-col-resize items-center justify-center outline-none transition-colors focus-visible:bg-accent-dim max-md:hidden ${
          dragging ? "bg-accent-dim" : "bg-edge hover:bg-edge-strong"
        }`}
      >
        <span
          className={`h-8 w-0.5 rounded-full transition-colors ${
            dragging ? "bg-accent" : "bg-ink-faint group-hover:bg-ink-muted"
          }`}
        />
      </div>

      <div className="min-h-0 min-w-0 flex-1 max-md:border-t max-md:border-edge">
        {right}
      </div>
    </div>
  );
}
