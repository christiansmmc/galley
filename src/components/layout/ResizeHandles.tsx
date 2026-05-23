import { useEffect, useState } from "react";
import { isWindowMaximized, startWindowResize, subscribeWindowResized, type ResizeDirection } from "../../util/window";

const EDGE_THICKNESS = 4;
const CORNER_SIZE = 10;

interface Spec {
  dir: ResizeDirection;
  cursor: string;
  style: React.CSSProperties;
}

const SPECS: Spec[] = [
  // Edges
  { dir: "North", cursor: "ns-resize", style: { top: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_THICKNESS } },
  { dir: "South", cursor: "ns-resize", style: { bottom: 0, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_THICKNESS } },
  { dir: "West", cursor: "ew-resize", style: { left: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_THICKNESS } },
  { dir: "East", cursor: "ew-resize", style: { right: 0, top: CORNER_SIZE, bottom: CORNER_SIZE, width: EDGE_THICKNESS } },
  // Corners
  { dir: "NorthWest", cursor: "nwse-resize", style: { top: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE } },
  { dir: "NorthEast", cursor: "nesw-resize", style: { top: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE } },
  { dir: "SouthWest", cursor: "nesw-resize", style: { bottom: 0, left: 0, width: CORNER_SIZE, height: CORNER_SIZE } },
  { dir: "SouthEast", cursor: "nwse-resize", style: { bottom: 0, right: 0, width: CORNER_SIZE, height: CORNER_SIZE } },
];

/**
 * Invisible 4px-edge / 10px-corner overlay strips that begin a window
 * resize via Tauri when the user presses on them. Hidden when the window
 * is maximized (no resize makes sense in that state).
 */
export function ResizeHandles() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    isWindowMaximized().then(setMaximized);
    subscribeWindowResized(() => { isWindowMaximized().then(setMaximized); })
      .then(u => { unlisten = u; });
    return () => { unlisten?.(); };
  }, []);

  if (maximized) return null;

  return (
    <>
      {SPECS.map(s => (
        <div
          key={s.dir}
          onMouseDown={e => {
            // Only react to primary button so right-click context menus still work.
            if (e.button !== 0) return;
            e.preventDefault();
            startWindowResize(s.dir);
          }}
          style={{
            position: "fixed",
            cursor: s.cursor,
            zIndex: 9999,
            ...s.style,
          }}
        />
      ))}
    </>
  );
}
