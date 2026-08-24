/**
 * Monaco's global environment: worker factory + global API publication.
 *
 * This module MUST be evaluated before anything from `monaco-editor` itself.
 * Monaco reads `globalThis.MonacoEnvironment` while its own module body runs —
 * that is how `globalAPI` decides whether to publish `window.monaco` — and ES
 * module evaluation order is fixed at import time, so the assignment cannot
 * live in the same module that statically imports the editor API. `setup.ts`
 * imports this file first and only then the API; keeping the two apart is the
 * whole reason this file exists.
 *
 * The worker factory is not optional for this app: monaco computes the line
 * diff in the editor worker, so without a `getWorker` the diff editor renders
 * two panes and no diff at all.
 */
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

self.MonacoEnvironment = {
  // Publish the API as `window.monaco`. DiffPanel reads it there (to define
  // themes, build Ranges, enumerate models) instead of importing monaco
  // directly, which keeps monaco out of the module graph vitest loads under
  // jsdom.
  globalAPI: true,
  getWorker(_workerId: string, label: string): Worker {
    // `json` is the only language *service* we register (see setup.ts); every
    // other label — `editorWorkerService` included — is served by the base
    // editor worker. JSON's worker-backed features are switched off in
    // setup.ts, so in practice this branch never fires; it is kept so a future
    // caller gets the right worker instead of a silently wrong one.
    if (label === "json") return new JsonWorker();
    return new EditorWorker();
  },
};
