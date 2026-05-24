import type { CSSProperties } from "react";

/**
 * Shared shell style for widgets rendered inside Monaco view zones
 * (InlineCommentEditor, InlineThreadWidget, InlineDraftWidget).
 *
 * Why sticky + capped width: view zones live inside Monaco's
 * horizontally-scrolling layer, so when a code line is wider than the
 * editor viewport the widget would inherit that scroll width and the
 * right-aligned actions end up off-screen. Sticky-left + width tied to
 * --diff-viewport-w (set by DiffPanel via ResizeObserver on the modified
 * editor) keeps the widget glued to the visible editor area regardless
 * of horizontal scroll.
 *
 * Etapa 3 · S6: 3-state widget. Border is hairline on top/right/bottom
 * only; the left edge is reserved for the 2px state rule each widget
 * applies (solid accent open, dashed warn draft, solid overlay resolved).
 * Max-width is mode-aware via the `.prr-inline-widget` class in
 * globals.css (540px side-by-side, 680px inline).
 */
const RIGHT_GUTTER = "var(--space-9)";
const LEFT_GUTTER = "var(--space-9)";

export const inlineWidgetShell: CSSProperties = {
  position: "sticky",
  left: LEFT_GUTTER,
  width: `calc(var(--diff-viewport-w, 100%) - ${LEFT_GUTTER} - ${RIGHT_GUTTER})`,
  margin: "var(--space-2) 0",
  padding: "10px 16px 12px",
  borderTop: "1px solid var(--c-line-soft)",
  borderRight: "1px solid var(--c-line-soft)",
  borderBottom: "1px solid var(--c-line-soft)",
  background: "var(--c-surface1)",
  color: "var(--c-text)",
  fontFamily: "var(--font-ui)",
  boxSizing: "border-box",
  zIndex: "var(--z-base)" as unknown as number,
  pointerEvents: "auto",
};
