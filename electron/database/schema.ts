/**
 * Versioned schema migrations.
 *
 * The applied version lives in SQLite's built-in `PRAGMA user_version`.
 * Rules:
 *   - Never edit a migration that has shipped; add a new one.
 *   - Versions are consecutive integers starting at 1.
 *   - Each migration runs inside a transaction together with its version bump.
 *
 * Planned future tables (potential_matches, bookmarks, notes) are described in
 * docs/database.md and will arrive as migrations 2, 3 and 4 when the features
 * that use them are built.
 */
export interface Migration {
    version: number;
    name: string;
    sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
    {
        version: 1,
        name: "create_investigations",
        sql: `
            CREATE TABLE investigations (
                id          TEXT PRIMARY KEY NOT NULL,
                name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
                username    TEXT NOT NULL CHECK (length(trim(username)) BETWEEN 1 AND 100),
                platform    TEXT NOT NULL CHECK (length(platform) BETWEEN 1 AND 32),
                status      TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed', 'paused')),
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            -- "Recent investigations" and the default list order.
            CREATE INDEX idx_investigations_updated_at ON investigations (updated_at DESC);
            -- Dashboard counts and status filtering.
            CREATE INDEX idx_investigations_status ON investigations (status);
            -- Finding earlier work on the same handle.
            CREATE INDEX idx_investigations_username ON investigations (username COLLATE NOCASE);
        `,
    },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
