CREATE TABLE IF NOT EXISTS prs (
    id               INTEGER PRIMARY KEY,
    owner            TEXT NOT NULL,
    repo             TEXT NOT NULL,
    number           INTEGER NOT NULL,
    title            TEXT,
    state            TEXT,
    author           TEXT,
    is_mine          INTEGER,
    review_requested INTEGER,
    head_sha         TEXT,
    base_sha         TEXT,
    updated_at       TEXT,
    payload_json     TEXT,
    fetched_at       TEXT
);

CREATE TABLE IF NOT EXISTS files (
    pr_id      INTEGER,
    path       TEXT,
    status     TEXT,
    additions  INTEGER,
    deletions  INTEGER,
    patch      TEXT,
    PRIMARY KEY (pr_id, path)
);

CREATE TABLE IF NOT EXISTS threads (
    id           INTEGER PRIMARY KEY,
    pr_id        INTEGER,
    path         TEXT,
    line         INTEGER,
    side         TEXT,
    resolved     INTEGER,
    payload_json TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id       INTEGER NOT NULL,
    path        TEXT NOT NULL,
    line        INTEGER NOT NULL,
    side        TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    start_line  INTEGER,
    start_side  TEXT
);

CREATE TABLE IF NOT EXISTS pr_lists (
    key          TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS viewed_files (
    pr_id INTEGER NOT NULL,
    path  TEXT NOT NULL,
    PRIMARY KEY (pr_id, path)
);

CREATE TABLE IF NOT EXISTS blobs (
    sha     TEXT NOT NULL,
    path    TEXT NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (sha, path)
);

CREATE INDEX IF NOT EXISTS idx_prs_state    ON prs(state, is_mine, review_requested);
CREATE INDEX IF NOT EXISTS idx_threads_pr   ON threads(pr_id);
CREATE INDEX IF NOT EXISTS idx_drafts_pr    ON drafts(pr_id);
CREATE INDEX IF NOT EXISTS idx_viewed_pr    ON viewed_files(pr_id);
