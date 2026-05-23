import type { editor } from "monaco-editor";
import { paper, linen, type Palette } from "./palette";

function build(p: Palette, base: "vs" | "vs-dark"): editor.IStandaloneThemeData {
  return {
    base,
    inherit: true,
    rules: [
      { token: "", foreground: p.text.slice(1), background: p.base.slice(1) },
      { token: "comment", foreground: p.overlay.slice(1), fontStyle: "italic" },
      { token: "string", foreground: p.success.slice(1) },
      { token: "number", foreground: p.warn.slice(1) },
      { token: "keyword", foreground: p.info.slice(1) },
      { token: "type", foreground: p.warn.slice(1) },
      { token: "function", foreground: p.accent.slice(1) },
    ],
    colors: {
      "editor.background": p.base,
      "editor.foreground": p.text,
      "editorLineNumber.foreground": p.overlay,
      "editorLineNumber.activeForeground": p.text,
      "editorCursor.foreground": p.accent,
      "editor.selectionBackground": p.surface2,
      "editor.lineHighlightBackground": p.mantle,
      "diffEditor.insertedTextBackground": p.success + "26",
      "diffEditor.removedTextBackground": p.danger + "26",
    },
  };
}

export const monacoPaper = build(paper, "vs");
export const monacoLinen = build(linen, "vs-dark");
