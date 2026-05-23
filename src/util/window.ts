/**
 * Thin wrapper around @tauri-apps/api/window so the rest of the app can call
 * window controls without crashing in non-Tauri contexts (vitest/jsdom, ui
 * gallery preview). Lazy-loads the module; falls back to no-ops when the
 * Tauri IPC bridge isn't installed.
 */

type WindowLike = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  startDragging: () => Promise<void>;
  onResized: (cb: () => void) => Promise<() => void>;
};

let cachedPromise: Promise<WindowLike | null> | null = null;

async function getWindow(): Promise<WindowLike | null> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    try {
      const mod = await import("@tauri-apps/api/window");
      return mod.getCurrentWindow() as unknown as WindowLike;
    } catch {
      return null;
    }
  })();
  return cachedPromise;
}

export async function minimizeWindow(): Promise<void> {
  const w = await getWindow();
  await w?.minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  const w = await getWindow();
  await w?.toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  const w = await getWindow();
  await w?.close();
}

export async function isWindowMaximized(): Promise<boolean> {
  const w = await getWindow();
  if (!w) return false;
  try { return await w.isMaximized(); } catch { return false; }
}

export async function subscribeWindowResized(cb: () => void): Promise<() => void> {
  const w = await getWindow();
  if (!w) return () => {};
  try { return await w.onResized(cb); } catch { return () => {}; }
}

/** Programmatic window drag — used by elements that can't carry the native data attribute. */
export async function startWindowDrag(): Promise<void> {
  const w = await getWindow();
  try { await w?.startDragging(); } catch { /* noop outside Tauri */ }
}
