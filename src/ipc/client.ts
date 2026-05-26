import { invoke } from "@tauri-apps/api/core";
import type {
  CommentDraft, FileDiff, PathFilter, PrDetail, PrSummary, RemoteRepo,
  RepoBrowseFilters, RepoConfig, RepoPrCount, ReviewEvent, ReviewResult, ReviewThread, Settings,
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
  getFileContent: (owner: string, repo: string, path: string, ref: string) =>
    invoke<string | null>("get_file_content", { owner, repo, path, gitRef: ref }),
  refreshPr: (owner: string, repo: string, number: number) =>
    invoke<PrDetail>("refresh_pr", { owner, repo, number }),

  draftComment: (
    prId: number,
    path: string,
    line: number,
    side: string,
    body: string,
    startLine?: number | null,
    startSide?: string | null,
  ) =>
    invoke<CommentDraft>("draft_comment", {
      prId,
      path,
      line,
      side,
      body,
      startLine: startLine ?? null,
      startSide: startSide ?? null,
    }),
  listDrafts: (prId: number) =>
    invoke<CommentDraft[]>("list_drafts", { prId }),
  updateDraft: (draftId: number, body: string) =>
    invoke<CommentDraft>("update_draft", { draftId, body }),
  deleteDraft: (draftId: number) =>
    invoke<void>("delete_draft", { draftId }),

  submitReview: (owner: string, repo: string, number: number, event: ReviewEvent, body: string | null, prId: number, draftIds: number[]) =>
    invoke<ReviewResult>("submit_review", { owner, repo, number, event, body, prId, draftIds }),
  replyToThread: (owner: string, repo: string, number: number, inReplyTo: number, body: string) =>
    invoke<void>("reply_to_thread", { owner, repo, number, inReplyTo, body }),
  resolveThread: (owner: string, repo: string, number: number, threadNodeId: string) =>
    invoke<void>("resolve_thread", { owner, repo, number, threadNodeId }),

  listViewedFiles: (prId: number) =>
    invoke<string[]>("list_viewed_files", { prId }),
  markViewed: (prId: number, path: string, viewed: boolean) =>
    invoke<void>("mark_viewed", { prId, path, viewed }),

  listRepos: () => invoke<RepoConfig[]>("list_repos"),
  addRepo: (owner: string, name: string) => invoke<RepoConfig>("add_repo", { owner, name }),
  removeRepo: (owner: string, name: string) => invoke<void>("remove_repo", { owner, name }),
  setRepos: (repos: RepoConfig[]) => invoke<void>("set_repos", { repos }),
  validateRepo: (input: string) => invoke<RepoConfig>("validate_repo", { input }),
  listMyRepos: (page: number, filters: RepoBrowseFilters) =>
    invoke<RemoteRepo[]>("list_my_repos", { page, filters }),
  repoPrCounts: (repos: RepoConfig[]) =>
    invoke<RepoPrCount[]>("repo_pr_counts", { repos }),

  getPathFilters: (repo: string) => invoke<PathFilter[]>("get_path_filters", { repo }),
  setPathFilters: (repo: string, filters: PathFilter[]) => invoke<void>("set_path_filters", { repo, filters }),

  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) => invoke<void>("set_settings", { settings }),

  setPat: (token: string) => invoke<void>("set_pat", { token }),
  clearPat: () => invoke<void>("clear_pat"),
  hasPat: () => invoke<boolean>("has_pat"),
  currentUser: () => invoke<string | null>("current_user"),

  openExternalUrl: (url: string) => invoke<void>("open_external_url", { url }),
};
