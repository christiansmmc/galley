import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { editor } from "monaco-editor";
import type { ReactNode } from "react";

export type Side = "RIGHT" | "LEFT";

export interface ViewZoneSpec {
  /** Stable identifier — survives re-renders so we can diff and avoid flicker. */
  key: string;
  side: Side;
  /** Line in the document (1-based). */
  afterLineNumber: number;
  /** Height estimate in lines; Monaco accepts heightInPx too but lines is more stable. */
  heightInLines: number;
  /** React subtree mounted into the zone's domNode via createRoot. */
  render: () => ReactNode;
}

interface MountedZone {
  zoneId: string;
  root: Root;
  domNode: HTMLDivElement;
  spec: ViewZoneSpec;
}

/**
 * Manages a set of Monaco view zones tied to a diff editor (split view).
 * Specs are diffed by `key`; on every render we add new keys, remove
 * dropped ones, and re-render existing ones in place (no flicker).
 *
 * Each zone's React subtree is mounted via createRoot and unmounted with
 * a microtask delay on remove — Monaco synchronously detaches the node,
 * but React 18+ complains if we unmount during the commit phase, so we
 * defer.
 */
export function useDiffViewZones(
  diffEditor: editor.IStandaloneDiffEditor | null,
  specs: ViewZoneSpec[],
) {
  const zonesRef = useRef<Map<string, MountedZone>>(new Map());

  useEffect(() => {
    if (!diffEditor) return;

    const modified = diffEditor.getModifiedEditor();
    const original = diffEditor.getOriginalEditor();

    // Split incoming specs by side so we can change-set each editor in a
    // single accessor pass (Monaco requires one accessor per editor).
    const incomingByKey = new Map<string, ViewZoneSpec>();
    specs.forEach((s) => incomingByKey.set(s.key, s));

    // Determine adds/removes/updates.
    const existing = zonesRef.current;
    const toRemove: MountedZone[] = [];
    const toAdd: ViewZoneSpec[] = [];

    for (const [key, mounted] of existing.entries()) {
      const next = incomingByKey.get(key);
      if (!next) {
        toRemove.push(mounted);
      } else if (
        next.afterLineNumber !== mounted.spec.afterLineNumber ||
        next.side !== mounted.spec.side ||
        next.heightInLines !== mounted.spec.heightInLines
      ) {
        // Shape changed; remove and re-add. Cheaper than reasoning about
        // Monaco's "layoutViewZone" reflow paths.
        toRemove.push(mounted);
        toAdd.push(next);
      } else {
        // Same shape — re-render React subtree in place.
        mounted.spec = next;
        mounted.root.render(next.render());
      }
    }
    for (const [key, spec] of incomingByKey.entries()) {
      if (!existing.has(key)) toAdd.push(spec);
    }

    if (toRemove.length === 0 && toAdd.length === 0) return;

    // Removal pass per editor.
    const removeFromEditor = (ed: editor.IStandaloneCodeEditor, removals: MountedZone[]) => {
      if (removals.length === 0) return;
      try {
        ed.changeViewZones((accessor) => {
          for (const m of removals) {
            accessor.removeZone(m.zoneId);
          }
        });
      } catch {
        // Editor disposed mid-update — view zones are already gone with it.
        return;
      }
      // Deferred unmount to escape React's commit phase.
      queueMicrotask(() => {
        for (const m of removals) {
          try { m.root.unmount(); } catch { /* already gone */ }
        }
      });
    };
    removeFromEditor(modified, toRemove.filter(m => m.spec.side === "RIGHT"));
    removeFromEditor(original, toRemove.filter(m => m.spec.side === "LEFT"));
    for (const m of toRemove) existing.delete(m.spec.key);

    // Add pass per editor.
    const addToEditor = (ed: editor.IStandaloneCodeEditor, adds: ViewZoneSpec[]) => {
      if (adds.length === 0) return;
      const newlyMounted: Array<{ spec: ViewZoneSpec; domNode: HTMLDivElement; zoneId: string }> = [];
      try {
        ed.changeViewZones((accessor) => {
          for (const spec of adds) {
            const domNode = document.createElement("div");
            domNode.className = "prr-view-zone";
            // Let Monaco own positioning; we only style the inner content.
            domNode.style.background = "transparent";
            const zoneId = accessor.addZone({
              afterLineNumber: spec.afterLineNumber,
              heightInLines: spec.heightInLines,
              domNode,
            });
            newlyMounted.push({ spec, domNode, zoneId });
          }
        });
      } catch {
        // Editor disposed mid-update — drop the additions and bail.
        return;
      }
      for (const { spec, domNode, zoneId } of newlyMounted) {
        const root = createRoot(domNode);
        root.render(spec.render());
        existing.set(spec.key, { zoneId, root, domNode, spec });
      }
    };
    addToEditor(modified, toAdd.filter(s => s.side === "RIGHT"));
    addToEditor(original, toAdd.filter(s => s.side === "LEFT"));
  }, [diffEditor, specs]);

  // Cleanup on unmount or when the editor instance changes (PR/file switch).
  useEffect(() => {
    return () => {
      const mounted = zonesRef.current;
      if (diffEditor) {
        try {
          diffEditor.getModifiedEditor().changeViewZones((acc) => {
            for (const m of mounted.values()) if (m.spec.side === "RIGHT") acc.removeZone(m.zoneId);
          });
          diffEditor.getOriginalEditor().changeViewZones((acc) => {
            for (const m of mounted.values()) if (m.spec.side === "LEFT") acc.removeZone(m.zoneId);
          });
        } catch { /* editor disposed already */ }
      }
      queueMicrotask(() => {
        for (const m of mounted.values()) {
          try { m.root.unmount(); } catch { /* ignore */ }
        }
        mounted.clear();
      });
    };
  }, [diffEditor]);
}
