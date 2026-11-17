# Database design

Investigations are stored in a local SQLite file, never on a server:

| OS | Location |
|---|---|
| Windows | `%APPDATA%\TRACEPOINT\tracepoint.db` |
| macOS | `~/Library/Application Support/TRACEPOINT/tracepoint.db` |

Only the Electron **main process** touches the database. The UI reaches it through
the typed `window.tracepoint` API (`shared/api.ts`), which returns
`{ ok: true, data } | { ok: false, error }` envelopes (`shared/result.ts`).

```
React UI ──window.tracepoint──▶ preload.ts ──IPC──▶ ipc/*.ipc.ts ──▶ InvestigationRepository ──▶ SQLite
 (src/)       (typed, narrow)   (sandboxed)        (validates sender)   (validates input)
```

## `investigations` (implemented — migration 1)

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4, generated in the main process |
| `name` | TEXT NOT NULL | 1–120 chars |
| `username` | TEXT NOT NULL | the handle being researched, 1–100 chars, no spaces, no leading `@` |
| `platform` | TEXT NOT NULL | origin platform id (`github`, `discord`, …). **Not** a CHECK constraint, so adding a platform never needs a migration; validated in `shared/platforms.ts` |
| `status` | TEXT NOT NULL DEFAULT `'active'` | `CHECK (status IN ('active','completed','paused'))` |
| `created_at` | TEXT NOT NULL | ISO-8601 UTC |
| `updated_at` | TEXT NOT NULL | ISO-8601 UTC, bumped on every update |

Indexes: `updated_at DESC` (list order / "recent"), `status` (dashboard counts),
`username COLLATE NOCASE` (finding earlier work on the same handle).

TypeScript: `Investigation`, `CreateInvestigationInput`, `UpdateInvestigationInput`,
`InvestigationStatus` in `shared/types/investigation.ts`.

## Migrations

`PRAGMA user_version` records the applied version. `electron/database/schema.ts`
holds an ordered list; each runs in a transaction with its version bump, so a
failed migration leaves the database untouched. Never edit a shipped migration —
add a new one. A database from a *newer* Tracepoint is refused rather than guessed at.

## Planned (not created yet)

Each future table points at `investigations(id)` with `ON DELETE CASCADE`, so deleting
an investigation removes everything under it. TypeScript shapes already exist in
`shared/types/investigation.ts` (`PotentialMatch`, `Bookmark`, `Note`). Each will be a
new migration when its feature is built.

```sql
-- migration 2: matches found by a search and saved to an investigation
CREATE TABLE potential_matches (
    id               TEXT PRIMARY KEY NOT NULL,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    platform         TEXT NOT NULL,
    profile_url      TEXT NOT NULL,
    username         TEXT NOT NULL,
    match_kind       TEXT NOT NULL CHECK (match_kind IN ('exact','similar')),
    confidence       REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    review_state     TEXT NOT NULL DEFAULT 'new' CHECK (review_state IN ('new','reviewed','dismissed')),
    profile_snapshot TEXT,                 -- JSON of public fields at discovery time
    discovered_at    TEXT NOT NULL,
    UNIQUE (investigation_id, profile_url)
);

-- migration 3
CREATE TABLE bookmarks (
    id               TEXT PRIMARY KEY NOT NULL,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    match_id         TEXT REFERENCES potential_matches(id) ON DELETE SET NULL,
    title            TEXT NOT NULL,
    url              TEXT NOT NULL,
    created_at       TEXT NOT NULL
);

-- migration 4
CREATE TABLE notes (
    id               TEXT PRIMARY KEY NOT NULL,
    investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    match_id         TEXT REFERENCES potential_matches(id) ON DELETE SET NULL,
    body             TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

-- later: search history (README "Maintain local search history")
-- search_runs(id, investigation_id, query_username, started_at, completed_at, summary_json)
```

`PRAGMA foreign_keys = ON` is set on every connection so cascades actually fire.

## Why `node:sqlite`

It ships inside Node/Electron, so there is no native module to rebuild per Electron
version or per OS, and nothing to unpack from the asar. Everything SQLite-specific is in
`electron/database/`; switching to `better-sqlite3` later would only touch those files.
It is marked experimental in Node 22–24, so pin Electron deliberately when upgrading.
