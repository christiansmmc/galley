import { useEffect } from "react";
import { api } from "../ipc/client";
import { usePrsStore } from "../state/prsStore";
import { useUiStore } from "../state/uiStore";

/** Seconds between CI auto-refreshes while the open PR's CI is pending. */
export const CI_POLL_SECONDS = 15;

/**
 * While the open PR's CI status is `pending`, count down second-by-second and
 * re-check CI every {@link CI_POLL_SECONDS} seconds so the badge updates
 * without a manual refresh. The remaining seconds are mirrored into
 * {@link useUiStore} (`ciCountdown`) so the CI badge can render a live
 * countdown. The timer stops as soon as CI resolves (passing/failing), the PR
 * closes, or the consumer unmounts.
 *
 * The poll deliberately calls the cheap `get_ci_status` command and patches
 * only `currentPr.summary.ci_status`. It used to call `refreshCurrentPr()`,
 * which re-fetched the PR detail *plus* the whole diff, every review thread
 * and the viewed-file list — several network round-trips every 15s to move one
 * status dot. A tick that lands on zero is skipped while a poll (or a full
 * refresh) is already in flight, to avoid overlapping requests.
 *
 * Mounted once at the app root so it covers every view that shows CI
 * (PR meta strip, merge panel).
 */
export function useCiAutoRefresh() {
  const ciStatus = usePrsStore(s => s.currentPr?.summary.ci_status);
  const owner = usePrsStore(s => s.currentPr?.summary.owner);
  const repo = usePrsStore(s => s.currentPr?.summary.repo);
  const headSha = usePrsStore(s => s.currentPr?.head_sha);
  const setCiStatus = usePrsStore(s => s.setCiStatus);
  const setCiCountdown = useUiStore(s => s.setCiCountdown);

  useEffect(() => {
    if (ciStatus !== "pending" || !owner || !repo || !headSha) {
      setCiCountdown(null);
      return;
    }
    let remaining = CI_POLL_SECONDS;
    let polling = false;
    setCiCountdown(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = CI_POLL_SECONDS;
        if (!polling && !usePrsStore.getState().refreshingPr) {
          polling = true;
          api.getCiStatus(owner, repo, headSha)
            // setCiStatus re-checks head_sha, so a response that lands after
            // the user switched PRs is dropped rather than applied to the
            // wrong one — no extra guard needed here.
            .then(status => setCiStatus(headSha, status))
            // A transient poll failure is not worth a toast: the next tick
            // retries, and the manual refresh button still surfaces errors.
            .catch(() => {})
            .finally(() => { polling = false; });
        }
      }
      setCiCountdown(remaining);
    }, 1000);
    return () => {
      clearInterval(id);
      setCiCountdown(null);
    };
  }, [ciStatus, owner, repo, headSha, setCiStatus, setCiCountdown]);
}
