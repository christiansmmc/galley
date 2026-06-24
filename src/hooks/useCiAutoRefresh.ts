import { useEffect } from "react";
import { usePrsStore } from "../state/prsStore";

/** How often to re-fetch the open PR while its CI is still pending. */
export const CI_POLL_MS = 15000;

/**
 * While the open PR's CI status is `pending`, re-fetch the PR every
 * {@link CI_POLL_MS} ms so the badge reflects the latest status without a
 * manual refresh. The interval stops as soon as CI resolves
 * (passing/failing), the PR closes, or the consumer unmounts. A tick is
 * skipped if a refresh is already in flight to avoid overlapping requests.
 *
 * Mounted once at the app root so it covers every view that shows CI
 * (PR meta strip, merge panel).
 */
export function useCiAutoRefresh() {
  const ciStatus = usePrsStore(s => s.currentPr?.summary.ci_status);
  const refreshCurrentPr = usePrsStore(s => s.refreshCurrentPr);

  useEffect(() => {
    if (ciStatus !== "pending") return;
    const id = setInterval(() => {
      if (usePrsStore.getState().refreshingPr) return;
      void refreshCurrentPr();
    }, CI_POLL_MS);
    return () => clearInterval(id);
  }, [ciStatus, refreshCurrentPr]);
}
