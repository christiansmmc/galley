import { invoke } from "@tauri-apps/api/core";
import type {
  CommentDraft, FileDiff, PathFilter, PrDetail, PrSummary, RepoConfig,
  ReviewEvent, ReviewResult, ReviewThread, Settings,
} from "./types";

export const api = {
  listPrs: (filter: "mine" | "review_requested") =>
    invoke<PrSummary[]>("list_prs", { filter }),
  getPr: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("get_pr", { owner, repo, number }),
  getPrDiff: (owner: string, repo: string, number: number) =>
    invoke<FileDiff[]>("get_pr_diff", { owner, repo, number }),
  getPrThreads: (owner: string, repo: string, number: number) =>
    invoke<ReviewThread[]>("get_pr_threads", { owner, repo, number }),
  refreshPr: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("refresh_pr", { owner, repo, number }),

  draftComment: (prId: number, path: string, line: number, side: string, body: string) =>
    invoke<CommentDraft>("draft_comment", { prId, path, line, side, body }),
  listDrafts: (prId: number) =>
    invoke<CommentDraft[]>("list_drafts", { prId }),
  updateDraft: (draftId: number, body: string) =>
    invoke<CommentDraft>("update_draft", { draftId, body }),
  deleteDraft: (draftId: number) =>
    invoke<void>("delete_draft", { draftId }),

  submitReview: (owner: string, repo: string, number: number, event: ReviewEvent, body: string | null, prId: number, draftIds: number[]) =>
    invoke<ReviewResult>("submit_review", { owner, repo, number, event, body, prId, draftIds }),

  listRepos: () => invoke<RepoConfig[]>("list_repos"),
  addRepo: (owner: string, name: string) => invoke<RepoConfig>("add_repo", { owner, name }),
  removeRepo: (owner: string, name: string) => invoke<void>("remove_repo", { owner, name }),

  getPathFilters: (repo: string) => invoke<PathFilter[]>("get_path_filters", { repo }),
  setPathFilters: (repo: string, filters: PathFilter[]) => invoke<void>("set_path_filters", { repo, filters }),

  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) => invoke<void>("set_settings", { settings }),

  setPat: (token: string) => invoke<void>("set_pat", { token }),
  clearPat: () => invoke<void>("clear_pat"),
  hasPat: () => invoke<boolean>("has_pat"),
};
