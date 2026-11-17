import { DatabaseSync } from "node:sqlite";
import { DatabaseError } from "../errors";
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from "./schema";

export type Database = DatabaseSync;

/**
 * Opens (creating if needed) the SQLite database at `filePath` and brings it
 * up to the latest schema. Pass ":memory:" for tests.
 *
 * Uses Node's built-in `node:sqlite`, which avoids native-module rebuilds for
 * Electron. Everything SQLite-specific lives in this folder, so swapping in
 * better-sqlite3 later would only touch these files.
 */
export function openDatabase(filePath: string): Database {
    let db: DatabaseSync;
    try {
        db = new DatabaseSync(filePath);
        db.exec("PRAGMA journal_mode = WAL");
        db.exec("PRAGMA foreign_keys = ON");
        db.exec("PRAGMA busy_timeout = 5000");
        migrate(db);
        return db;
    } catch (error) {
        throw error instanceof DatabaseError ? error : new DatabaseError(error);
    }
}

function migrate(db: DatabaseSync): void {
    const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
    const current = row.user_version;

    if (current > LATEST_SCHEMA_VERSION) {
        // Opened by a newer Tracepoint. Refusing is safer than guessing.
        throw new Error(
            `Database schema v${current} is newer than this version of Tracepoint supports (v${LATEST_SCHEMA_VERSION}).`,
        );
    }

    for (const migration of MIGRATIONS) {
        if (migration.version <= current) continue;
        db.exec("BEGIN");
        try {
            db.exec(migration.sql);
            db.exec(`PRAGMA user_version = ${migration.version}`); // integer literal; PRAGMA can't be parameterised
            db.exec("COMMIT");
        } catch (error) {
            db.exec("ROLLBACK");
            throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${String(error)}`);
        }
    }
}

export { InvestigationRepository } from "./investigations.repository";
