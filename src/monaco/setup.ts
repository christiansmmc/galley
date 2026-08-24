/**
 * Bundles Monaco into the app instead of fetching it from a CDN at runtime.
 *
 * `@monaco-editor/react` delegates loading to `@monaco-editor/loader`, whose
 * default is an AMD fetch of
 * `https://cdn.jsdelivr.net/npm/monaco-editor@<version>/min/vs`. For a desktop
 * app that is the wrong default twice over: the first diff of every cold
 * session waits on the network, and offline the diff never renders at all.
 * `loader.config({ monaco })` short-circuits it — the loader resolves with the
 * instance handed to it and never touches the network.
 *
 * Import this from `src/main.tsx` ONLY. It is a side-effect module and it pulls
 * in Vite `?worker` imports (via ./environment), which jsdom cannot
 * instantiate — importing it from a component would drag it into the vitest
 * module graph.
 *
 * ── Why `editor.api` and not the `monaco-editor` barrel ──────────────────────
 * The barrel resolves to `esm/vs/editor/editor.main.js`, which additionally
 * registers the TypeScript, CSS, HTML and JSON language *services*:
 * IntelliSense, completions and diagnostics, each with its own web worker
 * (ts.worker alone is several MB). This app renders a read-only diff. It needs
 * tokenization and nothing else — and the services would actively hurt here,
 * because a diff model holds a truncated patch hunk, which a real language
 * service reports as a wall of syntax errors. So: the bare API, the editor
 * contributions, and one Monarch grammar per language DiffPanel can produce.
 */
import "./environment";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { loader } from "@monaco-editor/react";

// Editor contributions: find widget, folding, hover, context menu, selection
// and cursor commands, the diff editor itself. Every `*.contribution` import
// below already pulls this in transitively, but depending on it by accident is
// not the same as depending on it.
import "monaco-editor/esm/vs/editor/editor.all.js";

// One import per language id produced by DiffPanel's `languageFor()` map. These
// only *register* the language; the Monarch grammar itself sits behind a
// dynamic import that Vite code-splits, so the tokenizer chunk is loaded (from
// disk) the first time a file of that type is opened.
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution.js";
import "monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js";
import "monaco-editor/esm/vs/basic-languages/go/go.contribution.js";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution.js";
import "monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js";
import "monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js";
import "monaco-editor/esm/vs/basic-languages/php/php.contribution.js";
// Registers both `c` and `cpp` off the same grammar — covers .c/.h/.cpp/.hpp.
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution.js";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js";
import "monaco-editor/esm/vs/basic-languages/html/html.contribution.js";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution.js";
import "monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js";

// JSON is the one id in `languageFor()` with no Monarch grammar in
// `basic-languages` — monaco only ships it as a full language service. We take
// it for its tokenizer (which runs on the main thread) and turn validation off
// just below, so a JSON *patch hunk* is highlighted rather than reported as
// malformed.
//
// `toml` has no grammar at all in monaco 0.55; `languageFor()` still maps .toml
// to it, so those files fall back to plaintext — exactly as they did with the
// CDN build. Nothing regressed, but it is worth knowing.
import * as jsonContribution from "monaco-editor/esm/vs/language/json/monaco.contribution.js";

// `vs/language/json` ships no typings of its own (its .d.ts is a bare
// `export {}`), hence the structural cast to reach the defaults object.
const { jsonDefaults } = jsonContribution as unknown as {
  jsonDefaults: {
    setDiagnosticsOptions(options: {
      validate: boolean;
      schemaValidation: string;
      enableSchemaRequest: boolean;
    }): void;
  };
};
jsonDefaults.setDiagnosticsOptions({
  validate: false,
  schemaValidation: "ignore",
  // Never let a schema `$ref` in someone's package.json turn into an outbound
  // HTTP request from the diff viewer.
  enableSchemaRequest: false,
});

loader.config({ monaco });
