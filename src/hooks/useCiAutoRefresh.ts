import { useEffect } from "react";
import { usePrsStore } from "../state/prsStore";
import { useUiStore } from "../state/uiStore";

/** Seconds between CI auto-refreshes while the open PR's CI is pending. */
export const CI_POLL_SECONDS = 15;

/**
 * While the open PR's CI status is `pending`, count down second-by-second and
 * re-fetch the PR every {@link CI_POLL_SECONDS} seconds so the badge updates
 * without a manual refresh. The remaining seconds are mirrored into
 * {@link useUiStore} (`ciCountdown`) so the CI badge can render a live
 * countdown. The timer stops as soon as CI resolves (passing/failing), the PR
 * closes, or the consumer unmounts. A tick that lands on zero is skipped if a
 * refresh is already in flight to avoid overlapping requests.
 *
 * Mounted once at the app root so it covers every view that shows CI
 * (PR meta strip, merge panel).
 */
export function useCiAutoRefresh() {
  const ciStatus = usePrsStore(s => s.currentPr?.summary.ci_status);
  const refreshCurrentPr = usePrsStore(s => s.refreshCurrentPr);
  const setCiCountdown = useUiStore(s => s.setCiCountdown);

  useEffect(() => {
    if (ciStatus !== "pending") {
      setCiCountdown(null);
      return;
    }
    let remaining = CI_POLL_SECONDS;
    setCiCountdown(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = CI_POLL_SECONDS;
        if (!usePrsStore.getState().refreshingPr) void refreshCurrentPr();
      }
      setCiCountdown(remaining);
    }, 1000);
    return () => {
      clearInterval(id);
      setCiCountdown(null);
    };
  }, [ciStatus, refreshCurrentPr, setCiCountdown]);
}
