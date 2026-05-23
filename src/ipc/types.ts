export type ThemeChoice = "light" | "dark" | "system";

export type DiffRenderMode = "side-by-side" | "inline" | "auto";

export type Density = "compact" | "comfortable" | "spacious";

export interface DiffFont {
  size: number;
  family: string;
}

export interface UiPrefs {
  theme: ThemeChoice;
  sidebar_collapsed: boolean;
  filetree_collapsed: boolean;
  sidebar_width: number;
  filetree_width: number;
  diff_render_mode: DiffRenderMode;
  compact_paths: boolean;
  density: Density;
  diff_font: DiffFont;
  palette_sources: PaletteSources;
}

export interface PaletteSources {
  prs: boolean;
  files: boolean;
  repos: boolean;
  commands: boolean;
}

export interface RemoteRepo {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  private: boolean;
  owner_type: "user" | "organization";
  updated_at: string;
  stargazers_count: number;
}

export interface RepoBrowseFilters {
  include_orgs: boolean;
  include_forks: boolean;
  include_archived: boolean;
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

export type CiStatus = "passing" | "pending" | "failing" | "none";

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
  changed_files: number;
  ci_status: CiStatus;
}

export interface PrDetail {
  summary: PrSummary;
  body: string | null;
  head_sha: string;
  base_sha: string;
  draft: boolean;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  reviewers_count: number;
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
  /** For range threads: file line where the range starts (inclusive). */
  start_line: number | null;
  /** For range threads: side of the range start (typically same as `side`). */
  start_side: string | null;
  /** GraphQL node id — required to resolve the thread. */
  node_id: string | null;
  resolved: boolean;
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
