export type ThemeChoice = "light" | "dark" | "system";

export interface UiPrefs {
  theme: ThemeChoice;
  sidebar_collapsed: boolean;
  filetree_collapsed: boolean;
  sidebar_width: number;
  filetree_width: number;
}

export interface RepoConfig { owner: string; name: string; }

export interface PathFilter {
  repo: string;
  pattern: string;
  label: string;
  default_hidden: boolean;
}

export interface Settings {
  ui: UiPrefs;
  repos: RepoConfig[];
  path_filters: PathFilter[];
}

export interface PrSummary {
  id: number;
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: string;
  updated_at: string;
  html_url: string;
  is_mine: boolean;
  review_requested: boolean;
}

export interface PrDetail {
  summary: PrSummary;
  body: string | null;
  head_sha: string;
  base_sha: string;
  draft: boolean;
  mergeable: boolean | null;
}

export interface FileDiff {
  path: string;
  previous_path: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface ThreadComment {
  id: number;
  author: string;
  body: string;
  created_at: string;
  in_reply_to_id: number | null;
}

export interface ReviewThread {
  id: number;
  path: string;
  line: number | null;
  side: string;
  comments: ThreadComment[];
}

export interface CommentDraft {
  id: number;
  pr_id: number;
  path: string;
  line: number;
  side: string;
  body: string;
  created_at: string;
  start_line: number | null;
  start_side: string | null;
}

export type ReviewEvent = "APPROVE" | "COMMENT" | "REQUEST_CHANGES";

export interface ReviewResult {
  review_id: number;
  state: string;
  html_url: string;
}

export type AppError =
  | { kind: "Auth"; details: string }
  | { kind: "RateLimited"; details: { reset_at: string } }
  | { kind: "Network"; details: string }
  | { kind: "NotFound"; details: string }
  | { kind: "Conflict"; details: string }
  | { kind: "SubmitFailed"; details: string }
  | { kind: "Config"; details: string }
  | { kind: "Cache"; details: string }
  | { kind: "Internal"; details: string };
